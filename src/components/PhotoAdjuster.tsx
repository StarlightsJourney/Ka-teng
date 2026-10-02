import { useRef } from 'react'
import { DEFAULT_AVATAR_FOCUS, avatarImageStyle, clampAvatarFocus, type AvatarFocus } from '../element'

type PhotoAdjusterProps = {
  src: string
  value: AvatarFocus | undefined
  onChange: (value: AvatarFocus) => void
  onDone: () => void
}

export function PhotoAdjuster({ src, value, onChange, onDone }: PhotoAdjusterProps) {
  const focus = clampAvatarFocus(value)
  const dragRef = useRef<{ x: number; y: number; start: AvatarFocus; width: number; height: number } | null>(null)
  const style = avatarImageStyle(focus)
  return (
    <div className="photo-adjuster">
      <div className="photo-adjuster-previews">
        <div
          className="photo-adjuster-frame"
          role="slider"
          tabIndex={0}
          aria-label="Photo position — drag or use arrow keys"
          aria-valuetext={`${Math.round(focus.x)}% across, ${Math.round(focus.y)}% down`}
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            const rect = event.currentTarget.getBoundingClientRect()
            dragRef.current = { x: event.clientX, y: event.clientY, start: focus, width: rect.width, height: rect.height }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag) return
            const dx = (event.clientX - drag.x) / drag.width * 100 / drag.start.zoom
            const dy = (event.clientY - drag.y) / drag.height * 100 / drag.start.zoom
            onChange(clampAvatarFocus({ ...drag.start, x: drag.start.x - dx * 1.6, y: drag.start.y - dy * 1.6 }))
          }}
          onPointerUp={() => { dragRef.current = null }}
          onPointerCancel={() => { dragRef.current = null }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 10 : 3
            const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
            const move = moves[event.key]
            if (!move) return
            event.preventDefault()
            onChange(clampAvatarFocus({ ...focus, x: focus.x + move[0], y: focus.y + move[1] }))
          }}
        >
          <img src={src} alt="" draggable={false} style={style} />
          <span className="photo-adjuster-grid" aria-hidden="true" />
        </div>
        <div className="photo-adjuster-circle" aria-hidden="true">
          <img src={src} alt="" draggable={false} style={style} />
        </div>
      </div>
      <label className="photo-adjuster-zoom">
        <span className="field-label">Zoom</span>
        <input type="range" min={1} max={3} step={0.05} value={focus.zoom} onChange={(event) => onChange({ ...focus, zoom: Number(event.target.value) })} />
      </label>
      <div className="photo-adjuster-actions">
        <button type="button" className="btn-link" onClick={() => onChange(DEFAULT_AVATAR_FOCUS)}>Reset</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
