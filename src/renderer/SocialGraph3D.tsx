import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D, { type ForceGraphMethods, type GraphData } from 'react-force-graph-3d'
import { forceRadial } from 'd3-force-3d'
import * as THREE from 'three'
import type { Friend, FriendLink } from '../element'
import { friendName } from '../element'
import { neighbours, ringRadius } from '../scene'
import type { ThemeMode } from '../theme'

type SocialGraph3DProps = {
  friends: Friend[]
  links: FriendLink[]
  selectedId: string | null
  theme: ThemeMode
  onSelect: (id: string) => void
}

type GraphNode = Friend & { x?: number; y?: number; z?: number; vx?: number; vy?: number; vz?: number; fx?: number; fy?: number; fz?: number }
type GraphLink = Omit<FriendLink, 'source' | 'target'> & { source: string | GraphNode; target: string | GraphNode }
type GraphRef = {
  d3Force: (name: string, force?: unknown) => unknown
  d3ReheatSimulation: () => void
  cameraPosition: (position?: { x: number; y: number; z: number }, lookAt?: { x: number; y: number; z: number }, ms?: number) => void
  zoomToFit: (ms?: number, padding?: number) => void
  scene: () => THREE.Scene
  controls: () => { autoRotate: boolean; autoRotateSpeed: number }
  pauseAnimation: () => void
  resumeAnimation: () => void
  refresh: () => void
}

type OrbitForce = ((alpha: number) => void) & {
  initialize: (nodes: GraphNode[]) => void
}

function createOrbitForce(speed: number): OrbitForce {
  let simulationNodes: GraphNode[] = []
  const force = (() => {
    for (const node of simulationNodes) {
      if (node.id === 'me' || node.x === undefined || node.z === undefined) continue
      Object.assign(node, {
        vx: (node.vx ?? 0) - node.z * speed,
        vz: (node.vz ?? 0) + node.x * speed,
      })
    }
  }) as unknown as OrbitForce
  force.initialize = (nextNodes) => {
    simulationNodes = nextNodes
  }
  return force
}

function supportsWebGL(): boolean {
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
}

const contextColors: Record<string, string> = {
  work: '#8B9DC3',
  university: '#B49FCC',
  travel: '#7FAFA4',
  childhood: '#D6A77A',
  online: '#9D9AC4',
  'family friend': '#C58FA0',
  other: '#9A9A9A',
}
function initials(friend: Friend): string {
  return `${friend.firstName[0] ?? ''}${friend.lastName[0] ?? ''}`.toUpperCase()
}

function nodeTexture(friend: Friend): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.beginPath()
  context.arc(64, 64, 64, 0, Math.PI * 2)
  context.clip()
  context.fillStyle = contextColors[friend.contexts[0] ?? 'other'] ?? contextColors.other
  context.fillRect(0, 0, 128, 128)
  context.fillStyle = '#ffffff'
  context.font = '600 42px Inter, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(initials(friend), 64, 64)
  return new THREE.CanvasTexture(canvas)
}

export function SocialGraph3D({ friends, links, selectedId, theme, onSelect }: SocialGraph3DProps) {
  const graphRef = useRef<GraphRef | ForceGraphMethods<GraphNode, GraphLink> | null>(null)
  const graphSelectionRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [webglAvailable] = useState(() => typeof document === 'undefined' || supportsWebGL())
  const friendMap = useMemo(() => new Map(friends.map((friend) => [friend.id, friend])), [friends])
  const nodes = useMemo<GraphNode[]>(() => [
    { id: 'me', firstName: 'You', lastName: '', circle: 5, contexts: [], fx: 0, fy: 0, fz: 0 },
    ...friends,
  ], [friends])
  const graphData = useMemo<GraphData<GraphNode, GraphLink>>(() => ({ nodes, links: links as GraphLink[] }), [links, nodes])
  const activeIds = useMemo(() => {
    const focusId = hoveredId ?? selectedId
    if (!focusId) return null
    return new Set([focusId, ...neighbours(links, focusId)])
  }, [hoveredId, links, selectedId])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const controls = graph.controls() as { autoRotate: boolean; autoRotateSpeed: number }
    controls.autoRotate = !paused
    controls.autoRotateSpeed = 0.6
    const restartTimer = window.setTimeout(() => {
      graph.pauseAnimation()
      graph.d3Force('radial', forceRadial(
        (node) => node.id === 'me' ? 0 : ringRadius[node.circle as keyof typeof ringRadius],
        0,
        0,
        0,
      ))
      graph.d3Force('orbit', createOrbitForce(0.0007))
      if (!paused) {
        graph.resumeAnimation()
        graph.d3ReheatSimulation()
      }
    }, 50)
    const fitTimer = window.setTimeout(() => graph.zoomToFit(400, 80), 1500)
    return () => {
      window.clearTimeout(restartTimer)
      window.clearTimeout(fitTimer)
    }
  }, [paused, theme])

  useEffect(() => {
    if (!selectedId || graphSelectionRef.current) {
      graphSelectionRef.current = false
      return
    }
    const graph = graphRef.current
    if (!graph) return
    graph.cameraPosition({ x: 0, y: 0, z: 1200 }, { x: 0, y: 0, z: 0 }, 0)
    const fitTimer = window.setTimeout(() => graph.zoomToFit(500, 80), 300)
    return () => window.clearTimeout(fitTimer)
  }, [selectedId])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const scene = graph.scene()
    const group = new THREE.Group()
    for (const radius of Object.values(ringRadius)) {
      const geometry = new THREE.RingGeometry(radius - 0.7, radius, 128)
      const material = new THREE.MeshBasicMaterial({ color: theme === 'dark' ? '#ffffff' : '#27303a', transparent: true, opacity: theme === 'dark' ? 0.12 : 0.1, side: THREE.DoubleSide })
      const ring = new THREE.Mesh(geometry, material)
      ring.rotation.x = Math.PI / 2
      group.add(ring)
    }
    scene.add(group)
    return () => { scene.remove(group); group.traverse((child: THREE.Object3D) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose() } }) }
  }, [theme])

  const nodeThreeObject = (node: GraphNode) => {
    const friend = friendMap.get(node.id) ?? node
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nodeTexture(friend),
      transparent: true,
      depthWrite: false,
      opacity: activeIds && !activeIds.has(node.id) ? 0.18 : 1,
    }))
    const size = node.id === 'me' ? 30 : Math.max(10, 28 - Math.log2(node.circle) * 3)
    sprite.scale.set(size, size, 1)
    return sprite
  }

  if (!webglAvailable) {
    return <div className="social-graph"><p className="social-webgl-message">Peng-yu needs WebGL</p></div>
  }

  return <div className={`social-graph ${theme === 'dark' ? 'social-dark' : 'social-light'}`}>
    <ForceGraph3D
      ref={graphRef as never}
      graphData={graphData}
      backgroundColor={theme === 'dark' ? '#07080A' : '#F5F5F7'}
      nodeThreeObject={nodeThreeObject}
      nodeThreeObjectExtend={false}
      nodeLabel={(node) => friendName((friendMap.get(node.id as string) ?? node) as Friend)}
      linkColor={(link) => contextColors[(link as GraphLink).context ?? 'other'] ?? contextColors.other}
      linkOpacity={activeIds ? 0.08 : 0.28}
      linkWidth={(link) => { const l = link as GraphLink; const source = typeof l.source === 'string' ? l.source : l.source.id; const target = typeof l.target === 'string' ? l.target : l.target.id; return activeIds && !activeIds.has(source) && !activeIds.has(target) ? 0.3 : 1 }}
      onNodeClick={(node) => { const point = node as GraphNode; const id = point.id; if (id !== 'me') { graphSelectionRef.current = true; onSelect(id); graphRef.current?.cameraPosition({ x: (point.x ?? 0) * 1.8, y: (point.y ?? 0) * 1.8, z: (point.z ?? 0) * 1.8 + 180 }, { x: point.x ?? 0, y: point.y ?? 0, z: point.z ?? 0 }, 1000) } }}
      onNodeHover={(node) => { setHoveredId((node as GraphNode | null)?.id ?? null); graphRef.current?.refresh() }}
      d3AlphaDecay={0}
      d3VelocityDecay={0.3}
      warmupTicks={80}
      cooldownTicks={Infinity}
      enableNavigationControls
      onEngineStop={() => graphRef.current?.zoomToFit(400, 80)}
    />
    <button type="button" className="social-pause" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Resume graph' : 'Pause graph'}>{paused ? '▶' : 'Ⅱ'}</button>
  </div>
}
