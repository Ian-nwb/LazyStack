import React from 'react'
import { StackTopology, TopologyEdge, TopologyNode, TopologyNodeKind, TopologyZone } from '../../utils/stackTopology'
import { layoutColumns, routeEdges } from './layout'

export interface DiagramColumn {
  title: string
  zone?: TopologyZone
  ids: string[]
}

interface DiagramSvgProps {
  topology: StackTopology
  columns: DiagramColumn[]
  edges: TopologyEdge[]
  nodeLines: (node: TopologyNode) => string[]
  zoneTitles?: Record<TopologyZone, string>
  ariaLabel: string
  svgRef?: React.Ref<SVGSVGElement>
}

const NODE_W = 208
const NODE_H = 68
const GAP_X = 104
const GAP_Y = 22
const MARGIN = 24
const TOP = 62

const TONE: Record<TopologyNodeKind, { stroke: string; dash?: string; fill: string }> = {
  'browser': { stroke: '#52525b', fill: '#18181b' },
  'gateway': { stroke: '#d4d4d8', fill: '#18181b' },
  'app-container': { stroke: '#a1a1aa', fill: '#18181b' },
  'host-app': { stroke: '#a1a1aa', dash: '5 3', fill: '#18181b' },
  'db-container': { stroke: '#71717a', fill: '#141416' },
  'sqlite-file': { stroke: '#71717a', dash: '5 3', fill: '#141416' },
  'cloud-service': { stroke: '#a1a1aa', dash: '2 3', fill: '#141416' },
  'admin-ui': { stroke: '#52525b', fill: '#101012' },
  'swagger-ui': { stroke: '#52525b', fill: '#101012' }
}

const fit = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

function edgeStyle(edge: TopologyEdge): { stroke: string; dash?: string; width: number } {
  if (edge.kind === 'db-connection') return { stroke: '#71717a', dash: edge.label === 'SDK' || edge.label === 'file' ? '2 3' : '5 4', width: 1.25 }
  if (edge.kind === 'admin-link') return { stroke: '#52525b', dash: '2 3', width: 1.25 }
  if (edge.via === 'host-gateway') return { stroke: '#a1a1aa', dash: '6 4', width: 1.5 }
  if (edge.kind === 'service-call') return { stroke: '#d4d4d8', width: 1.75 }
  if (edge.kind === 'proxy-route') return { stroke: '#a1a1aa', width: 1.5 }
  return { stroke: '#a1a1aa', width: 1.5 }
}

const LABELLED = new Set<TopologyEdge['kind']>(['proxy-route', 'service-call', 'published-port'])

export const DiagramSvg: React.FC<DiagramSvgProps> = ({ topology, columns, edges, nodeLines, zoneTitles, ariaLabel, svgRef }) => {
  const layout = layoutColumns(columns.map(column => column.ids), { nodeW: NODE_W, nodeH: NODE_H, gapX: GAP_X, gapY: GAP_Y, left: MARGIN, top: TOP })
  const keyed = edges.map((edge, index) => ({ edge, key: `e${index}` }))
  const routes = routeEdges(keyed.map(({ edge, key }) => ({ key, from: edge.from, to: edge.to })), layout.rects)
  const legendY = layout.height + 4
  const height = legendY + 34
  const width = Math.max(layout.width, 720)

  // Contiguous columns in one zone share a bounding box.
  const zones: Array<{ zone: TopologyZone; first: number; last: number }> = []
  columns.forEach((column, index) => {
    if (!column.zone) return
    const previous = zones[zones.length - 1]
    if (previous && previous.zone === column.zone && previous.last === index - 1) previous.last = index
    else zones.push({ zone: column.zone, first: index, last: index })
  })

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: width }} role="img" aria-label={ariaLabel} fontFamily="ui-sans-serif, system-ui, sans-serif">
      <defs>
        <marker id="diagram-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" /></marker>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="#09090b" />

      {zoneTitles && zones.map(({ zone, first, last }) => {
        const x = layout.columnX[first] - 14
        const w = layout.columnX[last] + NODE_W + 14 - x
        return <g key={`${zone}-${first}`}>
          <rect x={x} y={34} width={w} height={layout.height - 34} fill="none" stroke={zone === 'docker' ? '#71717a' : '#3f3f46'} strokeDasharray="6 5" rx="2" />
          <text x={x + 10} y={27} fill="#a1a1aa" fontSize="11" letterSpacing="1.2">{fit(zoneTitles[zone], Math.floor(w / 7.2))}</text>
        </g>
      })}
      {!zoneTitles && columns.map((column, index) => (
        <text key={column.title} x={layout.columnX[index]} y={34} fill="#a1a1aa" fontSize="11" letterSpacing="1.2">{column.title.toUpperCase()}</text>
      ))}

      {keyed.map(({ edge, key }) => {
        const route = routes.get(key)
        if (!route) return null
        const style = edgeStyle(edge)
        const text = LABELLED.has(edge.kind) ? fit(edge.label || '', 26) : ''
        return <g key={key}>
          <title>{[edge.label, edge.url, edge.via === 'host-gateway' ? 'via host.docker.internal' : ''].filter(Boolean).join(' · ')}</title>
          <path d={route.d} fill="none" stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} strokeOpacity={edge.kind === 'db-connection' ? 0.75 : 1} markerEnd="url(#diagram-arrow)" />
          {text && <text x={route.labelX} y={route.labelY - 4} fill="#d4d4d8" fontSize="10" textAnchor="middle" stroke="#09090b" strokeWidth="3" paintOrder="stroke">{text}</text>}
        </g>
      })}

      {topology.nodes.filter(node => layout.rects.has(node.id)).map(node => {
        const rect = layout.rects.get(node.id)!
        const tone = TONE[node.kind]
        const [title, ...rest] = nodeLines(node)
        return <g key={node.id}>
          <title>{[title, ...rest].join(' · ')}</title>
          <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={tone.fill} stroke={tone.stroke} strokeDasharray={tone.dash} rx="2" />
          <text x={rect.x + 12} y={rect.y + 23} fill="#fafafa" fontSize="12.5" fontWeight="600">{fit(title, 28)}</text>
          {rest.slice(0, 2).map((line, index) => <text key={index} x={rect.x + 12} y={rect.y + 42 + index * 15} fill={index === 0 ? '#a1a1aa' : '#71717a'} fontSize="10.5">{fit(line, 33)}</text>)}
        </g>
      })}

      <g transform={`translate(${MARGIN}, ${legendY + 8})`} fontSize="10" fill="#a1a1aa">
        <line x1="0" y1="8" x2="26" y2="8" stroke="#d4d4d8" strokeWidth="1.5" /><text x="32" y="12">request path</text>
        <line x1="130" y1="8" x2="156" y2="8" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="6 4" /><text x="162" y="12">via host.docker.internal</text>
        <line x1="310" y1="8" x2="336" y2="8" stroke="#71717a" strokeWidth="1.25" strokeDasharray="5 4" /><text x="342" y="12">data connection</text>
        <line x1="450" y1="8" x2="476" y2="8" stroke="#52525b" strokeWidth="1.25" strokeDasharray="2 3" /><text x="482" y="12">tooling or SDK</text>
        <rect x="584" y="1" width="16" height="14" fill="none" stroke="#a1a1aa" strokeDasharray="5 3" /><text x="606" y="12">host process</text>
      </g>
    </svg>
  )
}
