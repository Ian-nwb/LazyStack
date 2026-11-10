import { CartApp, ProjectSettings, SelectedDatabase } from '../types'
import { DATABASE_CATALOG } from '../data/databases'
import { getDatabaseAdminUiOption } from '../data/databaseAdminUis'
import { isHostOnlyTech } from '../data/frameworks'
import { getAppDatabases, isDatabaseVisibleToApp, isScopedToApp } from './databaseScope'
import { getRoutePrefix, resolveServiceConnectionUrl } from './serviceConnections'

/**
 * The single description of what runs where and how it connects. Compose generation, proxy
 * routing and both Blueprint diagrams read it, so they cannot disagree about a service name,
 * a port or a dependency.
 */

export type TopologyNodeKind =
  | 'browser' | 'gateway' | 'host-app' | 'app-container'
  | 'db-container' | 'sqlite-file' | 'cloud-service' | 'admin-ui' | 'swagger-ui'

export type TopologyEdgeKind =
  | 'published-port'   // a client reaches a published host port
  | 'proxy-route'      // the gateway forwards a path prefix
  | 'service-call'     // an app calls another app (ServiceConnection)
  | 'db-connection'    // an app talks to a data service
  | 'depends-on'       // Compose start-up ordering
  | 'admin-link'       // an admin or Swagger UI attached to its target

export type TopologyZone = 'host' | 'docker' | 'external'

export interface TopologyNode {
  id: string
  kind: TopologyNodeKind
  label: string
  /** Short technical caption, e.g. the tech id or database type. */
  detail: string
  zone: TopologyZone
  /** Compose service name (container nodes only). */
  serviceName?: string
  containerPort?: number
  /** Port published on the host (or the port a host process listens on). */
  hostPort?: number
  /** Further published ports, same number on both sides. */
  extraPorts?: number[]
  /** Published on 127.0.0.1 only. */
  loopbackOnly?: boolean
  appId?: string
  database?: SelectedDatabase
  /** App a sidecar or scoped database belongs to. */
  ownerAppId?: string
}

export interface TopologyEdge {
  from: string
  to: string
  kind: TopologyEdgeKind
  /** Route prefix, protocol and variable name, or a similar short caption. */
  label?: string
  /** Where the caller actually connects. */
  url?: string
  /** How the caller reaches the target. */
  via?: 'dns' | 'host-gateway' | 'localhost'
  condition?: 'service_healthy' | 'service_started'
}

export interface ComposeDependency { service: string; condition: 'service_healthy' | 'service_started' }

export interface StackTopology {
  composeName: string
  networkName: string
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  /** Apps that run as containers, in blueprint order. */
  dockerApps: CartApp[]
  /** Databases that get a container, with their Compose service names. */
  dbContainers: Array<{ db: SelectedDatabase; serviceName: string }>
  /** Compose `depends_on` entries per app id, in emission order. */
  appDependencies: Map<string, ComposeDependency[]>
  /** App ids whose container must resolve `host.docker.internal`. */
  needsHostGateway: Set<string>
  /** Host port of each app's Swagger UI sidecar. */
  swaggerPorts: Map<string, number>
  serviceNameOf: (db: SelectedDatabase) => string
}

export function getDbServiceName(db: SelectedDatabase, idx: number, apps?: CartApp[]): string {
  if (db.customName) {
    const slug = db.customName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
    if (slug) return slug
  }
  const assignedApp = apps?.find(a => a.id === db.assignedAppId)
  if (assignedApp) {
    return `${assignedApp.folderName}_${db.type}`
  }
  return idx > 0 ? `${db.type}_${idx + 1}` : db.type
}

/** Port a database listens on inside its container, and any further ports Compose publishes 1:1. */
const DB_CONTAINER_PORTS: Record<string, { port: number; extra?: number[] }> = {
  postgres: { port: 5432 }, mysql: { port: 3306 }, mariadb: { port: 3306 },
  redis: { port: 6379 }, valkey: { port: 6379 }, mongodb: { port: 27017 },
  clickhouse: { port: 8123, extra: [9000] }, surrealdb: { port: 8000 },
  neo4j: { port: 7474, extra: [7687] }, qdrant: { port: 6333, extra: [6334] },
  meilisearch: { port: 7700 }, minio: { port: 9000, extra: [9001] },
  scylladb: { port: 9042 }, rabbitmq: { port: 5672, extra: [15672] },
  kafka: { port: 9092 }, pocketbase: { port: 8090 }
}

export function getComposeProjectName(projectName: string): string {
  // Without a name, Compose uses the folder name (`infra`), so every LazyStack project would share
  // one Compose project and starting one would replace another's containers.
  return projectName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[^a-z0-9]+|-+$/g, '') || 'lazystack'
}

const catalogOf = (db: SelectedDatabase) => DATABASE_CATALOG.find(item => item.id === db.type)

export function buildStackTopology(settings: ProjectSettings): StackTopology {
  const composeName = getComposeProjectName(settings.projectName)
  const proxy = settings.proxy
  const hasGateway = proxy.type !== 'none'
  const enabledDbs = settings.databases.filter(db => db.enabled)
  const nameOf = (db: SelectedDatabase) => getDbServiceName(db, settings.databases.indexOf(db), settings.apps)

  const dockerApps = settings.apps.filter(app => app.runMode === 'docker' && !isHostOnlyTech(app.techId))
  const isContainerDb = (db: SelectedDatabase) => {
    const definition = catalogOf(db)
    return db.type !== 'sqlite' && (!definition?.isCloud || Boolean(definition.imageTag))
  }
  const dbContainers = enabledDbs.filter(isContainerDb).map(db => ({ db, serviceName: nameOf(db) }))
  const isDockerApp = (app: CartApp) => dockerApps.includes(app)

  const nodes: TopologyNode[] = [{ id: 'browser', kind: 'browser', label: 'Browser / client', detail: 'user device', zone: 'host' }]
  const edges: TopologyEdge[] = []
  const appNodeId = (app: CartApp) => `app:${app.id}`
  const dbNodeId = (db: SelectedDatabase) => `db:${settings.databases.indexOf(db)}`

  if (hasGateway) {
    nodes.push({ id: 'gateway', kind: 'gateway', label: `${proxy.type} gateway`, detail: proxy.type, zone: 'docker', serviceName: 'gateway', containerPort: proxy.httpPort, hostPort: proxy.httpPort })
  }

  for (const app of settings.apps) {
    const docker = isDockerApp(app)
    nodes.push({
      id: appNodeId(app), kind: docker ? 'app-container' : 'host-app', label: app.folderName, detail: app.techId,
      zone: docker ? 'docker' : 'host', serviceName: docker ? app.folderName : undefined,
      containerPort: docker ? app.port : undefined, hostPort: app.port > 0 ? app.port : undefined, appId: app.id
    })
  }

  for (const db of enabledDbs) {
    const definition = catalogOf(db)
    const label = db.customName || definition?.name || db.type
    const owner = db.assignedAppId && db.assignedAppId !== 'global' ? db.assignedAppId : undefined
    if (db.type === 'sqlite') {
      nodes.push({ id: dbNodeId(db), kind: 'sqlite-file', label, detail: 'sqlite', zone: 'host', database: db, ownerAppId: owner })
    } else if (isContainerDb(db)) {
      const ports = DB_CONTAINER_PORTS[db.type]
      nodes.push({
        id: dbNodeId(db), kind: 'db-container', label, detail: db.type, zone: 'docker', serviceName: nameOf(db),
        containerPort: ports?.port ?? db.port, hostPort: db.port, extraPorts: ports?.extra, database: db, ownerAppId: owner
      })
    } else {
      nodes.push({ id: dbNodeId(db), kind: 'cloud-service', label, detail: db.type, zone: 'external', database: db, ownerAppId: owner })
    }
  }

  // Admin UIs: container sidecars bound to loopback. Prisma Studio runs on the host and has no node.
  const reservedPorts = new Set<number>([
    ...settings.apps.map(app => app.port),
    ...enabledDbs.map(db => db.port),
    proxy.httpPort
  ])
  for (const { db, serviceName } of dbContainers) {
    const option = getDatabaseAdminUiOption(db.type, db.adminUi)
    if (!option) continue
    const hostPort = db.adminUiPort || option.defaultPort
    reservedPorts.add(hostPort)
    if (option.hostProcess) continue
    nodes.push({
      id: `admin:${settings.databases.indexOf(db)}`, kind: 'admin-ui', label: `${option.name}`, detail: `${serviceName} admin`, zone: 'docker',
      serviceName: `${serviceName}_admin_ui`, containerPort: option.containerPort, hostPort, loopbackOnly: true, ownerAppId: db.assignedAppId && db.assignedAppId !== 'global' ? db.assignedAppId : undefined
    })
    edges.push({ from: `admin:${settings.databases.indexOf(db)}`, to: dbNodeId(db), kind: 'admin-link', label: option.name })
    edges.push({ from: `admin:${settings.databases.indexOf(db)}`, to: dbNodeId(db), kind: 'depends-on', condition: 'service_healthy' })
    edges.push({ from: 'browser', to: `admin:${settings.databases.indexOf(db)}`, kind: 'published-port', label: `127.0.0.1:${hostPort}`, url: `http://127.0.0.1:${hostPort}` })
  }

  // Swagger UIs take the next free host port from 8088. Admin UI ports are reserved first so the two never collide.
  const swaggerPorts = new Map<string, number>()
  settings.apps.filter(app => (app.testingTools || []).includes('swagger-openapi')).forEach((app, index) => {
    let port = 8088 + index
    while (reservedPorts.has(port)) port++
    reservedPorts.add(port)
    swaggerPorts.set(app.id, port)
    const id = `swagger:${app.id}`
    nodes.push({ id, kind: 'swagger-ui', label: `${app.folderName} Swagger UI`, detail: 'OpenAPI', zone: 'docker', serviceName: `${app.folderName}_swagger_ui`, containerPort: 8080, hostPort: port, loopbackOnly: true, ownerAppId: app.id })
    edges.push({ from: id, to: appNodeId(app), kind: 'admin-link', label: 'openapi.yaml' })
    edges.push({ from: 'browser', to: id, kind: 'published-port', label: `127.0.0.1:${port}`, url: `http://127.0.0.1:${port}` })
  })

  // Gateway routing: the proxy forwards to every app, container or host process.
  if (hasGateway) {
    edges.push({ from: 'browser', to: 'gateway', kind: 'published-port', label: `localhost:${proxy.httpPort}`, url: `http://localhost:${proxy.httpPort}` })
    for (const app of settings.apps) {
      const docker = isDockerApp(app)
      edges.push({
        from: 'gateway', to: appNodeId(app), kind: 'proxy-route', label: getRoutePrefix(app), via: docker ? 'dns' : 'host-gateway',
        url: `http://${docker ? app.folderName : 'host.docker.internal'}:${app.port}`
      })
    }
    for (const app of dockerApps) edges.push({ from: 'gateway', to: appNodeId(app), kind: 'depends-on', condition: 'service_started' })
  } else {
    for (const app of settings.apps) {
      if (app.port > 0) edges.push({ from: 'browser', to: appNodeId(app), kind: 'published-port', label: `localhost:${app.port}`, url: `http://localhost:${app.port}` })
    }
  }

  // Per-app wiring: data services, service calls, start-up ordering and host reachability.
  const appDependencies = new Map<string, ComposeDependency[]>()
  const needsHostGateway = new Set<string>()
  for (const app of settings.apps) {
    const docker = isDockerApp(app)
    const dependencies = new Map<string, ComposeDependency['condition']>()

    for (const { db, serviceName } of dbContainers) {
      if (!isDatabaseVisibleToApp(settings, app, db)) continue
      edges.push({
        from: appNodeId(app), to: dbNodeId(db), kind: 'db-connection', label: db.type,
        via: docker ? 'dns' : 'localhost',
        url: docker ? `${serviceName}:${DB_CONTAINER_PORTS[db.type]?.port ?? db.port}` : `localhost:${db.port}`
      })
      if (docker) dependencies.set(serviceName, 'service_healthy')
    }
    for (const db of getAppDatabases(settings, app, { includeCloud: true, includeSqlite: true })) {
      if (isContainerDb(db)) continue
      if (catalogOf(db)?.isCloud && !isScopedToApp(app, db)) continue
      edges.push({ from: appNodeId(app), to: dbNodeId(db), kind: 'db-connection', label: db.type === 'sqlite' ? 'file' : 'SDK' })
    }

    for (const connection of app.connections || []) {
      const target = settings.apps.find(item => item.id === connection.targetAppId)
      if (!target) continue
      const targetIsDocker = isDockerApp(target)
      edges.push({
        from: appNodeId(app), to: appNodeId(target), kind: 'service-call', label: `${connection.protocol} ${connection.envVar}`,
        url: resolveServiceConnectionUrl(app, target, proxy, connection),
        via: docker ? (targetIsDocker ? 'dns' : 'host-gateway') : 'localhost'
      })
      if (docker && !targetIsDocker && target.runMode === 'host') needsHostGateway.add(app.id)
      if (docker && target.runMode === 'docker') dependencies.set(target.folderName, target.healthCheck?.enabled ? 'service_healthy' : 'service_started')
    }

    if (docker) {
      appDependencies.set(app.id, [...dependencies].map(([service, condition]) => ({ service, condition })))
      for (const [service, condition] of dependencies) {
        const targetNode = nodes.find(node => node.serviceName === service)
        if (targetNode) edges.push({ from: appNodeId(app), to: targetNode.id, kind: 'depends-on', condition })
      }
    }
  }

  const dbNames = new Map(dbContainers.map(({ db, serviceName }) => [db, serviceName]))
  return {
    composeName, networkName: `${composeName}_lazystack_net`, nodes, edges, dockerApps, dbContainers,
    appDependencies, needsHostGateway, swaggerPorts,
    serviceNameOf: db => dbNames.get(db) ?? nameOf(db)
  }
}
