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

export interface DatabaseOption {
  id: DatabaseType
  name: string
  defaultPort: number
  category: 'relational' | 'document' | 'key-value' | 'olap' | 'graph' | 'embedded' | 'vector' | 'search' | 'storage' | 'message-broker'
  description: string
  isHeavyMemory?: boolean
  imageTag: string
  healthcheckCmd: string
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

