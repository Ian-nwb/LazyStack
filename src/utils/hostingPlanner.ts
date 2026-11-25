import { CartApp, HostingType, ProjectSettings, SelectedDatabase, TechItem } from '../types'
import { TECH_CATALOG } from '../data/frameworks'
import { DATABASE_CATALOG } from '../data/databases'
import { resolveStructurePaths } from '../data/structurePresets'
import { DEFAULT_HOSTING, GeneratedFileKind, getHostingOption } from '../data/hosting'
import { getAppDatabases } from './databaseScope'

/**
 * Hosting planner: suggests what kind of hosting each app needs from its role, tech and
 * connections. Advice only: it never changes what the generator writes.
 */

export interface HostingAlternative {
  type: HostingType
  why: string
}

export interface HostingSuggestion {
  /** `null` for apps that run on the user's device (desktop, mobile, extensions). */
  type: HostingType | null
  reasons: string[]
  alternatives: HostingAlternative[]
}

export interface GeneratedFileRef {
  kind: GeneratedFileKind
  label: string
  /** Project-relative path, when the file or folder exists for this stack. */
  path?: string
}

export interface AppHostingPlan {
  app: CartApp
  tech?: TechItem
  suggestion: HostingSuggestion
  /** The type saved in the blueprint, if any. */
  override?: HostingType
  /** What the app uses: the saved type, else `local`, else `null` for device apps. */
  effective: HostingType | null
  files: GeneratedFileRef[]
}

export interface HostingPlan {
  apps: AppHostingPlan[]
  notes: string[]
}

/** Database categories that hold application data (as opposed to caches, brokers, search or dev tools). */
const DATA_STORE_CATEGORIES = new Set(['relational', 'document', 'key-value', 'olap', 'graph', 'embedded', 'vector', 'cloud-db', 'baas'])
/** Services that need a long-lived connection from a process that stays up. */
const ALWAYS_ON_CATEGORIES = new Set(['message-broker', 'workflow'])

const SERVER_ROLES = new Set(['backend', 'fullstack'])

function category(db: SelectedDatabase): string | undefined {
  return DATABASE_CATALOG.find(item => item.id === db.type)?.category
}

function serviceName(db: SelectedDatabase): string {
  return db.customName || DATABASE_CATALOG.find(item => item.id === db.type)?.name || db.type
}

function appDataServices(settings: ProjectSettings, app: CartApp): SelectedDatabase[] {
  return getAppDatabases(settings, app, { includeCloud: true, includeSqlite: true })
}

/** True when the device, not a server, runs the app. */
function runsOnDevice(app: CartApp, tech: TechItem): boolean {
  if (app.role === 'desktop-mobile' || tech.category === 'mobile-desktop') return true
  // Host-only server frameworks (Meteor, Serverpod, Anvil) are still deployed somewhere; other host-only techs are not.
  return Boolean(tech.hostOnly) && !SERVER_ROLES.has(tech.role)
}

/** The stack has no server app of its own and keeps its backend in a BaaS such as Supabase or Firebase. */
function baasOnlyBackend(settings: ProjectSettings): SelectedDatabase | undefined {
  const hasServerApp = settings.apps.some(app => SERVER_ROLES.has(app.role) || app.role === 'worker')
  if (hasServerApp) return undefined
  return settings.databases.find(db => db.enabled && category(db) === 'baas')
}

export function suggestHosting(app: CartApp, tech: TechItem, settings: ProjectSettings): HostingSuggestion {
  // 1. Desktop, mobile and other on-device apps.
  if (runsOnDevice(app, tech)) {
    return {
      type: null,
      reasons: [app.role === 'desktop-mobile' || tech.category === 'mobile-desktop'
        ? "Runs on the user's device; not hosted."
        : `${tech.name} runs on the host or on its vendor's platform; LazyStack doesn't deploy it.`],
      alternatives: []
    }
  }

  // 2. Static sites and SPAs that build to plain files.
  if (app.role === 'static-site' || (app.role === 'frontend' && tech.staticOutput)) {
    const alternatives: HostingAlternative[] = []
    const baas = baasOnlyBackend(settings)
    if (baas) alternatives.push({ type: 'baas', why: `Your backend is ${serviceName(baas)}: keep data and auth there, and host only the built files.` })
    alternatives.push(
      { type: 'paas', why: 'Serve the built files from the same platform as your API.' },
      { type: 'vps', why: 'Serve them from the same box as the rest of the stack, behind the generated proxy.' }
    )
    return {
      type: 'static',
      reasons: [app.role === 'static-site'
        ? `${tech.name} generates a static site; a CDN serves it without a server.`
        : `${tech.name} builds to static files (HTML, JS, CSS); a CDN serves them without a server.`],
      alternatives
    }
  }

  // 3. Workers and anything holding a broker, queue or workflow connection.
  const alwaysOn = appDataServices(settings, app).filter(db => ALWAYS_ON_CATEGORIES.has(category(db) || ''))
  if (app.role === 'worker' || alwaysOn.length) {
    const reasons = ['Needs an always-on process; serverless functions sleep and time out.']
    if (app.role === 'worker') reasons.unshift('Background worker.')
    if (alwaysOn.length) reasons.push(`Keeps a long-lived connection to ${alwaysOn.map(serviceName).join(', ')}.`)
    return {
      type: 'paas',
      reasons,
      alternatives: [
        { type: 'containers', why: 'Run the same image on a managed runtime with at least one instance always on.' },
        { type: 'vps', why: 'Cheapest way to keep a process running around the clock.' },
        { type: 'cloud-vm', why: 'If the broker is a managed service inside AWS, GCP or Azure.' }
      ]
    }
  }

  // 4. Full-stack and server-rendered frontends.
  if (app.role === 'fullstack' || (app.role === 'frontend' && tech.serverlessAdapter)) {
    if (tech.serverlessAdapter) {
      return {
        type: 'serverless',
        reasons: [`${tech.name} has a serverless/edge adapter, so pages and API routes run per request and scale to zero.`],
        alternatives: [
          { type: 'paas', why: 'Always on, with no cold starts or time limits.' },
          { type: 'containers', why: 'Run the generated Dockerfile on a managed runtime.' },
          { type: 'self-hosted-paas', why: 'Git-push deploys on your own server at VPS prices.' }
        ]
      }
    }
    return {
      type: 'paas',
      reasons: [`${tech.name} renders on the server and has no serverless adapter, so it runs as one always-on process.`],
      alternatives: [
        { type: 'containers', why: 'Run the generated Dockerfile on a managed runtime.' },
        { type: 'self-hosted-paas', why: 'Git-push deploys on your own server at VPS prices.' },
        { type: 'vps', why: 'Cheapest steady cost; the generated Compose file runs it as is.' }
      ]
    }
  }

  // 5. APIs with a database.
  const dataStores = appDataServices(settings, app).filter(db => DATA_STORE_CATEGORIES.has(category(db) || ''))
  if (app.role === 'backend' && dataStores.length) {
    return {
      type: 'paas',
      reasons: [`Easiest path for an API + database (${dataStores.map(serviceName).join(', ')}).`],
      alternatives: [
        { type: 'vps', why: 'Cheapest: the database runs on the same box.' },
        { type: 'cloud-vm', why: 'If you need managed databases or IAM from a hyperscaler.' },
        { type: 'containers', why: 'Run the image on a managed runtime next to a managed database.' }
      ]
    }
  }

  // 6. Everything else that ships as a Docker image.
  if (!tech.hostOnly) {
    if (tech.serverlessAdapter) {
      return {
        type: 'serverless',
        reasons: [`Light ${app.role === 'backend' ? 'API' : 'app'} on a runtime with serverless/edge support (${tech.name}).`],
        alternatives: [
          { type: 'paas', why: 'Always on, with no cold starts or time limits.' },
          { type: 'containers', why: 'Run the generated Dockerfile on a managed runtime.' }
        ]
      }
    }
    return {
      type: 'containers',
      reasons: [`${tech.name} has no serverless runtime; the generated Dockerfile runs anywhere containers do.`],
      alternatives: [
        { type: 'paas', why: 'Push the Dockerfile and let the platform run it.' },
        { type: 'kubernetes', why: 'If it joins many other services; the manifests and Helm chart are generated.' },
        { type: 'vps', why: 'Run it with the rest of the stack through the generated Compose file.' }
      ]
    }
  }

  // 7. Fallback: host-only server frameworks such as Meteor or Serverpod.
  return {
    type: 'paas',
    reasons: [`${tech.name} runs as a long-lived server process.`],
    alternatives: [
      { type: 'vps', why: 'Full control over its runtime and tooling.' },
      { type: 'cloud-vm', why: 'If it must live inside AWS, GCP or Azure.' }
    ]
  }
}

const FILE_LABELS: Record<GeneratedFileKind, string> = {
  'compose': 'Docker Compose',
  'dev-orchestrator': 'dev orchestrator',
  'env': '.env',
  'dockerfiles': 'Dockerfile',
  'fly': 'fly.toml',
  'render': 'render.yaml',
  'terraform-containers': 'Terraform (AWS ECS, GCP Cloud Run)',
  'terraform-paas': 'Terraform (DigitalOcean App Platform)',
  'k8s': 'Kubernetes manifests',
  'helm': 'Helm chart',
  'proxy': 'proxy config',
  'deploy-ssh': 'GitHub Actions SSH deploy',
  'cloud-clients': 'cloud service clients'
}

export function generatedFileLabel(kind: GeneratedFileKind): string {
  return FILE_LABELS[kind]
}

/**
 * The files LazyStack already generates for this stack that apply to a hosting type, with their paths.
 * Kinds that this stack doesn't produce (no proxy, no cloud services, host-only app) are left out.
 */
export function resolveGeneratedFiles(type: HostingType, settings: ProjectSettings, app?: CartApp): GeneratedFileRef[] {
  const paths = resolveStructurePaths(settings)
  const infra = paths.infraDir.replace(/^\/+|\/+$/g, '')
  const scripts = paths.scriptsDir.replace(/^\/+|\/+$/g, '')
  const appPath = app ? paths.getAppRelativePath(app.folderName, app.id, app.role) : undefined
  const containerized = !app || !TECH_CATALOG.find(tech => tech.id === app.techId)?.hostOnly
  const hasDockerApp = settings.apps.some(item => !TECH_CATALOG.find(tech => tech.id === item.techId)?.hostOnly && item.port > 0)
  const refs: GeneratedFileRef[] = []
  const add = (kind: GeneratedFileKind, filePath?: string) => refs.push({ kind, label: FILE_LABELS[kind], path: filePath })
  for (const kind of getHostingOption(type).generatedFiles) {
    switch (kind) {
      case 'compose': add(kind, `${infra}/docker-compose.yml`); break
      case 'dev-orchestrator': add(kind, `${scripts}/dev-orchestrator.mjs`); break
      case 'env': add(kind, '.env'); break
      case 'dockerfiles': if (containerized) add(kind, appPath ? `${appPath}/Dockerfile` : undefined); break
      case 'fly': if (containerized && (!app || app.port > 0)) add(kind, appPath ? `${appPath}/fly.toml` : undefined); break
      case 'render': if (hasDockerApp) add(kind, 'render.yaml'); break
      case 'terraform-containers':
      case 'terraform-paas': if (containerized) add(kind, `${infra}/terraform/`); break
      case 'k8s': if (containerized) add(kind, `${infra}/k8s/`); break
      case 'helm': if (containerized) add(kind, `${infra}/helm/${settings.projectName.toLowerCase()}/`); break
      case 'proxy': if (settings.proxy?.type && settings.proxy.type !== 'none') add(kind, `${infra}/${settings.proxy.type}/`); break
      case 'deploy-ssh': add(kind, '.github/workflows/deploy.yml'); break
      case 'cloud-clients':
        if (settings.databases.some(db => db.enabled && ['baas', 'cloud-db'].includes(category(db) || ''))) add(kind, `${paths.packagesDir.replace(/^\/+|\/+$/g, '')}/cloud/`)
        break
    }
  }
  return refs
}

export function planHosting(settings: ProjectSettings): HostingPlan {
  const apps: AppHostingPlan[] = settings.apps.map(app => {
    const tech = TECH_CATALOG.find(item => item.id === app.techId)
    const suggestion: HostingSuggestion = tech
      ? suggestHosting(app, tech, settings)
      : { type: 'paas', reasons: [`Unknown technology '${app.techId}'.`], alternatives: [] }
    const override = app.hosting
    const effective = override ?? (suggestion.type === null ? null : DEFAULT_HOSTING)
    return { app, tech, suggestion, override, effective, files: effective ? resolveGeneratedFiles(effective, settings, app) : [] }
  })

  const hosted = apps.filter(item => item.suggestion.type !== null)
  const serverApps = hosted.filter(item => item.suggestion.type !== 'static' && item.suggestion.type !== 'baas')
  const composeServices = settings.databases.filter(db => db.enabled && db.type !== 'sqlite' && !DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud)

  const notes: string[] = []
  if (hosted.length && hosted.every(item => item.effective === 'local')) {
    notes.push('Everything is local only (the default). Pick a type per app when you are ready to deploy; the suggestions are a starting point.')
  }
  if (hosted.length > 1 || composeServices.length > 0) {
    notes.push('Whole stack on one bill: a VPS (or Coolify/Dokku on it) with the generated Compose files.')
  }
  if (serverApps.length >= 4) {
    notes.push('Kubernetes fits: Helm chart and manifests are already generated.')
  }
  notes.push('Already on AWS/GCP/Azure? Use a cloud VM, or their container service with the generated Terraform (AWS ECS, GCP Cloud Run).')

  return { apps, notes }
}

/** Display label for an effective or suggested type (`null` = runs on the user's device). */
export function hostingLabel(type: HostingType | null): string {
  return type ? getHostingOption(type).label : 'Not hosted (on device)'
}
