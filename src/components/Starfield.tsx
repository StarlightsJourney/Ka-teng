import { useEffect, useRef } from 'react'

type FlyingStar = { x: number; y: number; z: number; pz: number; hue: number }
type Flare = { x: number; y: number; size: number; phase: number; speed: number }
type Meteor = { x: number; y: number; vx: number; vy: number; age: number; duration: number }

const FRAME_MS = 1000 / 30
const DEPTH = 1600
const FOCAL = 360
const CRUISE = 64
const AREA_PER_STAR = 3600
const MIN_STARS = 90
const MAX_STARS = 460
const SPRING = 0.05
const METEOR_MIN_GAP = 8000
const METEOR_MAX_GAP = 16000

const random = (min: number, max: number) => min + Math.random() * (max - min)
const smooth = (value: number) => {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

function readVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function makeSprite(color: string, size: number, flare: boolean): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const context = sprite.getContext('2d')
  if (!context) return sprite
  const center = size / 2
  const gradient = context.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.08, color)
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0)')
  context.globalAlpha = 0.85
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  if (flare) {
    for (const [width, alpha] of [[1.2, 0.55], [0.6, 0.9]] as const) {
      context.globalAlpha = alpha
      const line = context.createLinearGradient(0, center, size, center)
      line.addColorStop(0, 'rgba(0, 0, 0, 0)')
      line.addColorStop(0.5, color)
      line.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = line
      context.fillRect(0, center - width / 2, size, width)
      const vertical = context.createLinearGradient(center, 0, center, size)
      vertical.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vertical.addColorStop(0.5, color)
      vertical.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = vertical
      context.fillRect(center - width / 2, size * 0.18, width, size * 0.64)
    }
  }
  return sprite
}

function paintBackdrop(width: number, height: number, ratio: number, star: string, nebulae: [string, string]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.scale(ratio, ratio)
  const clouds = [
    { x: 0.22, y: 0.3, r: 0.55, color: nebulae[0] },
    { x: 0.78, y: 0.68, r: 0.6, color: nebulae[1] },
    { x: 0.62, y: 0.18, r: 0.35, color: nebulae[0] },
    { x: 0.3, y: 0.85, r: 0.4, color: nebulae[1] },
  ]
  const span = Math.max(width, height)
  for (const cloud of clouds) {
    const gradient = context.createRadialGradient(cloud.x * width, cloud.y * height, 0, cloud.x * width, cloud.y * height, cloud.r * span)
    gradient.addColorStop(0, cloud.color)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }
  const angle = -0.42
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const band = span * 0.16
  context.fillStyle = star
  const dust = Math.round((width * height) / 900)
  for (let index = 0; index < dust; index += 1) {
    const along = random(-0.65, 0.65) * span * 1.4
    const across = (Math.random() + Math.random() + Math.random() - 1.5) * band
    const x = width / 2 + along * cos - across * sin
    const y = height / 2 + along * sin + across * cos
    context.globalAlpha = random(0.05, 0.32) * (1 - Math.abs(across) / (band * 1.6))
    context.fillRect(x, y, random(0.4, 1.1), random(0.4, 1.1))
  }
  const scattered = Math.round((width * height) / 2600)
  for (let index = 0; index < scattered; index += 1) {
    context.globalAlpha = random(0.08, 0.5)
    const radius = random(0.3, 0.9)
    context.beginPath()
    context.arc(random(0, width), random(0, height), radius, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1
  return canvas
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let width = 0
    let height = 0
    let ratio = 1
    let stars: FlyingStar[] = []
    let flares: Flare[] = []
    let meteor: Meteor | null = null
    let starColor = readVar('--star', 'rgba(255, 255, 255, .8)')
    let trails = readVar('--warp-trails', '1') !== '0'
    let nebulae: [string, string] = [readVar('--nebula-1', 'rgba(96, 108, 190, .16)'), readVar('--nebula-2', 'rgba(150, 90, 160, .12)')]
    let glow = makeSprite(starColor, 64, false)
    let flareSprite = makeSprite(starColor, 128, true)
    let backdrop: HTMLCanvasElement | null = null
    let frame = 0
    let last = performance.now()
    let clock = 0
    let nextMeteor = random(METEOR_MIN_GAP / 3, METEOR_MAX_GAP / 2) / 1000
    const pointer = { x: 0, y: 0 }
    const offset = { x: 0, y: 0 }

    const spawn = (anywhere: boolean): FlyingStar => {
      const spread = Math.max(width, height) * 1.3
      const z = anywhere ? random(40, DEPTH) : random(DEPTH * 0.8, DEPTH)
      return { x: random(-spread, spread), y: random(-spread, spread), z, pz: z, hue: Math.random() }
    }

    const resize = () => {
      ratio = Math.min(2, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = Math.max(MIN_STARS, Math.min(MAX_STARS, Math.round((width * height) / AREA_PER_STAR)))
      stars = Array.from({ length: count }, () => spawn(true))
      flares = Array.from({ length: width < 720 ? 3 : 5 }, () => ({ x: random(0.05, 0.95), y: random(0.05, 0.95), size: random(26, 54), phase: random(0, Math.PI * 2), speed: random(0.35, 0.8) }))
      backdrop = paintBackdrop(width, height, ratio, starColor, nebulae)
    }

    const step = (dt: number) => {
      clock += dt
      offset.x += (pointer.x - offset.x) * SPRING
      offset.y += (pointer.y - offset.y) * SPRING
      for (let index = 0; index < stars.length; index += 1) {
        const star = stars[index]
        star.pz = star.z
        star.z -= CRUISE * dt
        if (star.z < 20) stars[index] = spawn(false)
      }
      if (!meteor && clock >= nextMeteor) {
        const angle = random(0.35, 0.65)
        const speed = random(300, 440)
        meteor = { x: random(width * 0.05, width * 0.6), y: random(height * 0.02, height * 0.35), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, duration: random(1.2, 1.9) }
      }
      if (meteor) {
        meteor.age += dt
        meteor.x += meteor.vx * dt
        meteor.y += meteor.vy * dt
        if (meteor.age >= meteor.duration) {
          meteor = null
          nextMeteor = clock + random(METEOR_MIN_GAP, METEOR_MAX_GAP) / 1000
        }
      }
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      if (backdrop) {
        const drift = 14
        context.globalAlpha = 1
        context.drawImage(backdrop, -drift - offset.x * 10 + Math.sin(time / 60) * drift, -drift - offset.y * 10 + Math.cos(time / 75) * drift, width + drift * 2, height + drift * 2)
      }
      const cx = width / 2 - offset.x * 70
      const cy = height / 2 - offset.y * 70
      context.strokeStyle = starColor
      context.fillStyle = starColor
      context.lineCap = 'round'
      for (const star of stars) {
        const scale = FOCAL / star.z
        const x = cx + star.x * scale
        const y = cy + star.y * scale
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue
        const near = 1 - star.z / DEPTH
        const radius = 0.4 + near * near * 3.4
        const alpha = smooth(near * 1.6) * (0.75 + 0.25 * Math.sin(time * (1 + star.hue) + star.hue * 9))
        if (alpha < 0.02) continue
        const prevScale = FOCAL / star.pz
        const px = cx + star.x * prevScale
        const py = cy + star.y * prevScale
        const trail = Math.hypot(x - px, y - py)
        context.globalAlpha = alpha
        if (trails && trail > 1.2) {
          context.lineWidth = radius * 1.4
          context.globalAlpha = alpha * 0.55
          context.beginPath()
          context.moveTo(px - (x - px) * 2, py - (y - py) * 2)
          context.lineTo(x, y)
          context.stroke()
          context.globalAlpha = alpha
        }
        if (radius > 1.2) {
          const size = radius * 12
          context.drawImage(glow, x - size / 2, y - size / 2, size, size)
        }
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }
      for (const flare of flares) {
        const pulse = 0.7 + 0.3 * Math.sin(time * flare.speed + flare.phase)
        const size = flare.size * pulse
        context.globalAlpha = 0.55 * pulse
        context.drawImage(flareSprite, flare.x * width - offset.x * 30 - size / 2, flare.y * height - offset.y * 30 - size / 2, size, size)
      }
      if (meteor) {
        const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, meteor.age / meteor.duration)))
        const tailX = meteor.x - meteor.vx * 0.4
        const tailY = meteor.y - meteor.vy * 0.4
        const gradient = context.createLinearGradient(meteor.x, meteor.y, tailX, tailY)
        gradient.addColorStop(0, starColor)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        context.globalAlpha = envelope * 0.85
        context.strokeStyle = gradient
        context.lineWidth = 1.6
        context.beginPath()
        context.moveTo(meteor.x, meteor.y)
        context.lineTo(tailX, tailY)
        context.stroke()
        context.drawImage(glow, meteor.x - 10, meteor.y - 10, 20, 20)
      }
      context.globalAlpha = 1
    }

    const loop = (now: number) => {
      const elapsed = now - last
      if (elapsed >= FRAME_MS) {
        step(Math.min(0.1, elapsed / 1000))
        draw(now / 1000)
        last = now
      }
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      cancelAnimationFrame(frame)
      last = performance.now()
      if (reduceMotion?.matches || document.hidden) draw(last / 1000)
      else frame = requestAnimationFrame(loop)
    }
    const onResize = () => {
      resize()
      start()
    }
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      pointer.x = (event.clientX / Math.max(1, width) - 0.5) * 2
      pointer.y = (event.clientY / Math.max(1, height) - 0.5) * 2
    }
    const observer = new MutationObserver(() => {
      starColor = readVar('--star', starColor)
      trails = readVar('--warp-trails', '1') !== '0'
      nebulae = [readVar('--nebula-1', nebulae[0]), readVar('--nebula-2', nebulae[1])]
      glow = makeSprite(starColor, 64, false)
      flareSprite = makeSprite(starColor, 128, true)
      backdrop = paintBackdrop(width, height, ratio, starColor, nebulae)
      if (reduceMotion?.matches) draw(performance.now() / 1000)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    resize()
    start()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', start)
    reduceMotion?.addEventListener?.('change', start)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', start)
      reduceMotion?.removeEventListener?.('change', start)
    }
  }, [])
  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
}
