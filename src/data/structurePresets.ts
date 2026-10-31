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
    name: 'Polyglot',
    tagline: 'Frontend / Backend Split across role-specific roots',
    description: 'A polyglot-friendly layout: frontend clients go in frontend/clients, backend services in backend/services, with shared code and deployment configuration alongside them.',
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
    previewTree: `├── 📁 frontend/clients/
│   └── 📁 web-dashboard/
├── 📁 backend/services/
│   ├── 📁 api-gateway/
│   └── 📁 user-service/
├── 📁 backend/workers/
├── 📁 apps/fullstack/
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
    id: 'event-driven',
    name: 'Event-Driven Services',
    tagline: 'Organize producers, consumers, and shared event contracts',
    description: 'Separates API services, background consumers, and event schemas while keeping brokers and deployment configuration in infrastructure.',
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
    previewTree: `├── 📁 services/
│   ├── 📁 api-gateway/
│   └── 📁 order-service/
├── 📁 consumers/
│   └── 📁 email-worker/
├── 📁 events/ (schemas and contracts)
├── 📁 infra/ (brokers and compose)
└── 📁 docs/`
  },
  {
    id: 'data-platform',
    name: 'Data Platform',
    tagline: 'Separate ingestion, processing, and analytics workloads',
    description: 'Groups data jobs and ingestion APIs independently from dashboards, schemas, and the infrastructure that runs pipelines.',
    icon: '📊',
    badgeColor: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
    config: {
      preset: 'data-platform',
      isCustom: false,
      appsDir: 'pipelines',
      appDirectories: {
        frontend: 'apps/dashboards',
        backend: 'services/ingestion',
        fullstack: 'apps/fullstack',
        worker: 'pipelines/jobs',
        'desktop-mobile': 'apps/clients',
        other: 'pipelines/other'
      },
      infraDir: 'infra',
      packagesDir: 'schemas',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    previewTree: `├── 📁 pipelines/jobs/
│   ├── 📁 ingestion/
│   └── 📁 transforms/
├── 📁 services/ingestion/
├── 📁 apps/dashboards/
├── 📁 schemas/ (data contracts)
├── 📁 infra/ (warehouse and orchestration)
└── 📁 docs/`
  },
  {
    id: 'ai-ml-platform',
    name: 'AI / ML & LLM Platform',
    tagline: 'Models, agent workflows, pipelines, and inference serving',
    description: 'Structured for AI products: model definitions and prompt pipelines in models/, autonomous agent workers in agents/, inference gateways in services/, and evaluation pipelines alongside shared vector schemas.',
    icon: '🤖',
    badgeColor: 'border-pink-500/40 bg-pink-500/10 text-pink-300',
    config: {
      preset: 'ai-ml-platform',
      isCustom: false,
      appsDir: 'models',
      appDirectories: {
        frontend: 'apps/dashboard',
        backend: 'services/inference',
        worker: 'agents/workers',
        fullstack: 'apps/platform',
        'desktop-mobile': 'clients/mobile',
        other: 'pipelines/eval'
      },
      infraDir: 'infra',
      packagesDir: 'prompts',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    previewTree: `├── 📁 models/ (weights, prompts, fine-tuning)
├── 📁 agents/workers/ (background agent loop)
├── 📁 services/inference/ (FastAPI / Triton serving)
├── 📁 apps/dashboard/ (UI & playground)
├── 📁 pipelines/eval/ (benchmarks & RAG eval)
├── 📁 prompts/ (versioned DSPy/LangChain schemas)
└── 📁 infra/ (vector DBs, GPUs & compose)`
  },
  {
    id: 'clean-architecture',
    name: 'Clean Architecture / Onion',
    tagline: 'Strict concentric domain isolation & dependency inversion',
    description: 'Separates enterprise core business logic from outer delivery mechanisms: domain entities in domain/, application use-cases in usecases/, inbound/outbound controllers in adapters/, and drivers in infrastructure/.',
    icon: '🧅',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    config: {
      preset: 'clean-architecture',
      isCustom: false,
      appsDir: 'services',
      appDirectories: {
        frontend: 'apps/ui',
        backend: 'services',
        worker: 'services/workers',
        fullstack: 'apps/fullstack',
        'desktop-mobile': 'clients/desktop',
        other: 'services/other'
      },
      infraDir: 'infra',
      packagesDir: 'domain',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    previewTree: `├── 📁 services/
│   └── 📁 core-service/
│       ├── 📁 domain/ (entities & business rules)
│       ├── 📁 usecases/ (application workflows)
│       ├── 📁 adapters/ (controllers, presenters)
│       └── 📁 infrastructure/ (DB repos, HTTP, gRPC)
├── 📁 domain/ (shared enterprise business rules)
├── 📁 infra/ (docker-compose & terraform)
└── 📁 docs/`
  },
  {
    id: 'cqrs',
    name: 'CQRS & Event Sourcing',
    tagline: 'Separated Command / Query paths with append-only event store',
    description: 'Decouples write-side command processors from read-side query projections with an append-only event store and pub/sub message bus.',
    icon: '⚡',
    badgeColor: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    config: {
      preset: 'cqrs',
      isCustom: false,
      appsDir: 'services',
      appDirectories: {
        frontend: 'apps/queries-ui',
        backend: 'services/commands',
        worker: 'services/projections',
        fullstack: 'apps/fullstack',
        'desktop-mobile': 'clients/desktop',
        other: 'services/other'
      },
      infraDir: 'infra',
      packagesDir: 'events',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    previewTree: `├── 📁 services/commands/ (write-side handlers)
├── 📁 services/projections/ (read-side query builders)
├── 📁 apps/queries-ui/ (read-model view clients)
├── 📁 events/ (versioned event contracts)
├── 📁 infra/ (event store, Kafka, Postgres read replica)
└── 📁 docs/`
  },
  {
    id: 'jamstack-edge',
    name: 'JAMstack & Edge Platform',
    tagline: 'Edge computing workers, headless backends & static CDNs',
    description: 'Optimized for globally distributed architectures with edge functions (Cloudflare Workers/Fastly/Vercel Edge), headless CMS/API services, and ultra-fast static web clients.',
    icon: '🚀',
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    config: {
      preset: 'jamstack-edge',
      isCustom: false,
      appsDir: 'sites',
      appDirectories: {
        frontend: 'sites/web',
        backend: 'edge/workers',
        worker: 'edge/schedulers',
        fullstack: 'sites/app',
        'desktop-mobile': 'clients/native',
        other: 'edge/other'
      },
      infraDir: 'deploy',
      packagesDir: 'packages',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    previewTree: `├── 📁 sites/web/ (SSR / SSG storefront)
├── 📁 edge/workers/ (Cloudflare / Edge runtime API)
├── 📁 edge/schedulers/ (cron edge tasks)
├── 📁 packages/ (shared components & SDKs)
├── 📁 deploy/ (Terraform, Wrangler, Vercel configs)
└── 📁 docs/`
  },
  {
    id: 'mobile-crossplatform',
    name: 'Mobile & Cross-Platform Monorepo',
    tagline: 'Shared core & UI design system across Web, Mobile & Desktop',
    description: 'Unified codebase powering iOS/Android (React Native / Flutter / Expo), Desktop (Electron / Tauri), and Web apps with a shared multiplatform UI and state store.',
    icon: '📱',
    badgeColor: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
    config: {
      preset: 'mobile-crossplatform',
      isCustom: false,
      appsDir: 'apps',
      appDirectories: {
        frontend: 'apps/web',
        'desktop-mobile': 'apps/mobile',
        backend: 'services/api',
        worker: 'services/workers',
        fullstack: 'apps/fullstack',
        other: 'apps/desktop'
      },
      infraDir: 'infra',
      packagesDir: 'packages',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'service-isolated'
    },
    previewTree: `├── 📁 apps/mobile/ (React Native / Flutter / Expo)
├── 📁 apps/web/ (Next.js / Vite web client)
├── 📁 apps/desktop/ (Tauri / Electron desktop)
├── 📁 services/api/ (GraphQL / REST backend)
├── 📁 packages/ui/ (cross-platform design tokens)
├── 📁 packages/core/ (business logic & state)
└── 📁 infra/`
  },
  {
    id: 'cli-tooling',
    name: 'Developer Tooling & CLI Monorepo',
    tagline: 'Multi-package CLI toolchains, plugins & native binaries',
    description: 'Engineered for developer tool builders and open-source ecosystems: binary CLI runners in packages/cli, core logic in packages/core, pluggable extensions in plugins/, and release automation in scripts/.',
    icon: '🧰',
    badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    config: {
      preset: 'cli-tooling',
      isCustom: false,
      appsDir: 'packages',
      appDirectories: {
        backend: 'packages/cli',
        worker: 'packages/core',
        frontend: 'packages/docs-site',
        fullstack: 'packages/studio',
        'desktop-mobile': 'packages/gui',
        other: 'plugins'
      },
      infraDir: 'build-infra',
      packagesDir: 'packages',
      docsDir: 'docs',
      scriptsDir: 'scripts',
      databaseIsolation: 'centralized'
    },
    previewTree: `├── 📁 packages/cli/ (binary entrypoint & CLI commands)
├── 📁 packages/core/ (engine & compiler logic)
├── 📁 plugins/ (pluggable runtime extensions)
├── 📁 examples/ (sandbox verification apps)
├── 📁 build-infra/ (cross-compilation & packaging)
└── 📁 scripts/ (release & publishing pipelines)`
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
