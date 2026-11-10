import { ProjectSettings } from '../types'
import { resolveStructurePaths } from '../data/structurePresets'
import { buildStackTopology, StackTopology, TopologyEdge, TopologyNode } from './stackTopology'

const label = (value: string) => JSON.stringify(value.replace(/[\r\n"]+/g, ' '))
const edgeText = (value: string) => value.replace(/[\r\n"|]+/g, ' ')

function nodeCaption(node: TopologyNode, view: 'service' | 'network'): string {
  if (view === 'service') {
    const port = node.hostPort ? ` · :${node.hostPort}` : ''
    switch (node.kind) {
      case 'browser': return node.label
      case 'gateway': return `${node.label} · :${node.hostPort}`
      case 'sqlite-file': return `${node.label} · local file`
      case 'cloud-service': return `${node.label} · managed external`
      default: return `${node.label} · ${node.detail}${port}`
    }
  }
  switch (node.kind) {
    case 'browser': return 'Browser / client'
    case 'host-app': return `${node.label} · host process :${node.hostPort}`
    case 'sqlite-file': return `${node.label} · SQLite file`
    case 'cloud-service': return `${node.label} · managed external`
    case 'gateway': return `${node.label} · host :${node.hostPort}`
    default: {
      const container = node.serviceName && node.containerPort ? `${node.serviceName}:${node.containerPort}` : node.label
      const published = node.hostPort ? ` · ${node.loopbackOnly ? '127.0.0.1' : 'host'} :${node.hostPort}` : ''
      return `${container}${published}`
    }
  }
}

function renderEdge(edge: TopologyEdge, ids: Map<string, string>, view: 'service' | 'network'): string | null {
  const from = ids.get(edge.from)
  const to = ids.get(edge.to)
  if (!from || !to || edge.kind === 'depends-on') return null
  const parts: string[] = []
  if (edge.kind === 'proxy-route') parts.push(edge.label || '/')
  else if (edge.kind === 'service-call') parts.push(edge.label || 'call')
  else if (edge.kind === 'published-port') parts.push(edge.label || 'port')
  else if (edge.kind === 'db-connection') parts.push(view === 'network' && edge.url ? edge.url : edge.label || 'data')
  else if (edge.kind === 'admin-link') parts.push(edge.label || 'admin')
  if (view === 'network' && edge.via === 'host-gateway') parts.push('via host.docker.internal')
  const text = edgeText(parts.join(' · '))
  const dashed = edge.kind === 'db-connection' || edge.kind === 'admin-link' || edge.via === 'host-gateway'
  const arrow = dashed ? '-.->' : '-->'
  return `  ${from} ${arrow}${text ? `|${label(text)}|` : ''} ${to}`
}

function nodeIds(topology: StackTopology): Map<string, string> {
  return new Map(topology.nodes.map((node, index) => [node.id, `n${index + 1}`]))
}

/** Logical view: who calls whom and which data each service uses. */
export function renderServiceMermaid(topology: StackTopology): string {
  const ids = nodeIds(topology)
  const hasContent = topology.nodes.some(node => node.kind !== 'browser')
  return [
    'flowchart LR',
    ...topology.nodes.filter(node => node.kind !== 'browser' || hasContent).map(node => `  ${ids.get(node.id)}[${label(nodeCaption(node, 'service'))}]`),
    ...topology.edges.map(edge => renderEdge(edge, ids, 'service')).filter((line): line is string => Boolean(line)),
    ...(hasContent ? [] : ['  empty[No services selected]'])
  ].join('\n')
}

/** Physical view: host, Docker network and external zones with ports. */
export function renderNetworkMermaid(topology: StackTopology): string {
  const ids = nodeIds(topology)
  const zone = (zoneName: 'host' | 'docker' | 'external') => topology.nodes
    .filter(node => node.zone === zoneName)
    .map(node => `    ${ids.get(node.id)}[${label(nodeCaption(node, 'network'))}]`)
  const hasContent = topology.nodes.some(node => node.kind !== 'browser')
  const lines = ['flowchart LR', '  subgraph host["Host machine"]', ...zone('host'), '  end']
  if (zone('docker').length) lines.push(`  subgraph docker[${label(`Docker bridge · ${topology.networkName}`)}]`, ...zone('docker'), '  end')
  if (zone('external').length) lines.push('  subgraph external["Managed external services"]', ...zone('external'), '  end')
  lines.push(...topology.edges.map(edge => renderEdge(edge, ids, 'network')).filter((line): line is string => Boolean(line)))
  if (!hasContent) lines.push('  empty[No services selected]')
  return lines.join('\n')
}

/** Markdown architecture document, written to `docs/architecture.md` and offered as a Blueprint export. */
export function renderArchitectureMarkdown(settings: ProjectSettings, topology = buildStackTopology(settings)): string {
  const paths = resolveStructurePaths(settings)
  const enabledDbs = settings.databases.filter(db => db.enabled)
  const byId = new Map(settings.apps.map(app => [app.id, app]))
  const services = settings.apps.map(app => {
    const depends = (app.connections || []).map(connection => {
      const target = byId.get(connection.targetAppId)
      return target ? `${target.folderName} (${connection.protocol}; ${connection.envVar})` : null
    }).filter(Boolean).join(', ')
    const health = app.healthCheck?.enabled ? `${app.healthCheck.type}${app.healthCheck.path ? ` ${app.healthCheck.path}` : ''}` : 'not configured'
    return `### ${app.folderName}\n\n- Role: ${app.role}\n- Technology: ${app.techId}\n- Runtime: ${app.runMode}\n- Port: ${app.port}\n- Health check: ${health}\n- Depends on: ${depends || 'none'}\n`
  })
  const databases = enabledDbs.map(db => {
    const node = topology.nodes.find(item => item.database === db)
    const where = node?.kind === 'cloud-service' ? 'managed external service' : node?.kind === 'sqlite-file' ? 'local file' : `container ${node?.serviceName}`
    return `- ${db.customName || db.type} (${db.type}; ${db.assignedAppId && db.assignedAppId !== 'global' ? `service ${byId.get(db.assignedAppId)?.folderName || db.assignedAppId}` : 'shared'}; ${where}${db.port ? `; port ${db.port}` : ''})`
  })
  const published = topology.nodes
    .filter(node => node.hostPort && node.kind !== 'browser')
    .map(node => `- ${node.label}: ${node.loopbackOnly ? '127.0.0.1' : node.zone === 'host' ? 'localhost (host process)' : 'host'} :${node.hostPort}${node.serviceName && node.containerPort ? ` → ${node.serviceName}:${node.containerPort}` : ''}`)

  return `# System Architecture: ${settings.projectName || 'Blueprint'}

- **Architecture style:** ${settings.structureConfig?.preset || 'monorepo'}
- **Database pattern:** ${paths.databaseIsolation}
- **Services:** ${settings.apps.length}
- **Databases:** ${enabledDbs.length}
- **Gateway:** ${settings.proxy.type === 'none' ? 'none' : `${settings.proxy.type} on host port ${settings.proxy.httpPort}`}
- **Docker network:** ${topology.networkName}
- **Unified workspace:** ${settings.useUnifiedWorkspace === false ? 'off' : 'on'}

## Service diagram

Shows service-to-service calls (protocol and environment variable), gateway routes and data dependencies.

\`\`\`mermaid
${renderServiceMermaid(topology)}
\`\`\`

## Network topology

Shows the host machine, the Docker bridge network and managed external services, with the ports each service listens on. Dashed arrows go through \`host.docker.internal\`, to data services or to tooling.

\`\`\`mermaid
${renderNetworkMermaid(topology)}
\`\`\`

## Published ports

${published.join('\n') || '- None'}

## Services

${services.join('\n') || 'No services configured.\n'}
## Databases

${databases.join('\n') || '- None configured'}
`
}
