import { useEffect, useRef } from 'react'
import f3 from 'family-chart'
import type { Data, TreeDatum } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import type { Person } from '../types'

type FamilyChart2DProps = {
  people: Person[]
  selectedId: string | null
  onSelect: (personId: string) => void
}

export function FamilyChart2D({ people, selectedId, onSelect }: FamilyChart2DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const chart = f3.createChart(containerRef.current, people as unknown as Data)
      .setTransitionTime(650)
      .setCardXSpacing(220)
      .setCardYSpacing(130)

    const card = chart
      .setCardHtml()
      .setStyle('rect')
      .setCardDisplay([['first name', 'last name'], ['birthday']])
      .setCardDim({ w: 190, h: 74 })
      .setOnCardClick((_event: MouseEvent, datum: TreeDatum) => onSelectRef.current(datum.data.id))

    chart
      .editTree()
      .setFields(['first name', 'last name', 'birthday'])
      .setEditFirst(true)
      .setCardClickOpen(card)

    chart.updateTree({ initial: true, tree_position: 'fit' })
    chartRef.current = chart

    return () => {
      chart.editTreeInstance?.destroy()
      chartRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [people])

  useEffect(() => {
    if (!chartRef.current || !selectedId) return
    chartRef.current.updateMainId(selectedId).updateTree({ tree_position: 'main_to_middle' })
  }, [selectedId])

  return <div ref={containerRef} className="family-chart-host" aria-label="2D family chart" />
}
