import { useEffect, useRef } from 'react'
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
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    onExpandRef.current = onExpand
    onEditRef.current = onEdit
    expandedIdsRef.current = expandedIds
    showAllRef.current = showAll
    selectedIdRef.current = selectedId
  }, [expandedIds, onEdit, onExpand, selectedId, showAll])

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
    const resizeChart = () => {
      const currentChart = chartRef.current
      if (!currentChart) return
      currentChart.updateTree({ tree_position: 'inherit', transition_time: 0 })
    }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeChart)
    resizeObserver?.observe(container)
    window.addEventListener('resize', resizeChart)
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
    const fitTimer = window.setTimeout(() => chart.updateTree({ tree_position: 'fit' }), 0)
    return () => {
      window.clearTimeout(fitTimer)
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
    chartRef.current.updateTree({ tree_position: 'inherit' })
  }, [expandedIds])

  useEffect(() => {
    if (!chartRef.current || previousShowAllRef.current === showAll) return
    const chart = chartRef.current
    if (showAll) {
      chart.updateTree({ tree_position: 'fit', transition_time: 650 })
    } else {
      chart.updateMainId(selectedIdRef.current ?? defaultMainId ?? peopleRef.current[0]?.id ?? '')
      chart.updateTree({
        tree_position: selectedIdRef.current ? 'main_to_middle' : 'fit',
        transition_time: 650,
      })
    }
    previousShowAllRef.current = showAll
  }, [defaultMainId, showAll])

  useEffect(() => {
    if (!chartRef.current || !selectedId) return
    const now = performance.now()
    const transitionTime = now - lastSelectionUpdateRef.current < 650 ? 0 : 650
    chartRef.current.updateMainId(selectedId).updateTree({
      tree_position: 'main_to_middle',
      transition_time: transitionTime,
    })
    lastSelectionUpdateRef.current = now
  }, [selectedId])

  return <div ref={containerRef} className={`f3 family-chart-host${selectedId ? ' panel-open' : ''}`} aria-label="2D family chart" />
}
