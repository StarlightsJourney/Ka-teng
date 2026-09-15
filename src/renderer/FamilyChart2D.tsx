import { useEffect, useRef } from 'react'
import f3 from 'family-chart'
import type { Data, TreeDatum } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import type { Person } from '../element'
import { toFamilyChartData } from './familyChartAdapter'

type FamilyChart2DProps = {
  people: Person[]
  selectedId: string | null
  onSelect: (personId: string) => void
}

export function FamilyChart2D({ people, selectedId, onSelect }: FamilyChart2DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null)
  const onSelectRef = useRef(onSelect)
  const initialSelectedIdRef = useRef(selectedId)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''
    const chart = f3.createChart(container, toFamilyChartData(people) as Data)
      .setTransitionTime(650)
      .setCardXSpacing(250)
      .setCardYSpacing(150)
    const card = chart
      .setCardHtml()
      .setStyle('rect')
      .setCardDisplay([['first name', 'last name'], ['birthday']])
      .setCardDim({ w: 220, h: 70 })
      .setOnCardClick((_event: MouseEvent, datum: TreeDatum) => onSelectRef.current(datum.data.id))

    chart
      .editTree()
      .setFields(['first name', 'last name', 'birthday'])
      .setEditFirst(true)
      .setCardClickOpen(card)
    chart.updateMainId(initialSelectedIdRef.current ?? people[0]?.id ?? '')
    chart.updateTree({ initial: true, tree_position: 'fit' })
    const fitTimer = window.setTimeout(() => chart.updateTree({ tree_position: 'fit' }), 0)
    chartRef.current = chart
    return () => {
      window.clearTimeout(fitTimer)
      chart.editTreeInstance?.destroy()
      chartRef.current = null
      container.innerHTML = ''
    }
  }, [people])

  useEffect(() => {
    if (!chartRef.current || !selectedId) return
    chartRef.current.updateMainId(selectedId).updateTree({ tree_position: 'main_to_middle' })
  }, [selectedId])

  return <div ref={containerRef} className="f3 family-chart-host" aria-label="2D family chart" />
}
