import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { easeCubicInOut, select, zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from 'd3'
import { avatarImageStyle, displayInitials, fullName, isDeceased, lifespan, sanitizeAvatarUrl, type Person, type PersonId, type PersonMap } from '../element'
import { familyComponent, layoutFamily, type FamilyLayout, type LayoutOptions } from '../scene'

export type CardMode = 'compact' | 'photo'
export type ViewMode = 'focus' | 'family' | 'all'

type FamilyGraphProps = {
  people: PersonMap
  mainId: PersonId | null
  panelOpen: boolean
  expandedIds: ReadonlySet<PersonId>
  removingIds?: ReadonlySet<PersonId>
  draggingId?: PersonId | null
  cardMode: CardMode
  viewMode: ViewMode
  fitSignal: number
  emptyState?: ReactNode
  onSelect: (id: PersonId) => void
  onExpand: (id: PersonId) => void
  onEdit: (id: PersonId) => void
  onBeginDrag?: (id: PersonId, x: number, y: number) => void
}

type Point = { x: number; y: number }

const MOVE_MS = 520
const MIN_ZOOM = 0.2
const MAX_ZOOM = 2.5
const MAX_FIT_SCALE = 1.1
const READABLE_SCALE = 0.75
const READABLE_SCALE_MOBILE = 0.78
const FAMILY_DEPTH = 3

function anchorLayout(next: FamilyLayout, previous: FamilyLayout, mainId: PersonId | null): FamilyLayout {
  const anchorId = (mainId && next.nodes.has(mainId) && previous.nodes.has(mainId) ? mainId : null)
    ?? [...next.nodes.keys()].find((id) => previous.nodes.has(id))
  if (!anchorId) return next
  const from = previous.nodes.get(anchorId)
  const to = next.nodes.get(anchorId)
  if (!from || !to) return next
  const dx = from.x - to.x
  const dy = from.y - to.y
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return next
  return {
    ...next,
    nodes: new Map([...next.nodes].map(([id, node]) => [id, { ...node, x: node.x + dx, y: node.y + dy }])),
    bounds: { minX: next.bounds.minX + dx, maxX: next.bounds.maxX + dx, minY: next.bounds.minY + dy, maxY: next.bounds.maxY + dy },
  }
}

const readableScale = () => (window.innerWidth <= 720 ? READABLE_SCALE_MOBILE : READABLE_SCALE)

const layoutOptions: Record<CardMode, LayoutOptions> = {
  compact: { cardWidth: 236, cardHeight: 72, spouseGap: 28, siblingGap: 28, groupGap: 64, rowGap: 76 },
  photo: { cardWidth: 164, cardHeight: 228, spouseGap: 24, siblingGap: 24, groupGap: 52, rowGap: 64 },
}

const mobileLayoutOptions: Record<CardMode, LayoutOptions> = {
  compact: { cardWidth: 172, cardHeight: 64, spouseGap: 18, siblingGap: 18, groupGap: 36, rowGap: 60 },
  photo: { cardWidth: 132, cardHeight: 192, spouseGap: 16, siblingGap: 16, groupGap: 32, rowGap: 52 },
}

const SMALL_QUERY = '(max-width: 720px)'

function useSmallScreen(): boolean {
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(SMALL_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia?.(SMALL_QUERY)
    if (!query) return
    const update = () => setSmall(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return small
}

function freeArea(viewport: HTMLElement) {
  const rect = viewport.getBoundingClientRect()
  const small = window.innerWidth <= 720
  const topBar = document.querySelector('.top-bar')?.getBoundingClientRect()
  const tray = document.querySelector('.people-tray')?.getBoundingClientRect()
  const panel = document.querySelector('.details-panel')?.getBoundingClientRect()
  const toolbar = document.querySelector('.view-controls')?.getBoundingClientRect()
  const top = Math.max(topBar ? topBar.bottom - rect.top + 8 : 0, toolbar ? toolbar.bottom - rect.top + 8 : 0)
  const left = !small && tray ? Math.max(0, tray.right - rect.left + 12) : 0
  const right = !small && panel ? Math.max(0, rect.right - panel.left + 12) : 0
  const inventory = document.querySelector('.people-inventory')?.getBoundingClientRect()
  const bottom = Math.max(small && panel ? rect.bottom - panel.top + 8 : 0, small && inventory ? rect.bottom - inventory.top + 8 : 0, 0)
  return { width: rect.width, height: rect.height, left, right, top, bottom }
}

function transformFor(viewport: HTMLElement, box: { minX: number; maxX: number; minY: number; maxY: number }, focus: Point, scale: number): ZoomTransform {
  const area = freeArea(viewport)
  const freeLeft = area.left + 16
  const freeRight = area.width - area.right - 16
  const freeTop = area.top + 16
  const freeBottom = area.height - area.bottom - 16
  let x = area.width / 2 - focus.x * scale
  const left = x + box.minX * scale
  const right = x + box.maxX * scale
  if (right - left <= freeRight - freeLeft) {
    if (left < freeLeft) x += freeLeft - left
    else if (right > freeRight) x -= right - freeRight
  } else {
    x = (freeLeft + freeRight) / 2 - focus.x * scale
  }
  let y = (freeTop + freeBottom) / 2 - focus.y * scale
  const top = y + box.minY * scale
  const bottom = y + box.maxY * scale
  if (bottom - top <= freeBottom - freeTop) {
    if (top < freeTop) y += freeTop - top
    else if (bottom > freeBottom) y -= bottom - freeBottom
  }
  return zoomIdentity.translate(x, y).scale(scale)
}

function connectorPath(start: Point, busY: number, end: Point): string {
  const radius = Math.min(10, Math.abs(end.x - start.x) / 2, Math.abs(busY - start.y), Math.abs(end.y - busY))
  if (Math.abs(end.x - start.x) < 1) return `M${start.x},${start.y}V${end.y}`
  const direction = end.x > start.x ? 1 : -1
  return [
    `M${start.x},${start.y}`,
    `V${busY - radius}`,
    `Q${start.x},${busY} ${start.x + direction * radius},${busY}`,
    `H${end.x - direction * radius}`,
    `Q${end.x},${busY} ${end.x},${busY + radius}`,
    `V${end.y}`,
  ].join('')
}

type CardProps = {
  person: Person
  x: number
  y: number
  width: number
  height: number
  mode: CardMode
  isMain: boolean
  isRemoving: boolean
  isDragging: boolean
  hiddenCount: number
  onSelect: (id: PersonId) => void
  onExpand: (id: PersonId) => void
  onEdit: (id: PersonId) => void
  onBeginDrag?: (id: PersonId, x: number, y: number) => void
}

const GraphCard = memo(function GraphCard({ person, x, y, width, height, mode, isMain, isRemoving, isDragging, hiddenCount, onSelect, onExpand, onEdit, onBeginDrag }: CardProps) {
  const name = fullName(person)
  const life = lifespan(person)
  const avatar = sanitizeAvatarUrl(person.avatar)
  const classes = ['kt-card', `kt-mode-${mode}`, isDeceased(person) && 'is-deceased', isMain && 'is-main', isRemoving && 'kt-removing', isDragging && 'kt-dragging'].filter(Boolean).join(' ')
  return (
    <div className="graph-node" style={{ width, height, transform: `translate(${x - width / 2}px, ${y - height / 2}px)` }}>
      <div
        key={mode}
        className={classes}
        data-gender={person.gender}
        data-drop-person-id={person.id}
        role="button"
        tabIndex={0}
        aria-label={`${name}${life ? `, ${life}` : ''}`}
        aria-current={isMain || undefined}
        onClick={() => onSelect(person.id)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onSelect(person.id)
        }}
      >
        <span
          className="kt-grip"
          role="button"
          aria-label={`Drag ${name} onto another card to connect`}
          title="Drag onto another card to connect"
          onPointerDown={(event) => {
            event.stopPropagation()
            event.preventDefault()
            if (event.button === 0) onBeginDrag?.(person.id, event.clientX, event.clientY)
          }}
          onClick={(event) => event.stopPropagation()}
        >⠿</span>
        <div className="kt-avatar">
          <span>{displayInitials(person)}</span>
          {avatar && <img className="kt-avatar-img" src={avatar} alt="" style={avatarImageStyle(person.avatarFocus)} loading="lazy" referrerPolicy="no-referrer" draggable={false} onError={(event) => event.currentTarget.classList.add('is-error')} />}
        </div>
        {mode === 'photo' && <span className="kt-accent" aria-hidden="true" />}
        <div className="kt-body">
          <div className="kt-name" title={name}>{name}</div>
          {life && <div className="kt-life">{life}</div>}
        </div>
        {hiddenCount > 0 && (
          <button type="button" className="kt-more" title={`${hiddenCount} more relatives — show them`} onClick={(event) => { event.stopPropagation(); onExpand(person.id) }}>+{hiddenCount}</button>
        )}
        <button type="button" className="kt-edit" aria-label={`Edit ${name}`} title="Edit" onClick={(event) => { event.stopPropagation(); onEdit(person.id) }}>✎</button>
      </div>
    </div>
  )
})

function useTweenedPositions(layout: FamilyLayout): Map<PersonId, Point> {
  const [drawn, setDrawn] = useState<Map<PersonId, Point>>(() => new Map([...layout.nodes].map(([id, node]) => [id, { x: node.x, y: node.y }])))
  const drawnRef = useRef(drawn)
  useEffect(() => {
    drawnRef.current = drawn
  }, [drawn])
  useEffect(() => {
    const from = drawnRef.current
    const target = new Map([...layout.nodes].map(([id, node]) => [id, { x: node.x, y: node.y }]))
    const moving = [...target].some(([id, point]) => {
      const previous = from.get(id)
      return previous && (Math.abs(previous.x - point.x) > 0.5 || Math.abs(previous.y - point.y) > 0.5)
    })
    if (!moving || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDrawn(target)
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / MOVE_MS)
      const eased = easeCubicInOut(progress)
      setDrawn(new Map([...target].map(([id, point]) => {
        const previous = from.get(id) ?? point
        return [id, { x: previous.x + (point.x - previous.x) * eased, y: previous.y + (point.y - previous.y) * eased }]
      })))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [layout])
  return drawn
}

function GraphLinks({ layout, options }: { layout: FamilyLayout; options: LayoutOptions }) {
  const drawn = useTweenedPositions(layout)
  const at = (id: PersonId) => drawn.get(id) ?? layout.nodes.get(id)
  const half = options.cardHeight / 2
  const coupleKey = new Set(layout.couples.flatMap(({ a, b }) => [`${a}+${b}`, `${b}+${a}`]))
  return (
    <svg className="graph-links" aria-hidden="true">
      {layout.couples.map(({ a, b }) => {
        const pa = at(a)
        const pb = at(b)
        if (!pa || !pb) return null
        const [left, right] = pa.x < pb.x ? [pa, pb] : [pb, pa]
        return <path key={`c:${a}:${b}`} className="graph-link couple" d={`M${left.x + options.cardWidth / 2},${left.y}H${right.x - options.cardWidth / 2}`} />
      })}
      {layout.siblingLinks.map(({ a, b, kind }) => {
        const pa = at(a)
        const pb = at(b)
        if (!pa || !pb) return null
        const top = Math.min(pa.y, pb.y) - half
        const bar = top - Math.min(kind === 'step' ? 26 : 16, options.rowGap / (kind === 'step' ? 2.4 : 3.6))
        return <path key={`s:${a}:${b}`} className={`graph-link sibling${kind === 'step' ? ' step' : ''}`} d={`M${pa.x},${pa.y - half}V${bar}H${pb.x}V${pb.y - half}`} />
      })}
      {layout.families.flatMap((family) => {
        const parents = family.parentIds.map(at).filter((point): point is Point => Boolean(point))
        if (!parents.length) return []
        const isCouple = parents.length === 2 && coupleKey.has(family.parentIds.join('+'))
        const start = {
          x: parents.reduce((sum, point) => sum + point.x, 0) / parents.length,
          y: isCouple ? parents[0].y : Math.max(...parents.map((point) => point.y)) + half,
        }
        const parentBottom = Math.max(...parents.map((point) => point.y)) + half
        return family.childIds.map((childId) => {
          const child = at(childId)
          if (!child) return null
          const busY = Math.min(parentBottom + options.rowGap / 2, child.y - half - 8)
          return <path key={`f:${family.id}:${childId}`} className="graph-link descent" d={connectorPath(start, busY, { x: child.x, y: child.y - half })} />
        })
      })}
    </svg>
  )
}

export function FamilyGraph({ people, mainId, panelOpen, expandedIds, removingIds, draggingId, cardMode, viewMode, fitSignal, emptyState, onSelect, onExpand, onEdit, onBeginDrag }: FamilyGraphProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null)
  const small = useSmallScreen()
  const options = (small ? mobileLayoutOptions : layoutOptions)[cardMode]
  const peopleList = useMemo(() => [...people.values()], [people])
  const component = useMemo(() => familyComponent(peopleList, mainId), [peopleList, mainId])
  const focused = viewMode === 'focus'
  const showAll = viewMode === 'all'
  const stableRoot = useMemo(() => {
    if (!mainId) return null
    if (!showAll) return mainId
    return peopleList.find((person) => component.has(person.id))?.id ?? mainId
  }, [component, mainId, peopleList, showAll])
  const rawLayout = useMemo(() => layoutFamily(people, stableRoot, {
    ...options,
    maxDepth: focused ? 1 : showAll ? undefined : FAMILY_DEPTH,
    includeSiblings: focused,
    expandedIds,
  }), [expandedIds, focused, options, people, showAll, stableRoot])
  const [layout, setLayout] = useState(rawLayout)
  const [seenLayout, setSeenLayout] = useState(rawLayout)
  if (seenLayout !== rawLayout) {
    setSeenLayout(rawLayout)
    setLayout(anchorLayout(rawLayout, layout, mainId))
  }
  const showHidden = !showAll
  const layoutRef = useRef(layout)
  const layoutOptionsRef = useRef(options)
  const mainIdRef = useRef(mainId)
  const hasTree = layout.nodes.size > 0
  useLayoutEffect(() => {
    layoutRef.current = layout
    layoutOptionsRef.current = options
    mainIdRef.current = mainId
  })

  const applyTransform = useCallback((transform: ZoomTransform, duration: number) => {
    const viewport = viewportRef.current
    const behavior = zoomRef.current
    if (!viewport || !behavior) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const selection = select(viewport)
    selection.interrupt()
    if (!duration || reduce) selection.call(behavior.transform, transform)
    else selection.transition().duration(duration).ease(easeCubicInOut).call(behavior.transform, transform)
  }, [])

  const fitScale = useCallback((viewport: HTMLElement, box: FamilyLayout['bounds']) => {
    const area = freeArea(viewport)
    const width = Math.max(1, area.width - area.left - area.right - 64)
    const height = Math.max(1, area.height - area.top - area.bottom - 64)
    return Math.max(MIN_ZOOM, Math.min(MAX_FIT_SCALE, width / (box.maxX - box.minX), height / (box.maxY - box.minY)))
  }, [])

  const fitAll = useCallback((duration: number) => {
    const viewport = viewportRef.current
    const current = layoutRef.current
    if (!viewport || !current.nodes.size) return
    const box = current.bounds
    const scale = fitScale(viewport, box)
    applyTransform(transformFor(viewport, box, { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }, scale), duration)
  }, [applyTransform, fitScale])

  const centerOn = useCallback((id: PersonId, scale: number, duration: number) => {
    const viewport = viewportRef.current
    const node = layoutRef.current.nodes.get(id)
    if (!viewport || !node) return
    const box = { minX: node.x - 1, maxX: node.x + 1, minY: node.y - 1, maxY: node.y + 1 }
    applyTransform(transformFor(viewport, box, node, scale), duration)
  }, [applyTransform])

  const ensureVisible = useCallback((id: PersonId | null, duration: number) => {
    const viewport = viewportRef.current
    const current = layoutRef.current
    const node = id ? current.nodes.get(id) : undefined
    if (!viewport || !node) return
    const transform = zoomTransform(viewport)
    const area = freeArea(viewport)
    const margin = 24
    const halfW = layoutOptionsRef.current.cardWidth / 2 * transform.k
    const halfH = layoutOptionsRef.current.cardHeight / 2 * transform.k
    const screenX = node.x * transform.k + transform.x
    const screenY = node.y * transform.k + transform.y
    const minX = area.left + margin + halfW
    const maxX = area.width - area.right - margin - halfW
    const minY = area.top + margin + halfH
    const maxY = area.height - area.bottom - margin - halfH
    const dx = minX > maxX ? (minX + maxX) / 2 - screenX : screenX < minX ? minX - screenX : screenX > maxX ? maxX - screenX : 0
    const dy = minY > maxY ? (minY + maxY) / 2 - screenY : screenY < minY ? minY - screenY : screenY > maxY ? maxY - screenY : 0
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    applyTransform(zoomIdentity.translate(transform.x + dx, transform.y + dy).scale(transform.k), duration)
  }, [applyTransform])

  const reframe = useCallback((id: PersonId | null, duration: number, recenter = false) => {
    const viewport = viewportRef.current
    const current = layoutRef.current
    if (!viewport || !current.nodes.size) return
    const fit = fitScale(viewport, current.bounds)
    if (fit >= readableScale()) return fitAll(duration)
    if (recenter && id) return centerOn(id, Math.max(readableScale(), Math.min(MAX_FIT_SCALE, zoomTransform(viewport).k)), duration)
    const scale = zoomTransform(viewport).k
    if (scale < readableScale() * 0.6 && id) return centerOn(id, readableScale(), duration)
    ensureVisible(id, duration)
  }, [centerOn, ensureVisible, fitAll, fitScale])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const stage = stageRef.current
    if (!viewport || !stage || !hasTree) return
    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .clickDistance(5)
      .filter((event: Event) => {
        const target = event.target
        if (target instanceof Element && target.closest('.kt-grip, button')) return false
        const mouse = event as MouseEvent
        return (!mouse.ctrlKey || event.type === 'wheel') && !mouse.button
      })
      .on('zoom', (event: { transform: ZoomTransform }) => {
        const { x, y, k } = event.transform
        stage.style.transform = `translate(${x}px, ${y}px) scale(${k})`
      })
    zoomRef.current = behavior
    select(viewport).call(behavior).on('dblclick.zoom', null)
    const pinScroll = () => {
      if (viewport.scrollLeft || viewport.scrollTop) viewport.scrollTo(0, 0)
    }
    viewport.addEventListener('scroll', pinScroll)
    reframe(mainIdRef.current, 0, true)
    let lastSize = `${viewport.clientWidth}x${viewport.clientHeight}`
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const size = `${viewport.clientWidth}x${viewport.clientHeight}`
      if (size === lastSize) return
      lastSize = size
      reframe(mainIdRef.current, 0)
    })
    observer?.observe(viewport)
    return () => {
      observer?.disconnect()
      viewport.removeEventListener('scroll', pinScroll)
      select(viewport).on('.zoom', null)
      zoomRef.current = null
    }
  }, [hasTree, reframe])

  const previousMainRef = useRef(mainId)
  const previousPanelRef = useRef(panelOpen)
  const signatureOf = (current: FamilyLayout) => [...current.nodes.values()].map((node) => `${node.id}@${Math.round(node.x)},${Math.round(node.y)}`).sort().join('|')
  const previousIdsRef = useRef(signatureOf(layout))
  const previousModeRef = useRef(`${cardMode}:${viewMode}`)
  useEffect(() => {
    if (!hasTree) return
    const ids = signatureOf(layout)
    const mode = `${cardMode}:${viewMode}`
    const mainChanged = previousMainRef.current !== mainId
    const membersChanged = previousIdsRef.current !== ids
    const modeChanged = previousModeRef.current !== mode
    previousMainRef.current = mainId
    previousIdsRef.current = ids
    previousModeRef.current = mode
    const panelOpened = panelOpen && !previousPanelRef.current
    previousPanelRef.current = panelOpen
    const viewport = viewportRef.current
    if (mainChanged && mainId && viewport) {
      centerOn(mainId, Math.max(readableScale(), Math.min(MAX_FIT_SCALE, zoomTransform(viewport).k)), MOVE_MS)
    } else if (membersChanged || modeChanged) {
      reframe(mainId, MOVE_MS, modeChanged)
    } else if (panelOpened) {
      ensureVisible(mainId, MOVE_MS)
    }
  }, [cardMode, centerOn, ensureVisible, hasTree, layout, mainId, panelOpen, reframe, viewMode])

  useEffect(() => {
    const onSheetSettled = (event: AnimationEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches('.people-tray, .details-panel, .people-rail, .people-inventory')) return
      if (event.target.classList.contains('is-closing')) return
      ensureVisible(mainIdRef.current, MOVE_MS)
    }
    const onSheetGone = (event: AnimationEvent) => {
      if (event.target instanceof Element && event.target.classList.contains('is-closing')) window.setTimeout(() => ensureVisible(mainIdRef.current, MOVE_MS), 30)
    }
    document.addEventListener('animationend', onSheetSettled)
    document.addEventListener('animationend', onSheetGone)
    return () => {
      document.removeEventListener('animationend', onSheetSettled)
      document.removeEventListener('animationend', onSheetGone)
    }
  }, [ensureVisible])

  const seenFitRef = useRef(fitSignal)
  useEffect(() => {
    if (seenFitRef.current === fitSignal) return
    seenFitRef.current = fitSignal
    fitAll(MOVE_MS)
  }, [fitAll, fitSignal])

  const cards = [...layout.nodes.values()].map((node) => {
    const person = people.get(node.id)
    if (!person) return null
    return (
      <GraphCard
        key={node.id}
        person={person}
        x={node.x}
        y={node.y}
        width={options.cardWidth}
        height={options.cardHeight}
        mode={cardMode}
        isMain={node.id === mainId}
        isRemoving={Boolean(removingIds?.has(node.id))}
        isDragging={draggingId === node.id}
        hiddenCount={showHidden ? node.hiddenCount : 0}
        onSelect={onSelect}
        onExpand={onExpand}
        onEdit={onEdit}
        onBeginDrag={onBeginDrag}
      />
    )
  })

  return (
    <div className={`family-graph mode-${cardMode} view-${viewMode}${small ? ' is-small' : ''}`} data-drop-canvas>
      <div ref={viewportRef} className="graph-viewport" aria-label="Family tree" role="group">
        {hasTree && (
          <div ref={stageRef} className="graph-stage">
            <GraphLinks layout={layout} options={options} />
            {cards}
          </div>
        )}
      </div>
      {!hasTree && emptyState}
    </div>
  )
}
