/**
 * A small layered layout for the Blueprint diagrams: nodes sit in columns, edges are cubic curves
 * between node sides, and edges that share a side are spread across it so they never overlap.
 * Graphs here have tens of nodes, so no layout library is needed.
 */

export interface Rect { x: number; y: number; w: number; h: number }

export interface LayoutOptions {
  nodeW: number
  nodeH: number
  gapX: number
  gapY: number
  left: number
  top: number
}

export interface ColumnLayout {
  rects: Map<string, Rect>
  /** Left edge of each column. */
  columnX: number[]
  width: number
  height: number
}

/** Places each column's nodes top to bottom, centring shorter columns against the tallest one. */
export function layoutColumns(columns: string[][], o: LayoutOptions): ColumnLayout {
  const tallest = Math.max(1, ...columns.map(ids => ids.length))
  const fullHeight = tallest * o.nodeH + (tallest - 1) * o.gapY
  const rects = new Map<string, Rect>()
  const columnX: number[] = []
  columns.forEach((ids, column) => {
    const x = o.left + column * (o.nodeW + o.gapX)
    columnX.push(x)
    const columnHeight = ids.length * o.nodeH + Math.max(0, ids.length - 1) * o.gapY
    const offset = (fullHeight - columnHeight) / 2
    ids.forEach((id, row) => rects.set(id, { x, y: o.top + offset + row * (o.nodeH + o.gapY), w: o.nodeW, h: o.nodeH }))
  })
  return {
    rects, columnX,
    width: o.left * 2 + columns.length * o.nodeW + Math.max(0, columns.length - 1) * o.gapX,
    height: o.top + fullHeight + o.top
  }
}

export interface RoutedEdge { d: string; labelX: number; labelY: number }
export interface EdgeInput { key: string; from: string; to: string }

type Side = 'l' | 'r'

/** Distance between neighbouring attachment points on a node side, in px. */
const SLOT = 9

export function routeEdges(edges: EdgeInput[], rects: Map<string, Rect>): Map<string, RoutedEdge> {
  const centre = (rect: Rect) => rect.y + rect.h / 2
  const plan = edges.flatMap(edge => {
    const from = rects.get(edge.from)
    const to = rects.get(edge.to)
    if (!from || !to) return []
    const forward = from.x + from.w <= to.x
    const backward = to.x + to.w <= from.x
    const fromSide: Side = backward ? 'l' : 'r'
    const toSide: Side = forward ? 'l' : backward ? 'r' : 'r'
    return [{ edge, from, to, fromSide, toSide, sameColumn: !forward && !backward }]
  })

  // Spread edges that share a node side, ordered by where the other end sits so curves do not cross.
  const slots = new Map<string, Array<{ key: string; end: 'from' | 'to'; other: number }>>()
  const add = (id: string, side: Side, key: string, end: 'from' | 'to', other: number) => {
    const slot = `${id}:${side}`
    slots.set(slot, [...(slots.get(slot) || []), { key, end, other }])
  }
  for (const item of plan) {
    add(item.edge.from, item.fromSide, item.edge.key, 'from', centre(item.to))
    add(item.edge.to, item.toSide, item.edge.key, 'to', centre(item.from))
  }
  const offsetOf = new Map<string, number>()
  for (const [slot, list] of slots) {
    list.sort((a, b) => a.other - b.other)
    list.forEach((entry, index) => offsetOf.set(`${slot}|${entry.key}|${entry.end}`, (index - (list.length - 1) / 2) * SLOT))
  }

  const routed = new Map<string, RoutedEdge>()
  for (const { edge, from, to, fromSide, toSide, sameColumn } of plan) {
    const fromOffset = offsetOf.get(`${edge.from}:${fromSide}|${edge.key}|from`) ?? 0
    const toOffset = offsetOf.get(`${edge.to}:${toSide}|${edge.key}|to`) ?? 0
    const sx = fromSide === 'r' ? from.x + from.w : from.x
    const sy = centre(from) + fromOffset
    const ex = toSide === 'l' ? to.x : to.x + to.w
    const ey = centre(to) + toOffset
    if (sameColumn) {
      // Loop out to the right and back in, wider the further apart the nodes are.
      const bulge = 36 + Math.min(80, Math.abs(ey - sy) * 0.25)
      routed.set(edge.key, { d: `M ${sx} ${sy} C ${sx + bulge} ${sy}, ${ex + bulge} ${ey}, ${ex} ${ey}`, labelX: sx + bulge * 0.78, labelY: (sy + ey) / 2 })
    } else {
      const reach = Math.max(36, Math.abs(ex - sx) * 0.45)
      const dir = fromSide === 'r' ? 1 : -1
      routed.set(edge.key, {
        d: `M ${sx} ${sy} C ${sx + dir * reach} ${sy}, ${ex - dir * reach} ${ey}, ${ex} ${ey}`,
        labelX: (sx + ex) / 2, labelY: (sy + ey) / 2
      })
    }
  }
  return routed
}
