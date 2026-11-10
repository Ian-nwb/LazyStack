import { AppRole, ArchitecturePreset, FolderStructureConfig, ProjectSettings } from '../types'

export interface ArchitecturePresetMeta {
  id: ArchitecturePreset
  name: string
  tagline: string
  description: string
  icon: string
  badgeColor: string
  config: FolderStructureConfig
  /** Extra root-level folders this layout creates, each with a README so git keeps it. */
  scaffoldDirs: PresetScaffoldDir[]
}

export interface PresetScaffoldDir {
  /** Folder relative to `base`; an empty path means the base folder itself. */
  path: string
  /** `packages` resolves under the configured shared-packages root, `root` under the project root. */
  base: 'root' | 'packages'
  /** Written to the folder's README.md. */
  purpose: string
}

export const ARCHITECTURE_PRESETS: ArchitecturePresetMeta[] = [
  {
    id: 'monorepo',
    name: 'Standard Monorepo',
    tagline: 'Apps in apps/, shared code in packages/',
    description: 'Every app lives under apps/, shared code under packages/, and orchestration under infra/. A good default for full-stack web projects.',
    icon: '📦',
    badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    config: {
      preset: 'monorepo',
      isCustom: false,
      appsDir: 'apps',
      infraDir: 'infra',
      packagesDir: 'packages',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    scaffoldDirs: []
  },
  {
    id: 'microservices',
    name: 'Microservices Decoupled',
    tagline: 'One folder per service, per-service data stores',
    description: 'Every service gets a folder under services/ and, when it has its own database, a db/ folder with schema and migrations. Contracts shared between services live in shared/contracts.',
    icon: '⚡',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    config: {
      preset: 'microservices',
      isCustom: false,
      appsDir: 'services',
      infraDir: 'infra',
      packagesDir: 'shared',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    scaffoldDirs: [
      { path: 'contracts', base: 'packages', purpose: 'API and message contracts shared by more than one service.' }
    ]
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    tagline: 'Apps split by role into frontend/ and backend/',
    description: 'Apps are placed by role: frontends in frontend/clients, backend services in backend/services, workers in backend/workers and desktop or mobile apps in clients/desktop. Deployment config lives in deploy/.',
    icon: '🌐',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    config: {
      preset: 'polyglot',
      isCustom: false,
      appsDir: 'apps',
      appDirectories: {
        frontend: 'frontend/clients',
        backend: 'backend/services',
        fullstack: 'apps/fullstack',
        worker: 'backend/workers',
        'desktop-mobile': 'clients/desktop',
        other: 'apps/other'
      },
      infraDir: 'deploy',
      packagesDir: 'shared',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    scaffoldDirs: []
  },
  {
    id: 'modular-monolith',
    name: 'Modular Monolith',
    tagline: 'Feature modules in modules/, shared libs in libs/',
    description: 'Every module is a folder under modules/ with shared libraries in libs/. Data stores are per module; caches and message brokers are shared by all modules.',
    icon: '🧩',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    config: {
      preset: 'modular-monolith',
      isCustom: false,
      appsDir: 'modules',
      infraDir: 'infra',
      packagesDir: 'libs',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'hybrid'
    },
    scaffoldDirs: []
  },
  {
    id: 'serverless',
    name: 'Serverless & Cloud-Native',
    tagline: 'Functions in functions/, web clients in web/',
    description: 'Backend handlers live in functions/, frontend and full-stack apps in web/, shared code in shared/ and cloud infrastructure (Terraform, Compose) in infra/.',
    icon: '☁️',
    badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    config: {
      preset: 'serverless',
      isCustom: false,
      appsDir: 'functions',
      appDirectories: {
        frontend: 'web',
        fullstack: 'web'
      },
      infraDir: 'infra',
      packagesDir: 'shared',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    scaffoldDirs: []
  },
  {
    id: 'event-driven',
    name: 'Event-Driven Services',
    tagline: 'Services, consumers and typed event contracts',
    description: 'API services live in services/, background consumers in consumers/, frontends in frontend/apps, and typed event schemas in events/. Brokers and deployment config live in infra/.',
    icon: '📨',
    badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    config: {
      preset: 'event-driven',
      isCustom: false,
      appsDir: 'services',
      appDirectories: {
        frontend: 'frontend/apps',
        backend: 'services',
        fullstack: 'apps/fullstack',
        worker: 'consumers',
        'desktop-mobile': 'clients/desktop',
        other: 'services/other'
      },
      infraDir: 'infra',
      packagesDir: 'events',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    scaffoldDirs: [
      { path: '', base: 'packages', purpose: 'Typed event schemas, publishers and consumer harnesses shared by producers and consumers.' }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Structure',
    tagline: 'Your own directory contract',
    description: 'Choose the root folders for apps, infrastructure, packages, docs and scripts, and map each app role to its own folder.',
    icon: '🛠️',
    badgeColor: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300',
    config: {
      preset: 'custom',
      isCustom: true,
      appsDir: 'services',
      infraDir: 'infra',
      packagesDir: 'packages',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    scaffoldDirs: []
  }
]

const APP_ROLES: AppRole[] = ['frontend', 'backend', 'fullstack', 'worker', 'desktop-mobile', 'other']
const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

/** Where each app role lands under a structure config, with roles that share a folder grouped. */
export function getRoleFolders(config: FolderStructureConfig): Array<{ folder: string; roles: AppRole[] }> {
  const groups = new Map<string, AppRole[]>()
  for (const role of APP_ROLES) {
    const folder = trimSlashes(config.appDirectories?.[role] || config.appsDir || 'apps')
    groups.set(folder, [...(groups.get(folder) || []), role])
  }
  return [...groups].map(([folder, roles]) => ({ folder, roles }))
}

/** Extra folders a preset creates, resolved to project-relative paths. */
export function resolvePresetScaffoldDirs(config: FolderStructureConfig): Array<{ path: string; purpose: string }> {
  const meta = ARCHITECTURE_PRESETS.find(item => item.id === config.preset)
  const packages = trimSlashes(config.packagesDir || 'packages')
  return (meta?.scaffoldDirs || []).map(dir => ({
    path: dir.base === 'packages' ? trimSlashes(dir.path ? `${packages}/${dir.path}` : packages) : trimSlashes(dir.path),
    purpose: dir.purpose
  }))
}

/** Layouts that existed in earlier versions. Blueprints that name one keep their folders and open as Custom. */
export function normalizeStructureConfig(config: FolderStructureConfig): FolderStructureConfig
export function normalizeStructureConfig(config: FolderStructureConfig | undefined): FolderStructureConfig | undefined
export function normalizeStructureConfig(config: FolderStructureConfig | undefined): FolderStructureConfig | undefined {
  if (!config || ARCHITECTURE_PRESETS.some(preset => preset.id === config.preset)) return config
  return { ...config, preset: 'custom', isCustom: true }
}

export function getDefaultStructureConfig(): FolderStructureConfig {
  return {
    preset: 'monorepo',
    isCustom: false,
    appsDir: 'apps',
    infraDir: 'infra',
    packagesDir: 'packages',
    docsDir: 'docs',
    scriptsDir: 'scripts',
    databaseIsolation: 'centralized'
  }
}

/**
 * Resolves the effective folder paths for a project based on its structureConfig.
 */
export function resolveStructurePaths(settings: ProjectSettings) {
  const config = settings.structureConfig || getDefaultStructureConfig()
  return {
    appsDir: (config.appsDir || 'apps').replace(/^\/+|\/+$/g, ''),
    appDirectories: config.appDirectories || {},
    infraDir: (config.infraDir || 'infra').replace(/^\/+|\/+$/g, ''),
    packagesDir: (config.packagesDir || 'packages').replace(/^\/+|\/+$/g, ''),
    docsDir: (config.docsDir || 'docs').replace(/^\/+|\/+$/g, ''),
    scriptsDir: (config.scriptsDir || 'scripts').replace(/^\/+|\/+$/g, ''),
    databaseIsolation: config.databaseIsolation || 'centralized',
    getAppRelativePath: (folderName: string, appId?: string, role?: import('../types').AppRole) => {
      if (config.customAppPaths && appId && config.customAppPaths[appId]) {
        return config.customAppPaths[appId].replace(/^\/+|\/+$/g, '')
      }
      const roleRoot = role ? config.appDirectories?.[role] : undefined
      if (roleRoot) return `${roleRoot.replace(/^\/+|\/+$/g, '')}/${folderName}`
      const base = (config.appsDir || 'apps').replace(/^\/+|\/+$/g, '')
      return `${base}/${folderName}`
    }
  }
}
