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
  starterProfile?: 'minimal' | 'api-service'
  connections?: ServiceConnection[]
  healthCheck?: AppHealthCheck
  testingTools?: string[]
  customTestingTools?: CustomTestingTool[]
}

export interface ServiceConnection {
  targetAppId: string
  envVar: string
  protocol: 'http' | 'https' | 'grpc' | 'custom'
  customUrl?: string
}

export interface AppHealthCheck {
  enabled: boolean
  type: 'http' | 'command'
  path?: string
  command?: string
  intervalSeconds: number
  timeoutSeconds: number
  retries: number
  startPeriodSeconds: number
}

export interface CustomTestingTool {
  name: string
  packageName?: string
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
  | 'kafka'
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

export type DatabaseAdminUi = 'adminer' | 'pgadmin' | 'phpmyadmin' | 'mongo-express' | 'redis-commander' | 'prisma-studio'

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
  id?: string                  // Unique instance identifier (e.g. 'inst-postgres-1', 'auth-db')
  type: DatabaseType
  enabled: boolean
  port: number
  customName?: string          // e.g. 'Auth Service DB', 'Orders DB'
  assignedAppId?: string       // ID of the microservice app it is assigned to, or 'global'
  databaseName?: string        // Custom DB name (e.g. 'auth_db', 'orders_db')
  username?: string            // Database login name; secret password is generated into .env
  adminUi?: DatabaseAdminUi    // Optional database-specific web administration UI
  adminUiPort?: number         // Local port for the selected admin UI
  sqliteStorage?: 'shared-volume' | 'app-local' | 'litestream'
}

export type ArchitecturePreset =
  | 'monorepo'             // apps/, packages/, infra/
  | 'microservices'        // services/, shared/, infra/, gateway/
  | 'domain-driven'        // domains/<domain>/, core/, infra/
  | 'polyglot'             // backend/services/, frontend/clients/, deploy/
  | 'modular-monolith'     // modules/<feature>/, libs/, infra/
  | 'hexagonal'            // services/, adapters/, core/, infra/
  | 'serverless'           // functions/, web/, infra/
  | 'event-driven'         // services/, consumers/, events/contracts/
  | 'data-platform'        // pipelines/, schemas/, analytics apps/
  | 'ai-ml-platform'       // models/, agents/, services/inference, pipelines/eval
  | 'clean-architecture'   // domain/, usecases/, adapters/, services/
  | 'cqrs'                 // services/commands, services/projections, events/
  | 'jamstack-edge'        // sites/, edge/workers, deploy/
  | 'mobile-crossplatform' // apps/mobile, apps/web, apps/desktop, packages/ui
  | 'cli-tooling'          // packages/cli, packages/core, plugins/, examples/
  | 'custom'               // User custom paths

export type DatabaseIsolationMode =
  | 'service-isolated'   // Database-per-Service: db/ folder inside each service + service-scoped env
  | 'centralized'        // Centralized: all databases declared in root infra/
  | 'hybrid'             // Service-isolated relational DBs + shared caches/brokers

export interface FolderStructureConfig {
  preset: ArchitecturePreset
  isCustom: boolean
  appsDir: string         // e.g. 'apps', 'services', 'domains', 'backend/services'
  appDirectories?: Partial<Record<AppRole, string>>
  infraDir: string        // e.g. 'infra', 'deploy'
  packagesDir: string     // e.g. 'packages', 'shared', 'libs', 'core'
  docsDir: string         // e.g. 'docs'
  scriptsDir: string      // e.g. 'scripts'
  databaseIsolation: DatabaseIsolationMode
  customAppPaths?: Record<string, string> // Map appId -> custom relative directory
  customFolders?: string[]  // Additional root-level directories to create
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
  structureConfig?: FolderStructureConfig
  /** Whether to generate optional root JS workspace integration files. Defaults on for older blueprints. */
  useUnifiedWorkspace?: boolean
  includeAdminGui?: boolean
  includeSharedPackage?: boolean
}
