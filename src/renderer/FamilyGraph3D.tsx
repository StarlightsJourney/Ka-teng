import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D, { type ForceGraphMethods, type GraphData } from 'react-force-graph-3d'
import * as THREE from 'three'
import type { ThemeMode } from '../theme'
import type { FamilyGraph, GraphLink, GraphNode } from '../scene'

const palette = ['#7C91B8', '#A889B8', '#C28E76', '#719A8C', '#A8A06C', '#6B9AA7', '#B07B9A', '#879C73']

type FamilyGraph3DProps = {
  graph: FamilyGraph
  selectedId: string | null
  layered: boolean
  theme: ThemeMode
  onSelect: (personId: string) => void
}

function clusterForce(nodes: GraphNode[]) {
  let initialized = nodes
  const force = (alpha: number) => {
    const centroids = new Map<string, { x: number; y: number; z: number; count: number }>()
    for (const node of initialized) {
      const centroid = centroids.get(node.group) ?? { x: 0, y: 0, z: 0, count: 0 }
      centroid.x += node.x ?? 0
      centroid.y += node.y ?? 0
      centroid.z += node.z ?? 0
      centroid.count += 1
      centroids.set(node.group, centroid)
    }
    for (const node of initialized) {
      const centroid = centroids.get(node.group)
      if (!centroid) continue
      node.vx = (node.vx ?? 0) + ((centroid.x / centroid.count) - (node.x ?? 0)) * alpha * 0.08
      node.vy = (node.vy ?? 0) + ((centroid.y / centroid.count) - (node.y ?? 0)) * alpha * 0.08
      node.vz = (node.vz ?? 0) + ((centroid.z / centroid.count) - (node.z ?? 0)) * alpha * 0.08
    }
  }
  force.initialize = (nextNodes: GraphNode[]) => { initialized = nextNodes }
  return force
}

function readSceneColors(theme: ThemeMode) {
  const styles = getComputedStyle(document.documentElement)
  return {
    background: styles.getPropertyValue('--bg').trim() || (theme === 'dark' ? '#0B0B0C' : '#F7F6F3'),
    line: styles.getPropertyValue('--line').trim() || '#9A9AA0',
    ink: styles.getPropertyValue('--text').trim() || '#FFFFFF',
  }
}

export function FamilyGraph3D({ graph, selectedId, layered, theme, onSelect }: FamilyGraph3DProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>()
  const previousSelectedIdRef = useRef(selectedId)
  const fittedLayerRef = useRef<boolean | null>(null)
  const [sceneColors, setSceneColors] = useState(() => readSceneColors(theme))
  const graphData = useMemo<GraphData<GraphNode, GraphLink>>(
    () => ({ nodes: graph.nodes, links: graph.links }),
    [graph],
  )
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes])
  const groupColorIndexes = useMemo(() => {
    const groups = [...new Set(graph.nodes.map((node) => node.group))]
    return new Map(groups.map((group, index) => [group, index % palette.length]))
  }, [graph.nodes])

  useEffect(() => {
    const observer = new MutationObserver(() => setSceneColors(readSceneColors(theme)))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [theme])

  useEffect(() => {
    const forceGraph = fgRef.current
    if (!forceGraph) return
    forceGraph.d3Force('cluster', clusterForce(graph.nodes))
  }, [graph])

  useEffect(() => {
    const previousSelectedId = previousSelectedIdRef.current
    previousSelectedIdRef.current = selectedId
    if (previousSelectedId === selectedId) return
    const node = selectedId ? nodeById.get(selectedId) : undefined
    if (!node || !fgRef.current) return
    const camera = fgRef.current.camera()
    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    const target = new THREE.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0)
    const position = target.clone().sub(direction.multiplyScalar(120))
    fgRef.current.cameraPosition(
      { x: position.x, y: position.y, z: position.z },
      { x: target.x, y: target.y, z: target.z },
      1000,
    )
  }, [nodeById, selectedId])

  const handleEngineStop = () => {
    const forceGraph = fgRef.current
    if (!forceGraph || fittedLayerRef.current === layered) return
    fittedLayerRef.current = layered
    forceGraph.zoomToFit(800, 40)
  }

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      backgroundColor={sceneColors.background}
      dagMode={layered ? 'td' : undefined}
      dagLevelDistance={120}
      nodeLabel={(node) => node.name}
      nodeColor={(node) => palette[groupColorIndexes.get(node.group) ?? 0]}
      nodeVal={(node) => node.id === selectedId ? 2.4 : 1.25}
      nodeThreeObject={(node) => {
        const color = palette[groupColorIndexes.get(node.group) ?? 0]
        const selected = node.id === selectedId
        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: selected ? color : '#000000',
          emissiveIntensity: selected ? 0.55 : 0,
          roughness: 0.78,
        })
        return new THREE.Mesh(new THREE.SphereGeometry(selected ? 5.5 : 4, 16, 12), material)
      }}
      linkColor={(link) => link.kind === 'spouse' ? sceneColors.line : sceneColors.ink}
      linkWidth={(link) => link.kind === 'spouse' ? 0.6 : 1.1}
      linkDirectionalArrowLength={(link) => link.kind === 'parent' ? 5 : 0}
      linkDirectionalArrowRelPos={0.9}
      linkMaterial={(link) => link.kind === 'spouse'
        ? new THREE.LineDashedMaterial({ color: sceneColors.line, dashSize: 4, gapSize: 3 })
        : new THREE.LineBasicMaterial({ color: sceneColors.ink })}
      onNodeClick={(node) => onSelect(node.id as string)}
      onEngineStop={handleEngineStop}
      warmupTicks={80}
      cooldownTicks={180}
      enableNavigationControls
    />
  )
}
