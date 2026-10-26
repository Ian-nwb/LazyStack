import { CartApp, SelectedDatabase, ProxyConfig } from '../types'

export interface StackPreset {
  id: string
  name: string
  tagline: string
  icon: string
  badgeColor: string
  apps: Omit<CartApp, 'id'>[]
  databases: SelectedDatabase[]
  proxy: ProxyConfig
}

export const STACK_PRESETS: StackPreset[] = [
  {
    id: 't3-stack',
    name: 'T3 Next.js Stack',
    tagline: 'Next.js App Router with Postgres and Nginx Reverse Proxy',
    icon: '⚡',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    apps: [
      {
        folderName: 'web',
        role: 'fullstack',
        techId: 'fullstack-nextjs',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      }
    ],
    databases: [
      { type: 'postgres', enabled: true, port: 5432 }
    ],
    proxy: { type: 'nginx', httpPort: 80 }
  },
  {
    id: 'fastapi-react',
    name: 'FastAPI + React Stack',
    tagline: 'Async Python backend with React frontend & Redis cache',
    icon: '🚀',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    apps: [
      {
        folderName: 'client',
        role: 'frontend',
        techId: 'react-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      },
      {
        folderName: 'api',
        role: 'backend',
        techId: 'python-fastapi',
        port: 8000,
        runMode: 'docker',
        routePrefix: '/api'
      }
    ],
    databases: [
      { type: 'postgres', enabled: true, port: 5432 },
      { type: 'redis', enabled: true, port: 6379 }
    ],
    proxy: { type: 'nginx', httpPort: 80 }
  },
  {
    id: 'modern-mern',
    name: 'Modern MERN Stack',
    tagline: 'React TypeScript frontend with Express & MongoDB',
    icon: '🌐',
    badgeColor: 'border-green-500/40 bg-green-500/10 text-green-300',
    apps: [
      {
        folderName: 'frontend',
        role: 'frontend',
        techId: 'react-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      },
      {
        folderName: 'backend',
        role: 'backend',
        techId: 'ts-express',
        port: 5000,
        runMode: 'docker',
        routePrefix: '/api'
      }
    ],
    databases: [
      { type: 'mongodb', enabled: true, port: 27017 }
    ],
    proxy: { type: 'nginx', httpPort: 80 }
  },
  {
    id: 'go-vue',
    name: 'Go Echo + Vue 3',
    tagline: 'Ultra-fast Go microservice with Vue 3 and Postgres',
    icon: '🐹',
    badgeColor: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    apps: [
      {
        folderName: 'web',
        role: 'frontend',
        techId: 'vue-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      },
      {
        folderName: 'service',
        role: 'backend',
        techId: 'go-echo',
        port: 8080,
        runMode: 'docker',
        routePrefix: '/api'
      }
    ],
    databases: [
      { type: 'postgres', enabled: true, port: 5432 }
    ],
    proxy: { type: 'nginx', httpPort: 80 }
  },
  {
    id: 'dotnet-enterprise',
    name: '.NET Core Enterprise',
    tagline: 'ASP.NET Core Web API with React and PostgreSQL',
    icon: '🔷',
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    apps: [
      {
        folderName: 'portal',
        role: 'frontend',
        techId: 'react-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      },
      {
        folderName: 'api',
        role: 'backend',
        techId: 'csharp-aspnet',
        port: 5000,
        runMode: 'docker',
        routePrefix: '/api'
      }
    ],
    databases: [
      { type: 'postgres', enabled: true, port: 5432 }
    ],
    proxy: { type: 'nginx', httpPort: 80 }
  },
  {
    id: 'rust-axum',
    name: 'Rust Axum High-Perf',
    tagline: 'Type-safe memory-efficient Rust server with SolidJS & Valkey',
    icon: '🦀',
    badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    apps: [
      {
        folderName: 'ui',
        role: 'frontend',
        techId: 'solidjs-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      },
      {
        folderName: 'engine',
        role: 'backend',
        techId: 'rust-axum',
        port: 8080,
        runMode: 'docker',
        routePrefix: '/api'
      }
    ],
    databases: [
      { type: 'valkey', enabled: true, port: 6379 }
    ],
    proxy: { type: 'nginx', httpPort: 80 }
  },

  // ─── Cloud & BaaS Presets ──────────────────────────────────────────

  {
    id: 'supabase-nextjs',
    name: 'Supabase + Next.js',
    tagline: 'Managed Postgres + Auth + Realtime with Next.js App Router',
    icon: '⚡',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    apps: [
      {
        folderName: 'web',
        role: 'fullstack',
        techId: 'fullstack-nextjs',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/',
        flavor: 'typescript' as const
      }
    ],
    databases: [
      { type: 'supabase', enabled: true, port: 0 }
    ],
    proxy: { type: 'none', httpPort: 80 }
  },
  {
    id: 'firebase-react',
    name: 'Firebase + React SPA',
    tagline: 'Firestore + Auth + Storage with React Vite frontend',
    icon: '🔥',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    apps: [
      {
        folderName: 'app',
        role: 'frontend',
        techId: 'react-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      }
    ],
    databases: [
      { type: 'firebase', enabled: true, port: 0 }
    ],
    proxy: { type: 'none', httpPort: 80 }
  },
  {
    id: 'turso-sveltekit',
    name: 'Turso + SvelteKit Edge',
    tagline: 'Edge SQLite with SvelteKit for ultra-low-latency full-stack apps',
    icon: '🌊',
    badgeColor: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
    apps: [
      {
        folderName: 'web',
        role: 'fullstack',
        techId: 'sveltekit-vite',
        port: 3000,
        runMode: 'docker',
        routePrefix: '/'
      }
    ],
    databases: [
      { type: 'turso', enabled: true, port: 0 },
      { type: 'upstash', enabled: true, port: 0 }
    ],
    proxy: { type: 'none', httpPort: 80 }
  }
]
