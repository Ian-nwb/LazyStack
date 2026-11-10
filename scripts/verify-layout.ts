/**
 * Guards against drift between the architecture presets, the scaffold planner and what the UI shows.
 * Run with `npm run verify:layout` (also run in CI).
 */
import { planScaffold } from '../electron/scaffolding/plan'
import { scaffoldProject } from '../electron/scaffolding/generator'
import { generateDockerCompose } from '../electron/scaffolding/templates/docker'
import { createDatabaseCredentials } from '../electron/scaffolding/templates/meta'
import { buildStackTopology } from '../src/utils/stackTopology'
import { networkViewColumns, serviceViewColumns } from '../src/components/diagram/views'
import { ARCHITECTURE_PRESETS, getRoleFolders, resolvePresetScaffoldDirs, resolveStructurePaths } from '../src/data/structurePresets'
import { buildPlanTree, PlanTreeNode } from '../src/utils/planTree'
import type { AppRole, CartApp, ProjectSettings, SelectedDatabase } from '../src/types'

const failures: string[] = []
const fail = (scope: string, message: string) => failures.push(`${scope}: ${message}`)

const ROLES: Array<[AppRole, string]> = [
  ['frontend', 'react-vite'], ['backend', 'python-fastapi'], ['fullstack', 'fullstack-nextjs'],
  ['worker', 'ts-express'], ['desktop-mobile', 'tauri-app'], ['other', 'go-gin']
]
const apps: CartApp[] = ROLES.map(([role, techId], index) => ({
  id: `app-${role}`, folderName: `${role}-app`, role, techId, port: 3000 + index * 10,
  runMode: techId === 'tauri-app' ? 'host' : 'docker', routePrefix: `/${role}`
}))

/** A cart that exercises gateway routing, host processes, every data-service kind and both sidecar types. */
const richApps: CartApp[] = [
  { id: 'web', folderName: 'web', role: 'frontend', techId: 'react-vite', port: 5173, runMode: 'docker', routePrefix: '/', connections: [{ targetAppId: 'api', envVar: 'VITE_API_URL', protocol: 'http' }] },
  { id: 'api', folderName: 'api', role: 'backend', techId: 'python-fastapi', port: 8000, runMode: 'docker', routePrefix: '/api', testingTools: ['swagger-openapi'],
    healthCheck: { enabled: true, type: 'http', path: '/health', intervalSeconds: 10, timeoutSeconds: 5, retries: 3, startPeriodSeconds: 5 },
    connections: [{ targetAppId: 'bill', envVar: 'BILL_API_URL', protocol: 'http' }] },
  { id: 'bill', folderName: 'bill', role: 'backend', techId: 'go-gin', port: 8100, runMode: 'host', routePrefix: '/bill' },
  { id: 'jobs', folderName: 'jobs', role: 'worker', techId: 'ts-express', port: 9000, runMode: 'docker', routePrefix: '/jobs' },
  { id: 'desk', folderName: 'desk', role: 'desktop-mobile', techId: 'tauri-app', port: 1420, runMode: 'host', routePrefix: '/desk' }
]
const richDatabases: SelectedDatabase[] = [
  { id: 'cloud', type: 'supabase', enabled: true, port: 0, assignedAppId: 'web' },
  { id: 'off', type: 'mysql', enabled: false, port: 3306 },
  { id: 'pg-api', type: 'postgres', enabled: true, port: 5432, assignedAppId: 'api', adminUi: 'adminer', adminUiPort: 8088 },
  { id: 'pg-bill', type: 'postgres', enabled: true, port: 5433, assignedAppId: 'bill' },
  { id: 'redis', type: 'redis', enabled: true, port: 6379, assignedAppId: 'global' },
  { id: 'kafka', type: 'kafka', enabled: true, port: 9092, assignedAppId: 'global' },
  { id: 'lite', type: 'sqlite', enabled: true, port: 0, assignedAppId: 'jobs' }
]

/** `services:` keys and the host:container ports of a generated Compose file (the emitter's format is fixed, so line parsing is enough). */
function parseCompose(yaml: string): Map<string, Set<string>> {
  const services = new Map<string, Set<string>>()
  let inServices = false
  let current: Set<string> | null = null
  let inPorts = false
  for (const line of yaml.split('\n')) {
    if (/^services:/.test(line)) { inServices = true; continue }
    if (!inServices) continue
    if (/^\S/.test(line)) break
    const header = line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if (header) { current = new Set(); services.set(header[1], current); inPorts = false; continue }
    if (/^    \S/.test(line)) inPorts = /^    ports:/.test(line)
    const port = inPorts && current ? line.match(/^      - "(.+)"$/)?.[1] : undefined
    if (port) current!.add(port.replace(/^127\.0\.0\.1:/, '').replace(/\$\{[^:}]+:-(\d+)\}/, '$1'))
  }
  return services
}

/** Every directory the plan creates or implies through a file path. */
function plannedDirectories(plan: ReturnType<typeof planScaffold>): Set<string> {
  const all = new Set<string>()
  for (const entry of [...plan.dirs, ...Object.keys(plan.files)]) {
    const parts = entry.split('/')
    for (let i = 1; i <= parts.length; i++) all.add(parts.slice(0, i).join('/'))
  }
  return all
}

for (const preset of ARCHITECTURE_PRESETS) {
  for (const unified of [true, false]) {
    const scope = `${preset.id}${unified ? '' : ' (native-only)'}`
    const settings: ProjectSettings = {
      projectName: 'verify', parentDir: '/tmp', targetDir: '', proxy: { type: 'nginx', httpPort: 8080 },
      structureConfig: preset.config, useUnifiedWorkspace: unified, apps,
      databases: [{ id: 'db', type: 'postgres', enabled: true, port: 5432, assignedAppId: 'app-backend' }]
    }
    const plan = planScaffold(settings, createDatabaseCredentials(settings))
    const dirs = plannedDirectories(plan)
    const paths = resolveStructurePaths(settings)

    // 1. Every folder the preset promises is created, with a README so git keeps it.
    for (const dir of resolvePresetScaffoldDirs(preset.config)) {
      if (!dirs.has(dir.path)) fail(scope, `scaffold folder '${dir.path}' is not in the plan`)
      if (!plan.files[`${dir.path}/README.md`]) fail(scope, `scaffold folder '${dir.path}' has no README.md`)
    }

    // 2. Apps land in the folder the preset card advertises for their role.
    const roleFolders = new Map(getRoleFolders(preset.config).flatMap(group => group.roles.map(role => [role, group.folder] as const)))
    for (const app of apps) {
      const rel = paths.getAppRelativePath(app.folderName, app.id, app.role)
      if (!rel.startsWith(`${roleFolders.get(app.role)}/`)) fail(scope, `${app.role} app is at '${rel}', card says '${roleFolders.get(app.role)}/'`)
      if (!dirs.has(rel)) fail(scope, `app folder '${rel}' is not in the plan`)
    }

    // 3. Preset text only names folders that exist. Any token written like `name/` or `a/b` must be a planned folder
    //    (or a folder inside one, such as an app's db/).
    if (unified) {
      const text = `${preset.tagline} ${preset.description}`
      const tokens = [...text.matchAll(/(?<![\w./-])([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*)(\/|(?=[\s,.)]|$))/g)]
        .map(match => ({ token: match[1], explicit: match[2] === '/' }))
        .filter(({ token, explicit }) => token.includes('/') || explicit)
      for (const { token } of tokens) {
        const exists = [...dirs].some(dir => dir === token || dir.endsWith(`/${token}`))
        if (!exists) fail(scope, `text names '${token}/' but the plan has no such folder`)
      }
    }

    // 4. The Blueprint tree only shows paths that are in the plan.
    const tree = buildPlanTree(plan, settings, { appDetail: 'summary' })
    const walk = (node: PlanTreeNode) => {
      if (node.path && !dirs.has(node.path) && !plan.files[node.path]) fail(scope, `tree shows '${node.path}' which is not planned`)
      node.children.forEach(walk)
    }
    walk(tree)
  }
}

// 5. The plan equals what the generator reports for a dry run, and the topology equals the Compose file.
for (const preset of ARCHITECTURE_PRESETS) {
  for (const unified of [true, false]) {
    for (const proxyType of ['nginx', 'none'] as const) {
      const scope = `${preset.id} · ${unified ? 'unified' : 'native-only'} · proxy ${proxyType}`
      const settings: ProjectSettings = {
        projectName: 'verify', parentDir: '/tmp/lazystack-verify', targetDir: '', proxy: { type: proxyType, httpPort: 8080 },
        structureConfig: { ...preset.config, customFolders: ['configs'] }, useUnifiedWorkspace: unified, apps: richApps, databases: richDatabases
      }
      const plan = planScaffold(settings, createDatabaseCredentials(settings))
      const dry = await scaffoldProject(settings, { dryRun: true })
      if (!dry.success || !dry.changes) { fail(scope, `dry run failed: ${dry.error}`); continue }
      const planned = new Set([...Object.keys(plan.files), ...plan.diskCopies.map(copy => copy.to)])
      const reported = new Set(dry.changes.created)
      if (dry.changes.created.length !== reported.size) fail(scope, 'dry run lists a file more than once')
      for (const file of planned) if (!reported.has(file)) fail(scope, `planned file '${file}' is missing from the dry run`)
      for (const file of reported) if (!planned.has(file)) fail(scope, `dry run writes '${file}' which is not in the plan`)

      const topology = buildStackTopology(settings)
      const compose = parseCompose(generateDockerCompose(settings))
      const containers = topology.nodes.filter(node => node.serviceName)
      for (const node of containers) {
        const ports = compose.get(node.serviceName!)
        if (!ports) { fail(scope, `topology service '${node.serviceName}' is not in the Compose file`); continue }
        const expected = node.hostPort && node.containerPort ? [`${node.hostPort}:${node.containerPort}`, ...(node.extraPorts || []).map(port => `${port}:${port}`)] : []
        for (const mapping of expected) if (!ports.has(mapping)) fail(scope, `'${node.serviceName}' should publish ${mapping}, Compose has [${[...ports].join(', ')}]`)
        if (ports.size !== expected.length) fail(scope, `'${node.serviceName}' publishes [${[...ports].join(', ')}], topology says [${expected.join(', ')}]`)
      }
      const known = new Set(containers.map(node => node.serviceName))
      for (const service of compose.keys()) if (!known.has(service)) fail(scope, `Compose service '${service}' is not in the topology`)
      if (new Set([...compose.values()].flatMap(ports => [...ports].map(port => port.split(':')[0]))).size !== [...compose.values()].reduce((count, ports) => count + ports.size, 0)) fail(scope, 'two Compose services publish the same host port')

      // 6. Both diagrams place every node exactly once.
      for (const [view, columns] of [['service', serviceViewColumns(topology, settings)], ['network', networkViewColumns(topology)]] as const) {
        const placed = columns.flatMap(column => column.ids)
        if (placed.length !== new Set(placed).size) fail(scope, `${view} diagram places a node twice`)
        for (const node of topology.nodes) if (!placed.includes(node.id)) fail(scope, `${view} diagram is missing '${node.label}'`)
      }
    }
  }
}

if (failures.length) {
  console.error(`Layout verification failed (${failures.length}):\n${failures.map(item => `  - ${item}`).join('\n')}`)
  process.exit(1)
}
console.log(`Layout verification passed for ${ARCHITECTURE_PRESETS.length} architecture presets (plan, preset text, dry run, Compose and diagrams).`)
