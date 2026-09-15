import type { ViewMode } from '../actions'

export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className="segmented-control" aria-label="Choose visualization">
      <button type="button" className={view === '2d' ? 'active' : ''} onClick={() => onChange('2d')}>2D</button>
      <button type="button" className={view === '3d' ? 'active' : ''} onClick={() => onChange('3d')}>3D</button>
    </div>
  )
}
