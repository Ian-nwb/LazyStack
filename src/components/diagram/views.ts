import { ProjectSettings } from '../../types'
import { StackTopology, TopologyEdge, TopologyNode } from '../../utils/stackTopology'
import type { DiagramColumn } from './DiagramSvg'

/**
 * Edges worth drawing. Start-up ordering is Compose detail, and a browser link to an admin or
 * Swagger UI would cross the whole canvas for a port the node already shows.
 */
const SIDECARS = new Set(['admin-ui', 'swagger-ui'])
const drawable = (topology: StackTopology) => (edge: TopologyEdge) => {
  if (edge.kind === 'depends-on') return false
  if (edge.kind === 'published-port' && SIDECARS.has(topology.nodes.find(node => node.id === edge.to)?.kind || '')) return false
  return true
}

/**
 * Tier of each app by call depth: apps nobody calls are tier 0, the apps they call are tier 1, and so on.
 * Service connections cannot form a cycle (the generator rejects them), the cap only guards bad input.
 */
function appTiers(topology: StackTopology): Map<string, number> {
  const calls = topology.edges.filter(edge => edge.kind === 'service-call')
  const apps = topology.nodes.filter(node => node.kind === 'app-container' || node.kind === 'host-app')
  const tier = new Map(apps.map(node => [node.id, 0]))
  for (let pass = 0; pass < apps.length; pass++) {
    let changed = false
    for (const call of calls) {
      const next = (tier.get(call.from) ?? 0) + 1
      if (next > (tier.get(call.to) ?? 0) && next <= apps.length) { tier.set(call.to, next); changed = true }
    }
    if (!changed) break
  }
  return tier
}

/** Index of the owning app, so scoped databases and sidecars line up with the service they belong to. */
const ownerOrder = (settings: ProjectSettings, node: TopologyNode) => {
  const index = settings.apps.findIndex(app => app.id === node.ownerAppId)
  return index < 0 ? settings.apps.length : index
}

/** Logical view: clients -> gateway -> services by call depth -> data -> tooling. */
export function serviceViewColumns(topology: StackTopology, settings: ProjectSettings): DiagramColumn[] {
  const tier = appTiers(topology)
  const maxTier = Math.max(0, ...tier.values())
  const columns: DiagramColumn[] = [{ title: 'Clients', ids: ['browser'] }]
  if (topology.nodes.some(node => node.kind === 'gateway')) columns.push({ title: 'Gateway', ids: ['gateway'] })
  for (let level = 0; level <= maxTier; level++) {
    const ids = topology.nodes.filter(node => tier.get(node.id) === level).map(node => node.id)
    if (ids.length) columns.push({ title: level === 0 ? 'Services' : level === 1 ? 'Called services' : `Called services · level ${level}`, ids })
  }
  const byOwner = (kinds: TopologyNode['kind'][]) => topology.nodes.filter(node => kinds.includes(node.kind))
    .sort((a, b) => ownerOrder(settings, a) - ownerOrder(settings, b)).map(node => node.id)
  const data = byOwner(['db-container', 'sqlite-file', 'cloud-service'])
  const tools = byOwner(['admin-ui', 'swagger-ui'])
  if (data.length) columns.push({ title: 'Data services', ids: data })
  if (tools.length) columns.push({ title: 'Developer tools', ids: tools })
  return columns
}

export const serviceViewEdges = (topology: StackTopology): TopologyEdge[] => topology.edges.filter(drawable(topology))

/** Physical view: host machine, Docker bridge network, managed external services. */
export function networkViewColumns(topology: StackTopology): DiagramColumn[] {
  const pick = (...kinds: TopologyNode['kind'][]) => topology.nodes.filter(node => kinds.includes(node.kind)).map(node => node.id)
  const candidates: DiagramColumn[] = [
    { title: 'Host', zone: 'host', ids: [...pick('browser'), ...pick('host-app'), ...pick('sqlite-file')] },
    { title: 'Gateway', zone: 'docker', ids: pick('gateway') },
    { title: 'Applications', zone: 'docker', ids: pick('app-container') },
    { title: 'Data and tooling', zone: 'docker', ids: pick('db-container', 'admin-ui', 'swagger-ui') },
    { title: 'External', zone: 'external', ids: pick('cloud-service') }
  ]
  return candidates.filter(column => column.ids.length > 0)
}

export const networkViewEdges = (topology: StackTopology): TopologyEdge[] => topology.edges.filter(drawable(topology))

const scopeOf = (settings: ProjectSettings, node: TopologyNode) => {
  const owner = settings.apps.find(app => app.id === node.ownerAppId)
  return owner ? `service-scoped to ${owner.folderName}` : 'shared'
}

/** Node text for the logical view. */
export function serviceNodeLines(topology: StackTopology, settings: ProjectSettings) {
  return (node: TopologyNode): string[] => {
    const app = settings.apps.find(item => item.id === node.appId)
    const route = topology.edges.find(edge => edge.kind === 'proxy-route' && edge.to === node.id)?.label
    switch (node.kind) {
      case 'browser': return ['Browser / client', 'user device']
      case 'gateway': return [`${node.detail} gateway`, `host :${node.hostPort}`, 'routes by path prefix']
      case 'app-container':
      case 'host-app': return [node.label, `${app?.role} · ${node.detail}`, `${node.kind === 'host-app' ? 'host' : 'container'} · :${node.hostPort}${route ? ` · route ${route}` : ''}`]
      case 'db-container': return [node.label, `${node.detail} · ${scopeOf(settings, node)}`, 'container service']
      case 'sqlite-file': return [node.label, `sqlite · ${scopeOf(settings, node)}`, 'local file database']
      case 'cloud-service': return [node.label, `${node.detail} · ${scopeOf(settings, node)}`, 'managed external service']
      case 'admin-ui': return [node.label, node.detail, `127.0.0.1 :${node.hostPort}`]
      case 'swagger-ui': return [node.label, 'OpenAPI viewer', `127.0.0.1 :${node.hostPort}`]
    }
  }
}

/** Node text for the physical view: Compose service name and container port, plus where it is published. */
export function networkNodeLines(settings: ProjectSettings) {
  return (node: TopologyNode): string[] => {
    const published = node.hostPort ? `${node.loopbackOnly ? '127.0.0.1' : 'host'} :${node.hostPort}${node.extraPorts?.length ? ` +${node.extraPorts.length}` : ''}` : ''
    switch (node.kind) {
      case 'browser': return ['Browser / client', 'user device']
      case 'gateway': return [`${node.detail} gateway`, `gateway:${node.containerPort}`, published]
      case 'host-app': return [node.label, 'host process', `localhost :${node.hostPort}`]
      case 'sqlite-file': return [node.label, 'SQLite file', 'shared volume or local file']
      case 'cloud-service': return [node.label, 'managed external service', node.detail]
      default: return [node.label, `${node.serviceName}:${node.containerPort}`, published]
    }
  }
}
