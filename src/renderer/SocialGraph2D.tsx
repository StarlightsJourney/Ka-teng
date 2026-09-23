import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Friend, FriendCircle, FriendLink } from '../element'
import { neighbours, ringRadius } from '../scene'
import type { ThemeMode } from '../theme'

export type SocialGraph2DProps = {
  friends: Friend[]
  links: FriendLink[]
  selectedId: string | null
  theme: ThemeMode
  onSelect: (id: string) => void
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  firstName: string
  lastName: string
  circle: FriendCircle
  contexts: string[]
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  context?: string
}

const contextPalette: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    work: '#4A7FD6',
    university: '#D46A8A',
    travel: '#0087FF',
    childhood: '#C8A12B',
    online: '#030302',
    'family friend': '#D46A8A',
    other: '#9C9C9D',
  },
  dark: {
    work: '#6FA1FF',
    university: '#F08FB0',
    travel: '#4DB8FF',
    childhood: '#FDE99B',
    online: '#FF6363',
    'family friend': '#F08FB0',
    other: '#9C9C9D',
  },
}

function nodeRadius(circle: FriendCircle): number {
  return ({ 5: 22, 15: 18, 50: 14, 150: 11, 500: 8 } as const)[circle]
}

function nodeInitials(node: Pick<Friend, 'firstName' | 'lastName'>): string {
  return `${node.firstName[0] ?? ''}${node.lastName[0] ?? ''}`.toUpperCase()
}

function nodeContextColor(node: Pick<Friend, 'contexts'>, theme: ThemeMode): string {
  return contextPalette[theme][node.contexts[0] ?? 'other'] ?? contextPalette[theme].other
}

function linkNodeId(link: GraphLink, end: 'source' | 'target'): string {
  const value = link[end]
  return typeof value === 'string' ? value : (value as GraphNode).id
}

function linkNodeCoord(link: GraphLink, end: 'source' | 'target', axis: 'x' | 'y'): number {
  const value = link[end]
  return typeof value === 'string' ? 0 : ((value as GraphNode)[axis] ?? 0)
}

export function SocialGraph2D({ friends, links, selectedId, theme, onSelect }: SocialGraph2DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const nodes = useMemo<GraphNode[]>(() => {
    const ringMembers = new Map<number, Friend[]>()
    friends.forEach((friend) => {
      ringMembers.set(friend.circle, [...(ringMembers.get(friend.circle) ?? []), friend])
    })
    ringMembers.forEach((members) => members.sort((a, b) => a.id.localeCompare(b.id)))
    return [
      { id: 'me', firstName: 'You', lastName: '', circle: 5, contexts: [], x: 0, y: 0 },
      ...friends.map((friend) => {
        const members = ringMembers.get(friend.circle) ?? [friend]
        const index = members.indexOf(friend)
        const angle = (index / Math.max(1, members.length)) * Math.PI * 2
        const radius = ringRadius[friend.circle]
        return {
          id: friend.id,
          firstName: friend.firstName,
          lastName: friend.lastName,
          circle: friend.circle,
          contexts: friend.contexts,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        }
      }),
    ]
  }, [friends])

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const graphLinks = useMemo<GraphLink[]>(() => {
    const result: GraphLink[] = []
    for (const link of links) {
      const source = nodeById.get(link.source)
      const target = nodeById.get(link.target)
      if (source && target) result.push({ source, target, context: link.context })
    }
    return result
  }, [links, nodeById])

  const activeIds = useMemo(() => {
    const focus = hoveredId ?? selectedId
    if (!focus) return null
    return new Set([focus, ...neighbours(links, focus)])
  }, [hoveredId, links, selectedId])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || size.width === 0 || size.height === 0) return
    const svg = d3.select(svgRef.current)
    let root = svg.select<SVGGElement>('g.graph-root')
    if (root.empty()) {
      root = svg.append('g').attr('class', 'graph-root')
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 3]).on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
    })
    zoomRef.current = zoom
    svg.call(zoom)

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force('center', d3.forceCenter(size.width / 2, size.height / 2))
      .force(
        'radial',
        d3
          .forceRadial((node) => {
            const n = node as GraphNode
            return n.id === 'me' ? 0 : ringRadius[n.circle]
          }, size.width / 2, size.height / 2)
          .strength(0.6),
      )
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphLinks)
          .id((node) => node.id)
          .distance((link) => (link.context === 'family friend' ? 120 : 80))
          .strength(0.2),
      )
      .force('collide', d3.forceCollide<GraphNode>((node) => nodeRadius(node.circle) + 6).strength(0.7))
      .force('charge', d3.forceManyBody<GraphNode>().strength((node) => (node.id === 'me' ? -400 : -80)))
      .alphaDecay(0.02)
      .alphaMin(0.001)

    const linkSel = root
      .selectAll<SVGLineElement, GraphLink>('line.link')
      .data(graphLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', (link) => contextPalette[theme][link.context ?? 'other'] ?? contextPalette[theme].other)
      .attr('stroke-opacity', (link) => {
        if (!activeIds) return 0.25
        return activeIds.has(linkNodeId(link, 'source')) || activeIds.has(linkNodeId(link, 'target')) ? 0.85 : 0.08
      })
      .attr('stroke-width', (link) => {
        if (!activeIds) return 1
        return activeIds.has(linkNodeId(link, 'source')) || activeIds.has(linkNodeId(link, 'target')) ? 2.5 : 0.5
      })

    const nodeSel = root
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', (node) => (node.id === 'me' ? 'default' : 'pointer'))
      .on('mouseenter', (_event, node) => setHoveredId(node.id))
      .on('mouseleave', () => setHoveredId(null))
      .on('click', (_event, node) => {
        if (node.id !== 'me') onSelect(node.id)
      })

    nodeSel
      .append('circle')
      .attr('r', (node) => nodeRadius(node.circle))
      .attr('fill', (node) => (node.id === 'me' ? (theme === 'dark' ? '#FF6363' : '#030302') : nodeContextColor(node, theme)))
      .attr('stroke', theme === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)')
      .attr('stroke-width', 2)
      .attr('opacity', (node) => {
        if (!activeIds) return 1
        return activeIds.has(node.id) ? 1 : 0.25
      })

    nodeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#ffffff')
      .attr('font-size', (node) => `${Math.max(8, nodeRadius(node.circle) - 4)}px`)
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .text((node) => (node.id === 'me' ? 'Y' : nodeInitials(node)))

    nodeSel
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (node) => nodeRadius(node.circle) + 12)
      .attr('fill', theme === 'dark' ? '#FFFFFF' : '#030302')
      .attr('font-size', '11px')
      .attr('font-weight', 500)
      .attr('opacity', (node) => {
        if (node.id === 'me') return 1
        if (!activeIds) return node.circle <= 15 ? 0.75 : 0
        return activeIds.has(node.id) ? 1 : 0
      })
      .attr('pointer-events', 'none')
      .text((node) => node.firstName)

    const tick = () => {
      linkSel
        .attr('x1', (link) => linkNodeCoord(link, 'source', 'x'))
        .attr('y1', (link) => linkNodeCoord(link, 'source', 'y'))
        .attr('x2', (link) => linkNodeCoord(link, 'target', 'x'))
        .attr('y2', (link) => linkNodeCoord(link, 'target', 'y'))
      nodeSel.attr('transform', (node) => `translate(${node.x ?? 0},${node.y ?? 0})`)
    }
    simulation.on('tick', tick)

    return () => {
      simulation.stop()
      svg.on('.zoom', null)
    }
  }, [activeIds, graphLinks, nodes, onSelect, size.height, size.width, theme])

  useEffect(() => {
    if (!svgRef.current || size.width === 0 || size.height === 0) return
    const svg = d3.select(svgRef.current)
    const zoom = zoomRef.current
    if (!zoom) return
    svg.call(zoom.transform, d3.zoomIdentity.translate(size.width / 2, size.height / 2).scale(1))
  }, [size.height, size.width])

  return (
    <div ref={containerRef} className="social-graph">
      <svg ref={svgRef} className="social-graph-svg" width={size.width} height={size.height} role="img" aria-label="Peng-yu social graph">
        <g className="graph-root" />
      </svg>
      <p className="social-hint">Drag to pan · scroll to zoom · click a friend</p>
    </div>
  )
}
