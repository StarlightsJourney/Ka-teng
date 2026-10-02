import { useCallback, useEffect, useRef, useState } from 'react'
import type { PersonId } from '../element'

export type DragSource = 'tray' | 'tree'

export type DragState = {
  personId: PersonId
  source: DragSource
  x: number
  y: number
  overId: PersonId | null
  overCanvas: boolean
  overTray: boolean
}

export type DropResult = Omit<DragState, 'overId'> & { targetId: PersonId | null }

const DRAG_THRESHOLD = 5

function hitTest(x: number, y: number, personId: PersonId) {
  const element = document.elementFromPoint(x, y)
  const card = element?.closest<HTMLElement>('[data-drop-person-id]') ?? null
  const overId = card?.dataset.dropPersonId ?? null
  return {
    card: overId && overId !== personId ? card : null,
    overId: overId && overId !== personId ? overId : null,
    overCanvas: Boolean(element?.closest('[data-drop-canvas]')),
    overTray: Boolean(element?.closest('[data-drop-tray]')),
  }
}

export function useDragConnect(onDrop: (result: DropResult) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const onDropRef = useRef(onDrop)
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    onDropRef.current = onDrop
  })
  useEffect(() => () => cleanupRef.current?.(), [])

  const begin = useCallback((personId: PersonId, source: DragSource, startX: number, startY: number) => {
    cleanupRef.current?.()
    let started = false
    let current: DragState | null = null
    let highlighted: HTMLElement | null = null
    const setHighlight = (card: HTMLElement | null) => {
      if (highlighted === card) return
      highlighted?.classList.remove('is-drop-target')
      card?.classList.add('is-drop-target')
      highlighted = card
    }
    const suppressClick = (event: MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey, true)
      document.body.classList.remove('is-dragging-person')
      setHighlight(null)
      cleanupRef.current = null
      setDrag(null)
      if (started) {
        window.addEventListener('click', suppressClick, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener('click', suppressClick, true), 0)
      }
    }
    const onMove = (event: PointerEvent) => {
      if (!started && Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_THRESHOLD) return
      if (!started) document.body.classList.add('is-dragging-person')
      started = true
      event.preventDefault()
      const hit = hitTest(event.clientX, event.clientY, personId)
      setHighlight(hit.card)
      current = { personId, source, x: event.clientX, y: event.clientY, overId: hit.overId, overCanvas: hit.overCanvas, overTray: hit.overTray }
      setDrag(current)
    }
    const onUp = (event: PointerEvent) => {
      const wasStarted = started
      const last = current
      cleanup()
      if (!wasStarted || !last) return
      const hit = hitTest(event.clientX, event.clientY, personId)
      onDropRef.current({ personId, source, x: event.clientX, y: event.clientY, targetId: hit.overId, overCanvas: hit.overCanvas, overTray: hit.overTray })
    }
    const onCancel = () => {
      started = false
      cleanup()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey, true)
    cleanupRef.current = cleanup
  }, [])

  return { drag, begin }
}
