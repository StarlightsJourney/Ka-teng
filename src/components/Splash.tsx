import { useEffect } from 'react'

export type SplashMode = 'launch' | 'return'

const DURATION: Record<SplashMode, number> = { launch: 1700, return: 1100 }

export function Splash({ mode, onDone }: { mode: SplashMode; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION[mode])
    return () => window.clearTimeout(timer)
  }, [mode, onDone])
  return (
    <div className={`splash splash-${mode}`} role="status" aria-label={mode === 'launch' ? 'Loading Ka-teng' : 'Welcome back'}>
      <div className="splash-stage" aria-hidden="true">
        <span className="splash-drop" />
        <span className="splash-ripple" />
        <span className="splash-ripple" />
        <span className="splash-ripple" />
      </div>
      <div className="splash-copy">
        <span className="splash-wordmark">Ka-teng</span>
        <span className="splash-tagline">{mode === 'launch' ? 'Your family, in one place' : 'Welcome back'}</span>
      </div>
    </div>
  )
}
