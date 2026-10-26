import { ArchitecturePreset, FolderStructureConfig, ProjectSettings } from '../types'

export interface ArchitecturePresetMeta {
  id: ArchitecturePreset
  name: string
  tagline: string
  description: string
  icon: string
  badgeColor: string
  config: FolderStructureConfig
  previewTree: string
}

export const ARCHITECTURE_PRESETS: ArchitecturePresetMeta[] = [
  {
    id: 'monorepo',
    name: 'Standard Monorepo',
    tagline: 'Standard Turborepo / Nx monorepo layout',
    description: 'Centralized apps/ directory with shared packages/ and infra/ orchestration. Great for full-stack web apps and shared libraries.',
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
    previewTree: `├── 📁 apps/
│   ├── 📁 web-client/
│   └── 📁 api-server/
├── 📁 infra/
│   ├── 📄 docker-compose.yml
│   └── 📁 nginx/
├── 📁 packages/
│   ├── 📁 types/
│   └── 📁 shared/
├── 📁 docs/
└── 📁 scripts/`
  },
  {
    id: 'microservices',
    name: 'Microservices Decoupled',
    tagline: 'Database-per-Service with independent domain isolation',
    description: 'Each service has its own dedicated directory, local db/ migrations, and environment secrets. Ideal for scalable backend teams.',
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
    previewTree: `├── 📁 services/
│   ├── 📁 auth-service/
│   │   ├── 📁 src/
│   │   ├── 📁 db/ (migrations & seed)
│   │   └── 📄 .env (AUTH_DB_URL)
│   └── 📁 order-service/
│       ├── 📁 src/
│       ├── 📁 db/ (migrations & seed)
│       └── 📄 .env (ORDER_DB_URL)
├── 📁 infra/
│   ├── 📄 docker-compose.yml
│   └── 📁 gateway/
├── 📁 shared/
│   ├── 📁 contracts/
│   └── 📁 events/
└── 📁 scripts/`
  },
  {
    id: 'domain-driven',
    name: 'Domain-Driven Design (DDD)',
    tagline: 'Bounded contexts with domain isolation and core kernels',
    description: 'Organizes microservices around business domains (identity, billing, catalog) with shared core kernel definitions.',
    icon: '🏛️',
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    config: {
      preset: 'domain-driven',
      isCustom: false,
      appsDir: 'domains',
      infraDir: 'infra',
      packagesDir: 'core',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    previewTree: `├── 📁 domains/
│   ├── 📁 identity/
│   │   ├── 📁 api/
│   │   └── 📁 db/
│   └── 📁 billing/
│       ├── 📁 api/
│       └── 📁 db/
├── 📁 core/
│   ├── 📁 domain-events/
│   └── 📁 types/
├── 📁 infra/
│   └── 📄 docker-compose.yml
└── 📁 docs/`
  },
  {
    id: 'polyglot',
    name: 'Polyglot Full-Stack Split',
    tagline: 'Explicit backend vs frontend separation with deploy orchestration',
    description: 'Separates backend microservices into backend/services and user interfaces into frontend/clients, with deployment configs in deploy/.',
    icon: '🌐',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    config: {
      preset: 'polyglot',
      isCustom: false,
      appsDir: 'backend/services',
      infraDir: 'deploy',
      packagesDir: 'shared',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    previewTree: `├── 📁 backend/
│   └── 📁 services/
│       ├── 📁 api-gateway/
│       └── 📁 user-service/
├── 📁 frontend/
│   └── 📁 clients/
│       └── 📁 web-dashboard/
├── 📁 deploy/
│   ├── 📄 docker-compose.yml
│   └── 📁 k8s/
├── 📁 shared/
└── 📁 docs/`
  },
  {
    id: 'modular-monolith',
    name: 'Modular Monolith',
    tagline: 'Feature modules with high cohesion and shared libs',
    description: 'Keeps all microservices as feature modules inside modules/ with unified deployment and clean boundaries.',
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
    previewTree: `├── 📁 modules/
│   ├── 📁 auth/
│   ├── 📁 billing/
│   └── 📁 notifications/
├── 📁 apps/ (host wrappers)
├── 📁 libs/ (shared utilities)
├── 📁 infra/
└── 📁 docs/`
  },
  {
    id: 'hexagonal',
    name: 'Hexagonal / Ports & Adapters',
    tagline: 'Domain logic decoupled from external infrastructure',
    description: 'Strict separation between domain logic (core/), inbound/outbound ports (adapters/), and runnable microservices.',
    icon: '🔷',
    badgeColor: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    config: {
      preset: 'hexagonal',
      isCustom: false,
      appsDir: 'services',
      infraDir: 'infra',
      packagesDir: 'core',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    previewTree: `├── 📁 services/
│   └── 📁 order-service/
│       ├── 📁 core/ (pure domain logic)
│       ├── 📁 adapters/ (db, http, event handlers)
│       └── 📁 ports/ (interfaces)
├── 📁 infra/
│   └── 📄 docker-compose.yml
├── 📁 core/ (shared value objects)
└── 📁 scripts/`
  },
  {
    id: 'serverless',
    name: 'Serverless & Cloud-Native',
    tagline: 'Functions, web frontend, and cloud infra templates',
    description: 'Designed for cloud-native setups with functions/ for micro-handlers, web/ for frontends, and terraform/ or cdk/ under infra/.',
    icon: '☁️',
    badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    config: {
      preset: 'serverless',
      isCustom: false,
      appsDir: 'functions',
      infraDir: 'infra',
      packagesDir: 'shared',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    previewTree: `├── 📁 functions/
│   ├── 📁 auth-handler/
│   └── 📁 webhook-listener/
├── 📁 web/ (SPA / Edge client)
├── 📁 infra/
│   ├── 📁 terraform/
│   └── 📄 docker-compose.yml
├── 📁 shared/
└── 📁 docs/`
  },
  {
    id: 'custom',
    name: 'Custom Structure',
    tagline: 'Define your own directory contract and paths',
    description: 'Customize root service folders, infrastructure directory, shared packages, and per-service path overrides.',
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
    previewTree: `├── 📁 [custom_services]/
├── 📁 [custom_infra]/
├── 📁 [custom_packages]/
├── 📁 [custom_docs]/
└── 📁 [custom_scripts]/`
  }
]

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
    infraDir: (config.infraDir || 'infra').replace(/^\/+|\/+$/g, ''),
    packagesDir: (config.packagesDir || 'packages').replace(/^\/+|\/+$/g, ''),
    docsDir: (config.docsDir || 'docs').replace(/^\/+|\/+$/g, ''),
    scriptsDir: (config.scriptsDir || 'scripts').replace(/^\/+|\/+$/g, ''),
    databaseIsolation: config.databaseIsolation || 'centralized',
    getAppRelativePath: (folderName: string, appId?: string) => {
      if (config.customAppPaths && appId && config.customAppPaths[appId]) {
        return config.customAppPaths[appId].replace(/^\/+|\/+$/g, '')
      }
      const base = (config.appsDir || 'apps').replace(/^\/+|\/+$/g, '')
      return `${base}/${folderName}`
    }
  }
}
