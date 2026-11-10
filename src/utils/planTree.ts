import { ProjectSettings } from '../types'
import { resolveStructurePaths } from '../data/structurePresets'
import { isHostOnlyTech } from '../data/frameworks'

/** The planner's output, reduced to what the tree needs. Matches `ScaffoldPlan` from electron/scaffolding/plan.ts. */
export interface PlanLike {
  dirs: string[]
  files: Record<string, unknown>
}

export interface PlanTreeNode {
  name: string
  path: string
  kind: 'dir' | 'file'
  note?: string
  /** Entries left out of `children` to keep the tree readable. */
  hiddenCount?: number
  children: PlanTreeNode[]
}

export interface PlanTreeOptions {
  /** `summary` lists each app's top-level layout; `none` stops at the app folder. */
  appDetail?: 'none' | 'summary'
}

/** App sub-folders whose own sub-folders are worth showing (e.g. `src/components/`). */
const EXPANDED_DIRS = new Set(['src', 'app', 'lib', 'Sources', 'internal', 'resources', 'routes'])
const MAX_APP_ENTRIES = 18
/** Directories deeper than this are collapsed unless they lead to an app. */
const MAX_DEPTH = 2

interface RawNode { name: string; path: string; kind: 'dir' | 'file'; children: Map<string, RawNode> }

function insert(root: RawNode, filePath: string, kind: 'dir' | 'file') {
  const parts = filePath.split('/').filter(Boolean)
  let node = root
  parts.forEach((part, index) => {
    const isLeaf = index === parts.length - 1
    const nodePath = parts.slice(0, index + 1).join('/')
    let child = node.children.get(part)
    if (!child) {
      child = { name: part, path: nodePath, kind: isLeaf ? kind : 'dir', children: new Map() }
      node.children.set(part, child)
    }
    node = child
  })
}

const sortNodes = (nodes: PlanTreeNode[]) => nodes.sort((a, b) =>
  a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1)

/** Fixed annotations for the files and folders every generated project has. */
function buildNotes(settings: ProjectSettings): Map<string, string> {
  const paths = resolveStructurePaths(settings)
  const notes = new Map<string, string>([
    ['.github', 'CI/CD automation'],
    ['.github/workflows', 'CI and deploy workflows'],
    ['.vscode', 'recommended editor settings'],
    [paths.docsDir, 'architecture documentation'],
    [`${paths.docsDir}/architecture.md`, 'service diagram and network topology (Mermaid)'],
    [paths.infraDir, 'orchestration and cloud export'],
    [`${paths.infraDir}/docker-compose.yml`, 'production Compose file'],
    [`${paths.infraDir}/docker-compose.dev.yml`, 'development override'],
    [`${paths.infraDir}/terraform`, 'Terraform / OpenTofu modules'],
    [`${paths.infraDir}/k8s`, 'Kubernetes manifests'],
    [`${paths.infraDir}/helm`, 'Helm chart'],
    [`${paths.infraDir}/sqlite`, 'shared SQLite volume'],
    [paths.scriptsDir, 'dev orchestrator, dev.sh and dev.ps1'],
    [paths.packagesDir, 'shared packages and contracts'],
    ['tests', 'integration test harness'],
    ['.env', 'secrets (git-ignored)'],
    ['.env.example', 'environment template'],
    ['lazystack.json', 'embedded blueprint'],
    ['pnpm-workspace.yaml', 'JS workspace definition'],
    ['turbo.json', 'task pipeline']
  ])
  if (settings.proxy.type !== 'none') notes.set(`${paths.infraDir}/${settings.proxy.type}`, 'reverse proxy gateway configuration')
  for (const folder of settings.structureConfig?.customFolders || []) notes.set(folder, 'custom root folder')
  for (const app of settings.apps) {
    const flavor = app.flavor ? ` [${app.flavor}]` : ''
    notes.set(paths.getAppRelativePath(app.folderName, app.id, app.role),
      `${app.role} · ${app.techId}${flavor} · port ${app.port} · ${isHostOnlyTech(app.techId) ? 'host' : app.runMode}`)
  }
  return notes
}

/**
 * Folds a scaffold plan into a display tree. Every node comes from the plan, so the tree cannot
 * show a path the generator does not write.
 */
export function buildPlanTree(plan: PlanLike, settings: ProjectSettings, options: PlanTreeOptions = {}): PlanTreeNode {
  const detail = options.appDetail ?? 'summary'
  const paths = resolveStructurePaths(settings)
  const notes = buildNotes(settings)
  const appPaths = new Set(settings.apps.map(app => paths.getAppRelativePath(app.folderName, app.id, app.role)))
  const raw: RawNode = { name: settings.projectName || 'project', path: '', kind: 'dir', children: new Map() }
  for (const dir of plan.dirs) insert(raw, dir, 'dir')
  for (const file of Object.keys(plan.files)) insert(raw, file, 'file')

  const leadsToApp = (nodePath: string) => [...appPaths].some(app => app === nodePath || app.startsWith(`${nodePath}/`))

  const convert = (node: RawNode, depth: number, insideApp: boolean, appRelDepth: number): PlanTreeNode => {
    const out: PlanTreeNode = { name: node.name, path: node.path, kind: node.kind, note: notes.get(node.path), children: [] }
    if (node.kind === 'file') {
      if (insideApp && !out.note) {
        if (node.name === 'Dockerfile') out.note = 'container build'
        if (node.name === '.env') out.note = 'service config and connections'
      }
      return out
    }
    const isApp = appPaths.has(node.path)
    const children = [...node.children.values()]
    let shown = children
    if (isApp) {
      shown = detail === 'none' ? [] : children.filter(child => child.kind === 'dir' || !child.name.startsWith('.') || child.name === '.env')
    } else if (insideApp) {
      shown = appRelDepth === 1 && EXPANDED_DIRS.has(node.name) ? children.filter(child => child.kind === 'dir') : []
    } else if (depth >= MAX_DEPTH) {
      shown = children.filter(child => leadsToApp(child.path))
    }
    const insideNext = insideApp || isApp
    const nextRel = isApp ? 1 : appRelDepth + 1
    out.children = sortNodes(shown.map(child => convert(child, depth + 1, insideNext, nextRel)))
    if ((insideApp || isApp) && out.children.length > MAX_APP_ENTRIES) {
      out.hiddenCount = out.children.length - MAX_APP_ENTRIES
      out.children = out.children.slice(0, MAX_APP_ENTRIES)
    }
    if (insideApp && node.name === 'db') out.note = 'schema, migrations and seeds'
    return out
  }

  return convert(raw, 0, false, 0)
}

/** Plain-text rendering used in the generated README and by the CLI. */
export function renderPlanTreeText(root: PlanTreeNode): string {
  const rows: Array<{ label: string; note?: string }> = [{ label: `${root.name}/` }]
  const walk = (node: PlanTreeNode, prefix: string) => {
    node.children.forEach((child, index) => {
      const last = index === node.children.length - 1 && !node.hiddenCount
      rows.push({ label: `${prefix}${last ? '└── ' : '├── '}${child.name}${child.kind === 'dir' ? '/' : ''}`, note: child.note })
      walk(child, `${prefix}${last ? '    ' : '│   '}`)
    })
    if (node.hiddenCount) rows.push({ label: `${prefix}└── … ${node.hiddenCount} more` })
  }
  walk(root, '')
  const width = Math.min(Math.max(...rows.map(row => row.label.length)) + 2, 56)
  return rows.map(row => row.note ? `${row.label.padEnd(width)}# ${row.note}` : row.label).join('\n')
}
