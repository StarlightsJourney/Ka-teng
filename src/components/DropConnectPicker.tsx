import { useEffect, useRef, useState } from 'react'
import { canConnectKin, fullName, kinLabels, kinOrder, parentIdsOf, siblingOptions, type Person, type PersonMap, type RelationshipType, type SiblingKind } from '../element'

type DropConnectPickerProps = {
  dragged: Person
  target: Person
  people: PersonMap
  x: number
  y: number
  onChoose: (kin: RelationshipType) => void
  onChooseSibling: (kind: SiblingKind) => void
  onClose: () => void
}

const icons: Record<RelationshipType | 'sibling', string> = { parent: '↑', spouse: '↔', child: '↓', sibling: '⇄' }

function namesOf(people: PersonMap, ids: string[]): string {
  const names = ids.map((id) => people.get(id)).filter((person): person is Person => Boolean(person)).map((person) => person.name.first || fullName(person))
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : names[0] ?? ''
}

export function DropConnectPicker({ dragged, target, people, x, y, onChoose, onChooseSibling, onClose }: DropConnectPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [askingSibling, setAskingSibling] = useState(false)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [askingSibling])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && ref.current?.contains(event.target)) return
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, [onClose])
  const width = Math.min(askingSibling ? 340 : 360, window.innerWidth - 24)
  const left = Math.max(12, Math.min(x - width / 2, window.innerWidth - width - 12))
  const top = Math.max(12, Math.min(y + 14, window.innerHeight - (askingSibling ? 300 : 190)))
  const draggedName = fullName(dragged)
  const targetName = fullName(target)
  const sibling = siblingOptions(people, dragged.id, target.id)
  const targetParents = parentIdsOf(people, target.id)
  const draggedParents = parentIdsOf(people, dragged.id)
  const sameParentsHint = !sibling.sameParents
    ? 'They each already have their own parents'
    : targetParents.length
      ? `${dragged.name.first || draggedName} joins ${namesOf(people, targetParents)} as their child`
      : draggedParents.length
        ? `${target.name.first || targetName} joins ${namesOf(people, draggedParents)} as their child`
        : 'Linked as siblings — add their parents any time'
  return (
    <div ref={ref} className="drop-picker" role="dialog" aria-label={`Connect ${draggedName} to ${targetName}`} style={{ left, top, width }}>
      {askingSibling
        ? (
          <>
            <p className="drop-picker-title"><strong>{draggedName}</strong> and <strong>{targetName}</strong> are siblings.</p>
            <p className="drop-picker-question">Do they have the same parents?</p>
            <div className="drop-picker-choices">
              <button type="button" className="drop-picker-choice" disabled={!sibling.sameParents} onClick={() => onChooseSibling('full')}>
                <strong>Yes, same parents</strong>
                <span>{sameParentsHint}</span>
              </button>
              <button type="button" className="drop-picker-choice" disabled={!sibling.stepSibling} onClick={() => onChooseSibling('step')}>
                <strong>No, step-siblings</strong>
                <span>Shown with a dashed line; nobody’s parents change</span>
              </button>
            </div>
            <button type="button" className="drop-picker-cancel" onClick={() => setAskingSibling(false)}>Back</button>
          </>
        )
        : (
          <>
            <p className="drop-picker-title"><strong>{draggedName}</strong> is <strong>{targetName}</strong>’s…</p>
            <div className="drop-picker-options">
              {kinOrder.map((kin) => {
                const allowed = canConnectKin(people, dragged.id, target.id, kin)
                return (
                  <button key={kin} type="button" className="drop-picker-option" disabled={!allowed} title={allowed ? undefined : 'Not possible — already linked or would create a cycle'} onClick={() => onChoose(kin)}>
                    <span aria-hidden="true">{icons[kin]}</span>{kinLabels[kin]}
                  </button>
                )
              })}
              <button type="button" className="drop-picker-option" disabled={!sibling.stepSibling} title={sibling.stepSibling ? undefined : 'Already related'} onClick={() => setAskingSibling(true)}>
                <span aria-hidden="true">{icons.sibling}</span>Sibling
              </button>
            </div>
            <button type="button" className="drop-picker-cancel" onClick={onClose}>Cancel</button>
          </>
        )}
    </div>
  )
}
