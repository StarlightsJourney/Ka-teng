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

function createOrbitForce(): OrbitForce {
  let simulationNodes: GraphNode[] = []
  const force = (() => {
    for (const node of simulationNodes) {
      if (node.id === 'me' || node.x === undefined || node.z === undefined) continue
      const radiusSquared = node.x ** 2 + node.z ** 2
      if (radiusSquared === 0) continue
      const radialVelocity = ((node.vx ?? 0) * node.x + (node.vz ?? 0) * node.z) / radiusSquared
      const radius = Math.sqrt(radiusSquared)
      const tangentialSpeed = 0.0012 * (80 / ringRadius[node.circle]) * radius
      Object.assign(node, {
        vx: (node.vx ?? 0) - radialVelocity * node.x - (node.z / radius) * tangentialSpeed,
        vy: 0,
        vz: (node.vz ?? 0) - radialVelocity * node.z + (node.x / radius) * tangentialSpeed,
      })
    }
  }) as unknown as OrbitForce
  force.initialize = (nextNodes) => {
    simulationNodes = nextNodes
  }
  return force
}

type ClusterForce = ((alpha: number) => void) & {
  initialize: (nodes: GraphNode[]) => void
}
type CollideForce = ((alpha: number) => void) & {
  initialize: (nodes: GraphNode[]) => void
}

function createClusterForce(strength: number): ClusterForce {
  let simulationNodes: GraphNode[] = []
  const force = ((alpha: number) => {
    const groups = new Map<string, GraphNode[]>()
    for (const node of simulationNodes) {
      if (node.id === 'me') continue
      const key = node.contexts[0] ?? 'other'
      groups.set(key, [...(groups.get(key) ?? []), node])
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue
      const centroid = group.reduce(
        (sum, node) => ({
          x: sum.x + (node.x ?? 0),
          z: sum.z + (node.z ?? 0),
        }),
        { x: 0, z: 0 },
      )
      centroid.x /= group.length
      centroid.z /= group.length
      for (const node of group) {
        Object.assign(node, {
          vx: (node.vx ?? 0) + (centroid.x - (node.x ?? 0)) * strength * alpha * 0.01,
          vy: 0,
          vz: (node.vz ?? 0) + (centroid.z - (node.z ?? 0)) * strength * alpha * 0.01,
        })
      }
    }
  }) as ClusterForce
  force.initialize = (nextNodes) => { simulationNodes = nextNodes }
  return force
}

function createCollideForce(): CollideForce {
  let simulationNodes: GraphNode[] = []
  const force = (() => {
    for (let index = 0; index < simulationNodes.length; index += 1) {
      const first = simulationNodes[index]
      if (first.id === 'me') continue
      for (let otherIndex = index + 1; otherIndex < simulationNodes.length; otherIndex += 1) {
        const second = simulationNodes[otherIndex]
        if (second.id === 'me') continue
        const dx = (second.x ?? 0) - (first.x ?? 0)
        const dz = (second.z ?? 0) - (first.z ?? 0)
        const distance = Math.hypot(dx, dz) || 0.001
        const minimum = nodeSize(first) / 2 + nodeSize(second) / 2 + 8
        if (distance >= minimum) continue
        const push = (minimum - distance) / distance * 0.5
        const x = dx * push
        const z = dz * push
        first.vx = (first.vx ?? 0) - x
        first.vz = (first.vz ?? 0) - z
        second.vx = (second.vx ?? 0) + x
        second.vz = (second.vz ?? 0) + z
      }
    }
  }) as unknown as CollideForce
  force.initialize = (nextNodes) => { simulationNodes = nextNodes }
  return force
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

function seededPosition(friend: Friend, contexts: string[]): { x: number; y: number; z: number } {
  const radius = ringRadius[friend.circle]
  const sector = (contexts.indexOf(friend.contexts[0] ?? 'other') + 0.5) * Math.PI * 2 / Math.max(1, contexts.length)
  const jitter = (hashSeed(`${friend.id}:angle`) - 0.5) * Math.PI * 2 / Math.max(1, contexts.length) * 0.45
  const theta = sector + jitter
  const radiusJitter = radius * (0.96 + hashSeed(`${friend.id}:radius`) * 0.08)
  return {
    x: radiusJitter * Math.cos(theta),
    y: 0,
    z: radiusJitter * Math.sin(theta),
  }
}

function focusCamera(graph: GraphRef | ForceGraphMethods<GraphNode, GraphLink>, node: GraphNode): void {
  const x = node.x ?? 0
  const y = node.y ?? 0
  const z = node.z ?? 0
  const distanceFromNode = 1000
  const distanceFromOrigin = Math.hypot(x, y, z)
  const direction = distanceFromOrigin === 0
    ? { x: 0, y: 0, z: 1 }
    : { x: x / distanceFromOrigin, y: y / distanceFromOrigin, z: z / distanceFromOrigin }
  graph.cameraPosition(
    {
      x: x + direction.x * distanceFromNode,
      y: y + direction.y * distanceFromNode,
      z: z + direction.z * distanceFromNode,
    },
    { x, y, z },
    1000,
  )
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

function nodeSize(node: GraphNode): number {
  return node.id === 'me' ? 48 : ({ 5: 40, 15: 34, 50: 28, 150: 22, 500: 16 }[node.circle] ?? 20)
}

function nodeTexture(friend: Friend, showLabel: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 320
  const context = canvas.getContext('2d')!
  context.save()
  context.beginPath()
  context.arc(128, 128, 120, 0, Math.PI * 2)
  context.clip()
  context.fillStyle = contextColors[friend.contexts[0] ?? 'other'] ?? contextColors.other
  context.fillRect(8, 8, 240, 240)
  context.strokeStyle = '#344054'
  context.lineWidth = 5
  context.stroke()
  context.fillStyle = '#ffffff'
  context.font = '600 42px Inter, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(initials(friend), 128, 128)
  context.restore()
  if (showLabel) {
    context.font = '600 24px Inter, sans-serif'
    context.fillText(friend.firstName, 128, 285)
  }
  return new THREE.CanvasTexture(canvas)
}

export function SocialGraph3D({ friends, links, selectedId, theme, onSelect }: SocialGraph3DProps) {
  const graphRef = useRef<GraphRef | ForceGraphMethods<GraphNode, GraphLink> | null>(null)
  const graphSelectionRef = useRef(false)
  const cameraInitializedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [webglAvailable] = useState(() => typeof document === 'undefined' || supportsWebGL())
  const friendMap = useMemo(() => new Map(friends.map((friend) => [friend.id, friend])), [friends])
  const contexts = useMemo(
    () => [...new Set(friends.flatMap((friend) => friend.contexts.map((context) => context || 'other')))].sort(),
    [friends],
  )
  const nodes = useMemo<GraphNode[]>(() => [
    { id: 'me', firstName: 'You', lastName: '', circle: 5, contexts: [], fx: 0, fy: 0, fz: 0 },
    ...friends.map((friend) => ({ ...friend, ...seededPosition(friend, contexts), fy: 0 })),
  ], [contexts, friends])
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
      const radial = forceRadial(
        (node) => node.id === 'me' ? 0 : ringRadius[node.circle as keyof typeof ringRadius],
        0,
        0,
        0,
      ) as typeof forceRadial extends (...args: never[]) => infer Result ? Result & { strength?: (value: number) => Result } : never
      radial.strength?.(0.9)
      graph.d3Force('center', null)
      graph.d3Force('radial', radial)
      graph.d3Force('orbit', createOrbitForce())
      graph.d3Force('cluster', createClusterForce(0.05))
      graph.d3Force('collide', createCollideForce())
      const charge = graph.d3Force('charge') as { strength?: (value: number) => void; distanceMax?: (value: number) => void } | undefined
      charge?.strength?.(-40)
      charge?.distanceMax?.(700)
      const link = graph.d3Force('link') as { distance?: (value: number) => void; strength?: (value: number) => void } | undefined
      link?.distance?.(60)
      link?.strength?.(0.3)
      if (!paused) {
        graph.resumeAnimation()
        graph.d3ReheatSimulation()
      }
    }, 50)
    const fitTimer = cameraInitializedRef.current
      ? undefined
      : window.setTimeout(() => {
        graph.zoomToFit(500, 80)
        graph.cameraPosition({ x: 0, y: 300, z: 1100 }, { x: 0, y: 0, z: 0 }, 0)
        cameraInitializedRef.current = true
      }, 700)
    return () => {
      window.clearTimeout(restartTimer)
      if (fitTimer !== undefined) window.clearTimeout(fitTimer)
    }
  }, [paused])

  useEffect(() => {
    if (!selectedId || graphSelectionRef.current) {
      graphSelectionRef.current = false
      return
    }
    const graph = graphRef.current
    const node = nodes.find((candidate) => candidate.id === selectedId)
    if (!graph || !node) return
    focusCamera(graph, node)
  }, [nodes, selectedId])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const scene = graph.scene()
    const group = new THREE.Group()
    for (const radius of Object.values(ringRadius)) {
      const geometry = new THREE.TorusGeometry(radius, 0.6, 8, 128)
      const material = new THREE.MeshBasicMaterial({ color: theme === 'dark' ? '#ffffff' : '#27303a', transparent: true, opacity: theme === 'dark' ? 0.25 : 0.35 })
      const ring = new THREE.Mesh(geometry, material)
      ring.rotation.x = Math.PI / 2
      group.add(ring)
    }
    scene.add(group)
    return () => { scene.remove(group); group.traverse((child: THREE.Object3D) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose() } }) }
  }, [theme])

  const nodeThreeObject = (node: GraphNode) => {
    const friend = friendMap.get(node.id) ?? node
    const showLabel = node.id === 'me' || node.circle <= 50 || hoveredId === node.id || selectedId === node.id
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nodeTexture(friend, showLabel),
      transparent: true,
      depthWrite: false,
      opacity: activeIds && !activeIds.has(node.id) ? 0.25 : 1,
    }))
    const size = nodeSize(node)
    sprite.scale.set(size, size * 1.25, 1)
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
      linkOpacity={((link: GraphLink) => {
        if (!activeIds) return theme === 'dark' ? 0.5 : 0.6
        const candidate = link as GraphLink
        const source = typeof candidate.source === 'string' ? candidate.source : candidate.source.id
        const target = typeof candidate.target === 'string' ? candidate.target : candidate.target.id
        return activeIds.has(source) || activeIds.has(target) ? 1 : 0.12
      }) as unknown as number}
      linkWidth={(link) => { const l = link as GraphLink; const source = typeof l.source === 'string' ? l.source : l.source.id; const target = typeof l.target === 'string' ? l.target : l.target.id; return activeIds && !activeIds.has(source) && !activeIds.has(target) ? 0.8 : activeIds ? 2.5 : 1.6 }}
      onNodeClick={(node) => { const point = node as GraphNode; const id = point.id; if (id !== 'me') { graphSelectionRef.current = true; onSelect(id); if (graphRef.current) focusCamera(graphRef.current, point) } }}
      onNodeHover={(node) => { setHoveredId((node as GraphNode | null)?.id ?? null); graphRef.current?.refresh() }}
      d3AlphaDecay={0}
      d3AlphaMin={0}
      d3VelocityDecay={0.4}
      warmupTicks={80}
      cooldownTicks={Infinity}
      enableNavigationControls
    />
    <button type="button" className="social-pause" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Resume graph' : 'Pause graph'}>{paused ? '▶' : 'Ⅱ'}</button>
  </div>
}
