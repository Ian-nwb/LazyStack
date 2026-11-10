/**
 * Guards against drift between the architecture presets, the scaffold planner and what the UI shows.
 * Run with `npm run verify:layout` (also run in CI).
 */
import { planScaffold } from '../electron/scaffolding/plan'
import { createDatabaseCredentials } from '../electron/scaffolding/templates/meta'
import { ARCHITECTURE_PRESETS, getRoleFolders, resolvePresetScaffoldDirs, resolveStructurePaths } from '../src/data/structurePresets'
import { buildPlanTree, PlanTreeNode } from '../src/utils/planTree'
import type { AppRole, CartApp, ProjectSettings } from '../src/types'

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

if (failures.length) {
  console.error(`Layout verification failed (${failures.length}):\n${failures.map(item => `  - ${item}`).join('\n')}`)
  process.exit(1)
}
console.log(`Layout verification passed for ${ARCHITECTURE_PRESETS.length} architecture presets.`)
