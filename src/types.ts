export type AppRole = 'frontend' | 'backend' | 'fullstack' | 'worker' | 'desktop-mobile' | 'other'

export type RunMode = 'docker' | 'host'

export type LanguageFlavor = 'typescript' | 'javascript'

export type TechCategory = 
  | 'systems'
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile-desktop'
  | 'scripting'

export interface TechRequirement {
  /** Binary name to check in PATH (e.g. 'node', 'go', 'cargo') */
  binary: string
  /** Human-readable label */
  label: string
  /** Install hint or URL */
  installHint?: string
}

export interface TechItem {
  id: string
  name: string
  language: string
  category: TechCategory
  role: AppRole
  defaultPort: number
  description: string
  badgeColor: string
  iconName?: string
  isHighlighted?: boolean
  supportsFlavor?: boolean
  /** Marks non-production or exploratory templates (e.g. bare-metal NASM) */
  experimental?: boolean
  /** Pre-requisite runtimes / package managers that must be installed on host */
  requires?: TechRequirement[]
}

export interface CartApp {
  id: string
  folderName: string
  role: AppRole
  techId: string
  port: number
  runMode: RunMode
  routePrefix: string
  flavor?: LanguageFlavor
}

export type DatabaseType = 
  | 'sqlite'
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'mongodb'
  | 'redis'
  | 'valkey'
  | 'clickhouse'
  | 'surrealdb'
  | 'neo4j'
  | 'qdrant'
  | 'meilisearch'
  | 'minio'
  | 'scylladb'
  | 'rabbitmq'
  // Cloud & BaaS providers
  | 'supabase'
  | 'firebase'
  | 'planetscale'
  | 'neon'
  | 'turso'
  | 'upstash'
  | 'appwrite'
  | 'convex'
  | 'pocketbase'

export interface DatabaseOption {
  id: DatabaseType
  name: string
  defaultPort: number
  category: 'relational' | 'document' | 'key-value' | 'olap' | 'graph' | 'embedded' | 'vector' | 'search' | 'storage' | 'message-broker' | 'baas' | 'cloud-db'
  description: string
  isHeavyMemory?: boolean
  imageTag?: string
  healthcheckCmd?: string
  /** True for managed cloud services that don't need Docker containers */
  isCloud?: boolean
  /** SDK packages per ecosystem — keys: npm, pip, go, cargo, nuget, composer, etc. */
  sdkPackages?: Record<string, string>
  /** Required environment variables for this service */
  envVars?: string[]
  /** URL to the provider's dashboard or docs */
  docsUrl?: string
  badgeColor?: string
}

export interface SelectedDatabase {
  type: DatabaseType
  enabled: boolean
  port: number
  sqliteStorage?: 'shared-volume' | 'app-local' | 'litestream'
}

export type ProxyType = 'nginx' | 'apache' | 'none'

export interface ProxyConfig {
  type: ProxyType
  httpPort: number
}

export interface ProjectSettings {
  projectName: string
  parentDir: string
  targetDir: string
  proxy: ProxyConfig
  databases: SelectedDatabase[]
  apps: CartApp[]
  includeAdminGui?: boolean
  includeSharedPackage?: boolean
}

