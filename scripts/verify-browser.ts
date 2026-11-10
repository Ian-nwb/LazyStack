/**
 * The Blueprint preview runs the scaffold planner inside the Electron/Vite renderer, where Node
 * globals such as `process` do not exist. This bundles that code for the browser and runs it in a
 * context that has none, for every framework, database, proxy and architecture layout.
 * Run with `npm run verify:browser` (also run in CI).
 */
import { planScaffold } from '../electron/scaffolding/plan'
import { createDatabaseCredentials } from '../electron/scaffolding/templates/meta'
import { generateDockerCompose } from '../electron/scaffolding/templates/docker'
import { TECH_CATALOG, isHostOnlyTech } from '../src/data/frameworks'
import { DATABASE_CATALOG } from '../src/data/databases'
import { ARCHITECTURE_PRESETS } from '../src/data/structurePresets'
import { buildPlanTree, renderPlanTreeText } from '../src/utils/planTree'
import { buildStackTopology } from '../src/utils/stackTopology'
import { renderArchitectureMarkdown } from '../src/utils/architectureDoc'
import { serviceViewColumns, networkViewColumns, serviceNodeLines, networkNodeLines } from '../src/components/diagram/views'
import type { CartApp, ProjectSettings } from '../src/types'

const failures: string[] = []
let runs = 0

const settingsFor = (apps: CartApp[], databases: ProjectSettings['databases'], layout: (typeof ARCHITECTURE_PRESETS)[number], proxy: ProjectSettings['proxy']['type']): ProjectSettings => ({
  projectName: 'demo', parentDir: '', targetDir: '', proxy: { type: proxy, httpPort: 8080 }, apps, databases, structureConfig: layout.config, useUnifiedWorkspace: true
})
const everyDatabase = DATABASE_CATALOG.map((db, index) => ({ id: `db${index}`, type: db.id, enabled: true, port: 20000 + index, assignedAppId: index % 2 ? 'global' : 'a' }))

/** Everything the Blueprint tabs call to render. */
function exercise(label: string, settings: ProjectSettings) {
  runs++
  try {
    const plan = planScaffold(settings, createDatabaseCredentials(settings))
    renderPlanTreeText(buildPlanTree(plan, settings, { appDetail: 'summary' }))
    buildPlanTree(plan, settings, { appDetail: 'none' })
    const topology = buildStackTopology(settings)
    serviceViewColumns(topology, settings)
    networkViewColumns(topology)
    for (const node of topology.nodes) { serviceNodeLines(topology, settings)(node); networkNodeLines(settings)(node) }
    renderArchitectureMarkdown(settings)
    generateDockerCompose(settings)
  } catch (error) {
    const e = error as Error
    failures.push(`${label}: ${e.message} (${String(e.stack).split('\n')[1]?.trim()})`)
  }
}

for (const tech of TECH_CATALOG) {
  for (const runMode of isHostOnlyTech(tech.id) ? (['host'] as const) : (['docker', 'host'] as const)) {
    const app: CartApp = { id: 'a', folderName: 'app', role: tech.role, techId: tech.id, port: tech.defaultPort || 3000, runMode, routePrefix: '/app', testingTools: ['swagger-openapi'] }
    exercise(`${tech.id} (${runMode})`, settingsFor([app], everyDatabase, ARCHITECTURE_PRESETS[0], 'nginx'))
  }
}
const mixed: CartApp[] = TECH_CATALOG.slice(0, 6).map((tech, index) => ({
  id: `m${index}`, folderName: `m${index}`, role: tech.role, techId: tech.id, port: 4000 + index, runMode: isHostOnlyTech(tech.id) ? 'host' : 'docker', routePrefix: `/m${index}`
}))
for (const layout of ARCHITECTURE_PRESETS) {
  for (const proxy of ['nginx', 'apache', 'caddy', 'traefik', 'none'] as const) exercise(`${layout.id} + ${proxy}`, settingsFor(mixed, everyDatabase, layout, proxy))
  exercise(`${layout.id} (empty blueprint)`, settingsFor([], [], layout, 'none'))
}

;(globalThis as { RESULT?: string }).RESULT = failures.length
  ? `FAIL ${failures.length} of ${runs}\n${failures.slice(0, 10).join('\n')}`
  : `OK ${runs} runs with no Node globals`
