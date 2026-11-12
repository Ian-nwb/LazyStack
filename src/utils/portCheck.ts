import { DatabaseType, ProjectSettings } from '../types'
import { DATABASE_CATALOG } from '../data/databases'

/**
 * Pure port bookkeeping shared by the generator, the CLI, the Vite middleware and the UI.
 * Everything here works on the blueprint only; probing the machine lives in electron/environment/ports.ts.
 */

export type PortUseKind = 'app' | 'database' | 'database-extra' | 'admin-ui' | 'proxy'

export interface PortUse {
  port: number
  /** Human-readable owner, e.g. `api` or `pgadmin UI for postgres`. */
  owner: string
  kind: PortUseKind
  /** Id of the app or database instance that owns the port, when there is one. */
  ownerId?: string
}

export interface PortConflict {
  port: number
  owners: PortUse[]
  /** Next free port in the same range, safe to apply to the last owner. */
  suggestion: number
}

/**
 * Host ports that a service publishes in addition to its main port. They are fixed in the
 * generated Compose file, so two services of these types cannot share a stack unless the
 * extra ports differ.
 */
export const DATABASE_EXTRA_PORTS: Partial<Record<DatabaseType, Array<{ port: number; label: string }>>> = {
  rabbitmq: [{ port: 15672, label: 'management UI' }],
  clickhouse: [{ port: 9000, label: 'native protocol' }],
  neo4j: [{ port: 7687, label: 'bolt' }],
  qdrant: [{ port: 6334, label: 'gRPC' }],
  minio: [{ port: 9001, label: 'console' }],
  nats: [{ port: 8222, label: 'monitoring' }],
  mosquitto: [{ port: 9001, label: 'WebSockets' }],
  redpanda: [{ port: 9644, label: 'admin API' }],
  cockroachdb: [{ port: 8180, label: 'console' }]
}

const databaseLabel = (db: ProjectSettings['databases'][number]) => db.customName || db.type

/** Every host-published port declared by a blueprint, in a stable order. */
export function collectPortUses(settings: ProjectSettings): PortUse[] {
  const uses: PortUse[] = []
  for (const app of settings.apps) {
    if (app.port > 0) uses.push({ port: app.port, owner: app.folderName, kind: 'app', ownerId: app.id })
  }
  for (const db of settings.databases.filter(item => item.enabled)) {
    const definition = DATABASE_CATALOG.find(item => item.id === db.type)
    const runsInDocker = !definition?.isCloud || Boolean(definition.imageTag)
    if (!runsInDocker) continue
    const ownerId = db.id || db.type
    if (db.port > 0) uses.push({ port: db.port, owner: databaseLabel(db), kind: 'database', ownerId })
    for (const extra of DATABASE_EXTRA_PORTS[db.type] || []) {
      uses.push({ port: extra.port, owner: `${databaseLabel(db)} ${extra.label}`, kind: 'database-extra', ownerId })
    }
    if (db.adminUi && db.adminUiPort) uses.push({ port: db.adminUiPort, owner: `${databaseLabel(db)} admin UI`, kind: 'admin-ui', ownerId })
  }
  if (settings.proxy && settings.proxy.type !== 'none' && settings.proxy.httpPort > 0) {
    uses.push({ port: settings.proxy.httpPort, owner: `${settings.proxy.type} proxy`, kind: 'proxy' })
  }
  return uses
}

/** Next free port at or above `start` (wrapping into the unprivileged range), skipping `taken`. */
export function suggestFreePort(start: number, taken: Set<number>): number {
  let candidate = Math.max(start + 1, 1024)
  while (taken.has(candidate) && candidate < 65535) candidate++
  return candidate
}

/** Ports claimed by more than one service. Each conflict lists every owner. */
export function findPortConflicts(settings: ProjectSettings): PortConflict[] {
  const uses = collectPortUses(settings)
  const byPort = new Map<number, PortUse[]>()
  for (const use of uses) byPort.set(use.port, [...(byPort.get(use.port) || []), use])
  const taken = new Set(byPort.keys())
  const conflicts: PortConflict[] = []
  for (const [port, owners] of byPort) {
    if (owners.length < 2) continue
    const suggestion = suggestFreePort(port, taken)
    taken.add(suggestion)
    conflicts.push({ port, owners, suggestion })
  }
  return conflicts.sort((a, b) => a.port - b.port)
}

/** One-line description, e.g. `Port 8080 is used by "api" and "pgadmin UI"`. */
export function describePortConflict(conflict: PortConflict): string {
  const names = conflict.owners.map(owner => `"${owner.owner}"`)
  const list = names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join(' and ')
  return `Port ${conflict.port} is used by ${list}. Try ${conflict.suggestion} for "${conflict.owners[conflict.owners.length - 1].owner}".`
}

/** Ports the operating system or common tools tend to claim; only a warning. */
const COMMONLY_CLAIMED: Record<number, string> = {
  22: 'SSH', 25: 'SMTP', 53: 'DNS', 111: 'rpcbind', 135: 'Windows RPC', 139: 'NetBIOS', 445: 'SMB',
  631: 'CUPS printing', 3389: 'Remote Desktop', 5353: 'mDNS', 5000: 'AirPlay Receiver on macOS', 7000: 'AirPlay Receiver on macOS'
}

/** Warnings for privileged or commonly OS-owned ports. Never blocks scaffolding. */
export function findReservedPortWarnings(settings: ProjectSettings): string[] {
  const warnings: string[] = []
  for (const use of collectPortUses(settings)) {
    if (use.kind === 'proxy' && use.port < 1024) continue
    if (use.port < 1024) warnings.push(`Port ${use.port} (${use.owner}) is privileged; binding it needs root or an elevated shell.`)
    else if (COMMONLY_CLAIMED[use.port]) warnings.push(`Port ${use.port} (${use.owner}) is commonly used by ${COMMONLY_CLAIMED[use.port]}.`)
  }
  return warnings
}

/** Applies each conflict's suggestion to the last owner of that port. Returns a patched copy. */
export function applyPortSuggestions(settings: ProjectSettings, conflicts = findPortConflicts(settings)): ProjectSettings {
  const next: ProjectSettings = JSON.parse(JSON.stringify(settings))
  for (const conflict of conflicts) {
    const owner = conflict.owners[conflict.owners.length - 1]
    if (owner.kind === 'app') {
      const app = next.apps.find(item => item.id === owner.ownerId)
      if (app) app.port = conflict.suggestion
    } else if (owner.kind === 'database') {
      const db = next.databases.find(item => (item.id || item.type) === owner.ownerId)
      if (db) db.port = conflict.suggestion
    } else if (owner.kind === 'admin-ui') {
      const db = next.databases.find(item => (item.id || item.type) === owner.ownerId)
      if (db) db.adminUiPort = conflict.suggestion
    } else if (owner.kind === 'proxy') {
      next.proxy.httpPort = conflict.suggestion
    }
  }
  return next
}
