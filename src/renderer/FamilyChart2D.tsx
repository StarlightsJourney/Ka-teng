import { useEffect, useRef, useState } from 'react'
import { select, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3'
import f3 from 'family-chart'
import type { Data, TreeDatum } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import { displayInitials, fullName, lifespan } from '../element'
import type { Person } from '../element'
import { pruneHierarchy } from '../scene'
import { toFamilyChartData } from './familyChartAdapter'

type FamilyChart2DProps = {
  people: Person[]
  defaultMainId: string | null
  selectedId: string | null
  showAll: boolean
  expandedIds: ReadonlySet<string>
  onSelect: (personId: string) => void
  onExpand: (personId: string) => void
  onEdit: (personId: string) => void
}

type ZoomListener = SVGSVGElement & {
  __zoomObj?: ZoomBehavior<SVGSVGElement, unknown>
}
type RenderedTree = {
  data: Array<{ id?: string; x: number; y: number; data?: { id?: string; _ktHidden?: number } }>
}

function centerVisibleTree(
  chart: ReturnType<typeof f3.createChart>,
  panelOpen: boolean,
  transitionTime: number,
  mainId?: string | null,
  keepZoom = false,
): void {
  const svg = chart.svg as ZoomListener
  const listener = (svg.__zoomObj ? svg : svg.parentNode) as ZoomListener | null
  const zoom = listener?.__zoomObj
  const tree = chart.store.getTree() as RenderedTree | undefined
  if (!listener || !zoom || !tree?.data?.length) return

  const svgRect = svg.getBoundingClientRect()
  const cardWidth = 220
  const cardHeight = 60
  const minX = Math.min(...tree.data.map((datum) => datum.x - cardWidth / 2))
  const maxX = Math.max(...tree.data.map((datum) => datum.x + cardWidth / 2))
  const minY = Math.min(...tree.data.map((datum) => datum.y - cardHeight / 2))
  const maxY = Math.max(...tree.data.map((datum) => datum.y + cardHeight / 2))
  const treeWidth = maxX - minX
  const treeHeight = maxY - minY
  const isSmallScreen = window.innerWidth <= 720
  const availableWidth = Math.max(0, svgRect.width - (!isSmallScreen && panelOpen ? 336 : 0))
  const availableHeight = Math.max(0, svgRect.height - (isSmallScreen && panelOpen ? svgRect.height * 0.45 : 0))
  const targetCenterX = (availableWidth || svgRect.width) / 2
  const targetCenterY = (availableHeight || svgRect.height) / 2
  const current = zoomTransform(listener)
  const rawFitScale = Math.min(
    (availableWidth - 80) / treeWidth,
    (availableHeight - 80) / treeHeight,
  )
  const scale = keepZoom
    ? current.k
    : Number.isFinite(rawFitScale) && rawFitScale > 0
      ? Math.min(1.25, Math.max(0.85, rawFitScale))
      : current.k
  const main = tree.data.find((datum) => datum.id === mainId || datum.data?.id === mainId) ?? tree.data[0]
  const treeCenterX = !keepZoom && rawFitScale < 0.85 && main ? main.x : (keepZoom && main ? main.x : (minX + maxX) / 2)
  const treeCenterY = !keepZoom && rawFitScale < 0.85 && main ? main.y : (keepZoom && main ? main.y : (minY + maxY) / 2)
  const target = zoomIdentity
    .translate(targetCenterX - treeCenterX * scale, targetCenterY - treeCenterY * scale)
    .scale(scale)

  select(listener)
    .interrupt()
    .transition()
    .duration(transitionTime || 0)
    .delay(transitionTime ? 100 : 0)
    .call(zoom.transform, target)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function cardInnerHtml(
  d: TreeDatum,
  peopleById: ReadonlyMap<string, Person>,
  showAll: boolean,
): string {
  if (d.data._new_rel_data) {
    const relation = d.data._new_rel_data
    const attributes = [
      `data-rel-type="${escapeHtml(relation.rel_type)}"`,
      relation.other_parent_id
        ? `data-other-parent-id="${escapeHtml(relation.other_parent_id)}"`
        : '',
    ].filter(Boolean).join(' ')
    return `<div class="card-inner card-rect card-new-rel" ${attributes}>${escapeHtml(relation.label)}</div>`
  }
  if (d.data.to_add) return '<div class="card-inner card-rect card-to-add"><div>ADD</div></div>'
  if (d.data.unknown) return '<div class="card-inner card-rect card-unknown"><div>UNKNOWN</div></div>'

  const person = peopleById.get(d.data.id)
  if (!person) return '<div class="card-inner card-rect card-unknown"><div>UNKNOWN</div></div>'
  const gender = person.gender === 'M' ? 'male' : person.gender === 'F' ? 'female' : 'genderless'
  const avatar = person.avatar
    ? `<img class="kt-avatar-img" src="${escapeHtml(person.avatar)}" loading="lazy" referrerpolicy="no-referrer" alt="" onerror="this.classList.add('is-error')">`
    : ''
  const hiddenCount = showAll ? 0 : (d.data._ktHidden ?? 0)
  const more = hiddenCount
    ? `<button class="kt-more" type="button" data-person-id="${escapeHtml(person.id)}" title="${hiddenCount} more — click to explore">+${hiddenCount}</button>`
    : ''
  const edit = `<button class="kt-edit" type="button" data-person-id="${escapeHtml(person.id)}" aria-label="Edit ${escapeHtml(fullName(person))}" title="Edit">✎</button>`
  return `<div class="card-inner card-rect kt-card kt-${gender}">
    <div class="kt-avatar"><span>${escapeHtml(displayInitials(person))}</span>${avatar}</div>
    <div class="kt-body">
      <div class="kt-name">${escapeHtml(fullName(person))}</div>
      <div class="kt-life">${escapeHtml(lifespan(person))}</div>
    </div>
    ${more}
    ${edit}
  </div>`
}

export function FamilyChart2D({ people, defaultMainId, selectedId, showAll, expandedIds, onSelect, onExpand, onEdit }: FamilyChart2DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null)
  const onSelectRef = useRef(onSelect)
  const onExpandRef = useRef(onExpand)
  const onEditRef = useRef(onEdit)
  const peopleRef = useRef(people)
  const peopleByIdRef = useRef(new Map(people.map((person) => [person.id, person])))
  const selectedIdRef = useRef(selectedId)
  const expandedIdsRef = useRef(expandedIds)
  const showAllRef = useRef(showAll)
  const previousShowAllRef = useRef(showAll)
  const lastSelectionUpdateRef = useRef(0)
  const [overflowToast, setOverflowToast] = useState(false)
  const [zoomedOut, setZoomedOut] = useState(false)
  const dismissedToastRef = useRef(false)
  const zoomedOutRef = useRef(false)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    onExpandRef.current = onExpand
    onEditRef.current = onEdit
    expandedIdsRef.current = expandedIds
    showAllRef.current = showAll
    selectedIdRef.current = selectedId
    zoomedOutRef.current = zoomedOut
  }, [expandedIds, onEdit, onExpand, selectedId, showAll, zoomedOut])

  useEffect(() => {
    peopleRef.current = people
    peopleByIdRef.current = new Map(people.map((person) => [person.id, person]))
    if (!chartRef.current) return
    chartRef.current.updateData(toFamilyChartData(people))
    chartRef.current.updateMainId(selectedIdRef.current ?? defaultMainId ?? peopleRef.current[0]?.id ?? '')
    chartRef.current.updateTree({ tree_position: 'inherit' })
  }, [defaultMainId, people])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''
    const ancestryHidden = new Map<string, number>()
    const chart = f3.createChart(container, toFamilyChartData(peopleRef.current) as Data)
      .setTransitionTime(650)
      .setCardXSpacing(250)
      .setCardYSpacing(150)
      .setModifyTreeHierarchy((root, isAncestry) => {
        if (showAllRef.current) return
        const hierarchyRoot = root as unknown as Parameters<typeof pruneHierarchy>[0]
        pruneHierarchy(hierarchyRoot, {
          isAncestry,
          expandedIds: expandedIdsRef.current,
          maxDepth: 2,
          maxChildren: 5,
        })
        const descendants = (root as unknown as {
          descendants: () => Array<{ data: { id: string; _ktHidden?: number } }>
        }).descendants()
        if (isAncestry) {
          ancestryHidden.clear()
          descendants.forEach((node) => ancestryHidden.set(node.data.id, node.data._ktHidden ?? 0))
        } else {
          descendants.forEach((node) => {
            node.data._ktHidden = (node.data._ktHidden ?? 0) + (ancestryHidden.get(node.data.id) ?? 0)
          })
        }
      })
    chart
      .setCardHtml()
      .setStyle('rect')
      .setCardInnerHtmlCreator((datum) => {
        return cardInnerHtml(datum, peopleByIdRef.current, showAllRef.current)
      })
      .setCardDim({ w: 220, h: 60 })
      .setOnCardClick((_event: MouseEvent, datum: TreeDatum) => onSelectRef.current(datum.data.id))

    chartRef.current = chart
    const getZoomTarget = () => {
      const svg = chart.svg as ZoomListener
      return (svg.__zoomObj ? svg : svg.parentNode) as ZoomListener | null
    }
    const checkOverflow = () => {
      const tree = chart.store.getTree() as RenderedTree | undefined
      const listener = getZoomTarget()
      const zoom = listener?.__zoomObj
      if (!tree?.data?.length || !listener || !zoom) return
      const rect = chart.svg.getBoundingClientRect()
      const current = zoomTransform(listener)
      const xs = tree.data.map((datum) => datum.x * current.k + current.x)
      const ys = tree.data.map((datum) => datum.y * current.k + current.y)
      const minX = Math.min(...xs) - 110 * current.k
      const maxX = Math.max(...xs) + 110 * current.k
      const minY = Math.min(...ys) - 30 * current.k
      const maxY = Math.max(...ys) + 30 * current.k
      const fits = minX >= 0 && maxX <= rect.width && minY >= 0 && maxY <= rect.height
      if (zoomedOutRef.current || dismissedToastRef.current) return
      setOverflowToast(!fits)
    }
    const updateCenteredTree = (transitionTime = 0) => {
      chart.updateTree({ tree_position: 'inherit', transition_time: transitionTime })
      centerVisibleTree(
        chart,
        Boolean(selectedIdRef.current),
        transitionTime,
        selectedIdRef.current ?? defaultMainId,
        showAllRef.current && !zoomedOutRef.current,
      )
      window.setTimeout(checkOverflow, transitionTime + 20)
    }
    const resizeChart = () => {
      const currentChart = chartRef.current
      if (!currentChart) return
      updateCenteredTree()
    }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeChart)
    resizeObserver?.observe(container)
    window.addEventListener('resize', resizeChart)
    const zoomTarget = getZoomTarget()
    const overflowTimer = { current: 0 as number | undefined }
    const scheduleOverflowCheck = () => {
      window.clearTimeout(overflowTimer.current)
      overflowTimer.current = window.setTimeout(checkOverflow, 150)
    }
    if (zoomTarget) select(zoomTarget).on('zoom.kt-overflow', scheduleOverflowCheck)
    const handleMoreClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const more = target.closest<HTMLElement>('.kt-more')
      const edit = target.closest<HTMLElement>('.kt-edit')
      if (!more && !edit) return
      event.stopPropagation()
      const personId = (more ?? edit)?.dataset.personId
      if (!personId) return
      if (edit) onEditRef.current(personId)
      else onExpandRef.current(personId)
    }
    container.addEventListener('click', handleMoreClick, true)
    chart.updateMainId(selectedIdRef.current ?? defaultMainId ?? peopleRef.current[0]?.id ?? '')
    chart.updateTree({ initial: true, tree_position: 'fit' })
    window.setTimeout(checkOverflow, 20)
    const fitTimer = window.setTimeout(() => chart.updateTree({ tree_position: 'fit' }), 0)
    return () => {
      window.clearTimeout(fitTimer)
      window.clearTimeout(overflowTimer.current)
      if (zoomTarget) select(zoomTarget).on('zoom.kt-overflow', null)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resizeChart)
      container.removeEventListener('click', handleMoreClick, true)
      chartRef.current = null
      container.innerHTML = ''
    }
  }, [defaultMainId])

  useEffect(() => {
    if (!chartRef.current) return
    const transitionTime = 650
    chartRef.current.updateTree({ tree_position: 'inherit', transition_time: transitionTime })
    centerVisibleTree(
      chartRef.current,
      Boolean(selectedIdRef.current),
      transitionTime,
      selectedIdRef.current ?? defaultMainId,
      showAllRef.current && !zoomedOutRef.current,
    )
  }, [defaultMainId, expandedIds])

  useEffect(() => {
    if (!chartRef.current || previousShowAllRef.current === showAll) return
    const chart = chartRef.current
    const transitionTime = 650
    setZoomedOut(false)
    dismissedToastRef.current = false
    setOverflowToast(false)
    chart.updateMainId(selectedIdRef.current ?? defaultMainId ?? peopleRef.current[0]?.id ?? '')
    chart.updateTree({ tree_position: 'inherit', transition_time: transitionTime })
    centerVisibleTree(
      chart,
      Boolean(selectedIdRef.current),
      transitionTime,
      selectedIdRef.current ?? defaultMainId,
      showAll,
    )
    previousShowAllRef.current = showAll
  }, [defaultMainId, showAll])

  useEffect(() => {
    if (!chartRef.current) return
    const now = performance.now()
    const transitionTime = now - lastSelectionUpdateRef.current < 650 ? 0 : 650
    const mainId = selectedId ?? defaultMainId ?? peopleRef.current[0]?.id ?? ''
    setZoomedOut(false)
    dismissedToastRef.current = false
    setOverflowToast(false)
    chartRef.current.updateMainId(mainId).updateTree({ tree_position: 'inherit', transition_time: transitionTime })
    centerVisibleTree(chartRef.current, Boolean(selectedId), transitionTime, mainId, false)
    lastSelectionUpdateRef.current = now
  }, [defaultMainId, selectedId])

  const fitWholeTree = () => {
    if (!chartRef.current) return
    setZoomedOut(true)
    setOverflowToast(true)
    dismissedToastRef.current = false
    chartRef.current.updateTree({ tree_position: 'fit', transition_time: 650 })
  }
  const returnToNormal = () => {
    if (!chartRef.current) return
    setZoomedOut(false)
    setOverflowToast(false)
    dismissedToastRef.current = false
    chartRef.current.updateTree({ tree_position: 'inherit', transition_time: 650 })
    centerVisibleTree(chartRef.current, Boolean(selectedIdRef.current), 650, selectedIdRef.current ?? defaultMainId, false)
  }

  return <div className="family-chart-shell">
    <div ref={containerRef} className="f3 family-chart-host" aria-label="2D family chart" />
    {overflowToast && <div className="tree-overflow-toast" role="status">
      <button type="button" className="tree-overflow-close" aria-label="Dismiss" onClick={() => { dismissedToastRef.current = true; setOverflowToast(false) }}>×</button>
      <span>The tree is larger than your view</span>
      {!zoomedOut && <button type="button" onClick={fitWholeTree}>See whole tree</button>}
      <button type="button" onClick={returnToNormal}>Back to normal</button>
    </div>}
  </div>
}
