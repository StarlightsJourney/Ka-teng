import { useEffect, useRef } from 'react'
import { select, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from 'd3'
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
  onOverviewChange: (needsRecentre: boolean) => void
  recenterRequest: number
}

type ZoomListener = SVGSVGElement & {
  __zoomObj?: ZoomBehavior<SVGSVGElement, unknown>
}
type ViewSnapshot = {
  mainId: string | null
  expandedIds: ReadonlySet<string>
  transform: ZoomTransform
}

type RenderedTree = {
  data: Array<{ id?: string; x: number; y: number; data?: { id?: string; _ktHidden?: number } }>
}

function centerVisibleTree(
  chart: ReturnType<typeof f3.createChart>,
  panelOpen: boolean,
  transitionTime: number,
  mainId?: string | null,
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
  const scale = Number.isFinite(rawFitScale) && rawFitScale > 0
    ? Math.min(1.25, Math.max(0.85, rawFitScale))
    : current.k
  const main = tree.data.find((datum) => datum.id === mainId || datum.data?.id === mainId) ?? tree.data[0]
  const treeCenterX = rawFitScale < 0.85 && main ? main.x : (minX + maxX) / 2
  const treeCenterY = rawFitScale < 0.85 && main ? main.y : (minY + maxY) / 2
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

export function FamilyChart2D({ people, defaultMainId, selectedId, showAll, expandedIds, onSelect, onExpand, onEdit, onOverviewChange, recenterRequest }: FamilyChart2DProps) {
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
  const onOverviewChangeRef = useRef(onOverviewChange)
  const overviewSnapshotRef = useRef<ViewSnapshot | null>(null)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    onExpandRef.current = onExpand
    onEditRef.current = onEdit
    onOverviewChangeRef.current = onOverviewChange
    expandedIdsRef.current = expandedIds
    showAllRef.current = showAll
    selectedIdRef.current = selectedId
  }, [expandedIds, onEdit, onExpand, onOverviewChange, selectedId, showAll])

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
    const notifyOverview = () => {
      const tree = chart.store.getTree() as RenderedTree | undefined
      const listener = getZoomTarget()
      const zoom = listener?.__zoomObj
      if (!tree?.data?.length || !listener || !zoom) return
      if (!showAllRef.current) {
        onOverviewChangeRef.current(false)
        return
      }
      const rect = chart.svg.getBoundingClientRect()
      const current = zoomTransform(listener)
      const xs = tree.data.map((datum) => datum.x * current.k + current.x)
      const ys = tree.data.map((datum) => datum.y * current.k + current.y)
      const minX = Math.min(...xs) - 110 * current.k
      const maxX = Math.max(...xs) + 110 * current.k
      const minY = Math.min(...ys) - 30 * current.k
      const maxY = Math.max(...ys) + 30 * current.k
      const visibleWidth = Math.max(0, Math.min(maxX, rect.width) - Math.max(minX, 0))
      const visibleHeight = Math.max(0, Math.min(maxY, rect.height) - Math.max(minY, 0))
      const totalArea = Math.max(1, (maxX - minX) * (maxY - minY))
      const visibleRatio = (visibleWidth * visibleHeight) / totalArea
      const selected = tree.data.find((datum) => datum.id === selectedIdRef.current || datum.data?.id === selectedIdRef.current)
      const selectedX = selected ? selected.x * current.k + current.x : 0
      const selectedY = selected ? selected.y * current.k + current.y : 0
      const selectedOffscreen = Boolean(selected && (selectedX < 0 || selectedX > rect.width || selectedY < 0 || selectedY > rect.height))
      onOverviewChangeRef.current(visibleRatio < 0.6 || selectedOffscreen)
    }
    const updateCenteredTree = (transitionTime = 0) => {
      chart.updateTree({ tree_position: 'inherit', transition_time: transitionTime })
      if (!showAllRef.current) centerVisibleTree(chart, Boolean(selectedIdRef.current), transitionTime, selectedIdRef.current ?? defaultMainId)
      notifyOverview()
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
    const overviewTimer = { current: 0 as number | undefined }
    const scheduleOverview = () => {
      window.clearTimeout(overviewTimer.current)
      overviewTimer.current = window.setTimeout(notifyOverview, 150)
    }
    if (zoomTarget) select(zoomTarget).on('zoom.kt-overview', scheduleOverview)
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
    notifyOverview()
    const fitTimer = window.setTimeout(() => chart.updateTree({ tree_position: 'fit' }), 0)
    return () => {
      window.clearTimeout(fitTimer)
      window.clearTimeout(overviewTimer.current)
      if (zoomTarget) select(zoomTarget).on('zoom.kt-overview', null)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resizeChart)
      container.removeEventListener('click', handleMoreClick, true)
      chartRef.current = null
      container.innerHTML = ''
    }
  }, [defaultMainId])

  useEffect(() => {
    if (!chartRef.current) return
    if (showAllRef.current) return
    const transitionTime = 650
    chartRef.current.updateTree({ tree_position: 'inherit', transition_time: transitionTime })
    centerVisibleTree(chartRef.current, Boolean(selectedIdRef.current), transitionTime, selectedIdRef.current ?? defaultMainId)
  }, [defaultMainId, expandedIds])

  useEffect(() => {
    if (!chartRef.current || previousShowAllRef.current === showAll) return
    const chart = chartRef.current
    const transitionTime = 650
    if (showAll) {
      const svg = chart.svg as ZoomListener
      const listener = (svg.__zoomObj ? svg : svg.parentNode) as ZoomListener | null
      if (listener) {
        overviewSnapshotRef.current = {
          mainId: selectedIdRef.current ?? defaultMainId,
          expandedIds: new Set(expandedIdsRef.current),
          transform: zoomTransform(listener),
        }
      }
      chart.updateMainId(selectedIdRef.current ?? defaultMainId ?? peopleRef.current[0]?.id ?? '')
      chart.updateTree({ tree_position: 'fit', transition_time: transitionTime })
    } else {
      const snapshot = overviewSnapshotRef.current
      const canRestore = snapshot && snapshot.mainId === selectedIdRef.current
      chart.updateMainId(canRestore ? snapshot.mainId ?? defaultMainId ?? '' : selectedIdRef.current ?? defaultMainId ?? peopleRef.current[0]?.id ?? '')
      chart.updateTree({ tree_position: 'inherit', transition_time: transitionTime })
      if (canRestore) {
        window.setTimeout(() => {
          const svg = chart.svg as ZoomListener
          const listener = (svg.__zoomObj ? svg : svg.parentNode) as ZoomListener | null
          const zoom = listener?.__zoomObj
          if (listener && zoom && snapshot) {
            select(listener).interrupt().transition().duration(transitionTime).call(zoom.transform, snapshot.transform)
          }
        }, transitionTime + 50)
      } else {
        centerVisibleTree(chart, Boolean(selectedIdRef.current), transitionTime, selectedIdRef.current ?? defaultMainId)
      }
    }
    previousShowAllRef.current = showAll
  }, [defaultMainId, showAll])

  useEffect(() => {
    if (!chartRef.current || !showAll || recenterRequest === 0) return
    chartRef.current.updateTree({ tree_position: 'fit', transition_time: 650 })
  }, [recenterRequest, showAll])

  useEffect(() => {
    if (!chartRef.current) return
    if (showAllRef.current) return
    const now = performance.now()
    const transitionTime = now - lastSelectionUpdateRef.current < 650 ? 0 : 650
    const mainId = selectedId ?? defaultMainId ?? peopleRef.current[0]?.id ?? ''
    chartRef.current.updateMainId(mainId).updateTree({ tree_position: 'inherit', transition_time: transitionTime })
    centerVisibleTree(chartRef.current, Boolean(selectedId), transitionTime, mainId)
    lastSelectionUpdateRef.current = now
  }, [defaultMainId, selectedId])

  return <div ref={containerRef} className="f3 family-chart-host" aria-label="2D family chart" />
}
