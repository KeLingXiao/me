export interface GraphNode { id: string; title: string }
export interface GraphEdge { from: string; to: string }
export interface LayoutNode extends GraphNode {
  x: number; y: number; vx: number; vy: number; degree: number; radius: number; pinned: boolean
}

function randomFor(id: string) {
  let seed = 2166136261
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619)
  return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
}

export function createLayout<T extends GraphNode>(source: T[], edges: GraphEdge[]): (T & LayoutNode)[] {
  const degree = new Map<string, number>()
  for (const edge of edges) for (const id of [edge.from, edge.to]) degree.set(id, (degree.get(id) || 0) + 1)
  return source.map(node => {
    const random = randomFor(node.id)
    const count = degree.get(node.id) || 0
    return { ...node, x: 120 + random() * 760, y: 90 + random() * 620,
      vx: 0, vy: 0, degree: count, radius: Math.min(15, 5 + Math.sqrt(count) * 2), pinned: false }
  })
}

// Link springs, repulsion and label collisions. There are no circular targets;
// disconnected notes participate in repulsion but never gain invented edges.
export function stepLayout(nodes: LayoutNode[], edges: GraphEdge[], strength = 1) {
  const lookup = new Map(nodes.map(node => [node.id, node]))
  const force = nodes.map(() => ({ x: 0, y: 0 }))
  const indices = new Map(nodes.map((node, index) => [node.id, index]))
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y
      if (Math.abs(dx) + Math.abs(dy) < .01) { dx = 1; dy = .5 }
      const distance = Math.max(1, Math.hypot(dx, dy))
      const charge = 1600 / Math.max(400, distance * distance)
      let fx = dx / distance * charge, fy = dy / distance * charge
      const labelWidth = (Math.min(18, nodes[i].title.length) + Math.min(18, nodes[j].title.length)) * 3.4 + 18
      const overlapX = labelWidth - Math.abs(dx), overlapY = 51 - Math.abs(dy)
      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) fx += Math.sign(dx || 1) * overlapX * .12
        else fy += Math.sign(dy || 1) * overlapY * .12
      }
      force[i].x -= fx; force[i].y -= fy
      force[j].x += fx; force[j].y += fy
    }
  }
  for (const edge of edges) {
    const a = lookup.get(edge.from), b = lookup.get(edge.to)
    if (!a || !b) continue
    const dx = b.x - a.x, dy = b.y - a.y, distance = Math.max(1, Math.hypot(dx, dy))
    const pull = (distance - 125) * .018
    const i = indices.get(a.id)!, j = indices.get(b.id)!
    force[i].x += dx / distance * pull; force[i].y += dy / distance * pull
    force[j].x -= dx / distance * pull; force[j].y -= dy / distance * pull
  }
  let movement = 0
  nodes.forEach((node, index) => {
    if (node.pinned) { node.vx = node.vy = 0; return }
    node.vx = (node.vx + (force[index].x + (500 - node.x) * .001) * strength) * .7
    node.vy = (node.vy + (force[index].y + (400 - node.y) * .001) * strength) * .7
    node.x = Math.max(85, Math.min(915, node.x + Math.max(-8, Math.min(8, node.vx))))
    node.y = Math.max(65, Math.min(725, node.y + Math.max(-8, Math.min(8, node.vy))))
    movement += Math.abs(node.vx) + Math.abs(node.vy)
  })
  return movement
}
