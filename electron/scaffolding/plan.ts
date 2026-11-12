import { applyBrokerClients, isBrokerType } from './templates/brokerClients'
import { ProjectSettings } from '../../src/types'
import { generateDockerCompose, generateDockerDevCompose, getDockerfileForTech, getDbServiceName } from './templates/docker'
import { generateNginxConfig, generateApacheConfig, generateCaddyConfig, generateTraefikConfig } from './templates/proxies'
import { getStarterFilesForTech } from './templates/appTemplates'
import { generateMetaFiles, GeneratedDatabaseCredential, README_TREE_PLACEHOLDER } from './templates/meta'
import { buildPlanTree, renderPlanTreeText } from '../../src/utils/planTree'
import { renderArchitectureMarkdown } from '../../src/utils/architectureDoc'
import { DATABASE_CATALOG } from '../../src/data/databases'
import { generateCloudServiceFiles, generateCloudEnvVars } from './templates/cloudServices'
import { resolveStructurePaths, resolvePresetScaffoldDirs } from '../../src/data/structurePresets'
import { TESTING_TOOLS } from '../../src/data/testingTools'
import { resolveServiceConnectionUrl } from '../../src/utils/serviceConnections'
import { getNativeEnvironmentDefaults } from '../../src/utils/nativeEnvironment'
import { isHostOnlyTech } from '../../src/data/frameworks'
import { getAppDatabases, getServiceOwnedDatabases } from '../../src/utils/databaseScope'

/** Version of the embedded `lazystack.json` blueprint format. */
export const BLUEPRINT_VERSION = 1

export interface PlannedFile {
  content: string
  /** Unix mode to apply after writing (e.g. 0o755 for launch scripts). */
  mode?: number
}

export interface ScaffoldPlan {
  /** Project-relative directories, POSIX separators. */
  dirs: string[]
  /** Project-relative file paths in write order. */
  files: Record<string, PlannedFile>
  /** Files copied from another project path that the plan does not contain (augment mode only). */
  diskCopies: Array<{ from: string; to: string }>
}

export interface PlanOptions {
  /** Project-relative app folders that already exist; their contents are never planned. */
  existingAppDirs?: ReadonlySet<string>
}

// The planner is pure and also runs in the renderer, so it avoids node:path.
const normalize = (value: string) => value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
const path = {
  join: (...parts: string[]) => normalize(parts.filter(Boolean).join('/')),
  dirname: (value: string) => normalize(value).split('/').slice(0, -1).join('/')
}

/**
 * Computes every directory and file `scaffoldProject` writes for `settings`, without touching
 * the file system. The generator replays the plan through the scaffold writer; the Blueprint
 * tree, README and consistency checks read it directly.
 */
const MESSAGING_VARIABLES: Record<string, true> = { redis: true, valkey: true, rabbitmq: true, kafka: true, nats: true }

export function planScaffold(settings: ProjectSettings, databaseCredentials: Record<string, GeneratedDatabaseCredential>, options: PlanOptions = {}): ScaffoldPlan {
  const existingAppDirs = options.existingAppDirs ?? new Set<string>()
  const paths = resolveStructurePaths(settings)
  const appById = new Map(settings.apps.map(app => [app.id, app]))
  const appRootDirectories = settings.apps.length
    ? [...new Set(settings.apps.map(app => paths.getAppRelativePath(app.folderName, app.id, app.role).split('/').slice(0, -1).join('/') || paths.appsDir))]
    : [paths.appsDir]
  const targetDir = ''

  const dirs = new Set<string>()
  const files: Record<string, PlannedFile> = {}
  const diskCopies: ScaffoldPlan['diskCopies'] = []
  const out = {
    ensureDir(dir: string) { if (normalize(dir)) dirs.add(normalize(dir)) },
    write(file: string, content: string | Buffer, _encoding?: string) {
      const key = normalize(file)
      files[key] = { ...files[key], content: content.toString() }
    },
    writeJson(file: string, value: unknown, _options?: unknown) { out.write(file, JSON.stringify(value, null, 2) + '\n') },
    chmod(file: string, mode: number) { const key = normalize(file); if (files[key]) files[key].mode = mode },
    copyFile(source: string, destination: string) {
      const from = normalize(source)
      if (files[from]) out.write(destination, files[from].content)
      else diskCopies.push({ from, to: normalize(destination) })
    }
  }

  // 2. Scaffold configured directory contract
  // Folders the selected architecture preset promises, each with a README so git keeps it.
  const presetDirs = settings.structureConfig ? resolvePresetScaffoldDirs(settings.structureConfig) : []
  const extraDirs = presetDirs.map(dir => dir.path)

  const directories = [
    '.github/workflows',
    '.vscode',
    ...appRootDirectories,
    ...extraDirs,
    paths.docsDir,
    paths.infraDir,
    paths.scriptsDir,
    ...(settings.useUnifiedWorkspace !== false ? [paths.packagesDir] : []),
    ...(settings.structureConfig?.customFolders || []),
    'tests'
  ]

  for (const dir of directories) {
    out.ensureDir(path.join(targetDir, dir))
  }

  for (const dir of presetDirs) {
    const title = dir.path.split('/').pop() || dir.path
    out.write(path.join(targetDir, dir.path, 'README.md'), `# ${title}\n\n${dir.purpose}\n`, 'utf8')
  }

  // 3. Write Root Meta files
    const metaFiles = generateMetaFiles(settings, databaseCredentials)
  for (const [relPath, content] of Object.entries(metaFiles)) {
    const fullPath = path.join(targetDir, relPath)
    out.ensureDir(path.dirname(fullPath))
    out.write(fullPath, content, 'utf8')

    // Ensure execution permission for shell scripts
    if (relPath.endsWith('.sh')) {
      try {
        out.chmod(fullPath, 0o755)
      } catch {
        // Ignore on Windows
      }
    }
  }

  // 4. Write Docker Compose files
  const composeContent = generateDockerCompose(settings)
  out.write(path.join(targetDir, paths.infraDir, 'docker-compose.yml'), composeContent, 'utf8')

  const devComposeContent = generateDockerDevCompose(settings)
  out.write(path.join(targetDir, paths.infraDir, 'docker-compose.dev.yml'), devComposeContent, 'utf8')

  // 5. Write Proxy Configurations
  if (settings.proxy.type === 'nginx') {
    const nginxConfigs = generateNginxConfig(settings)
    const nginxDir = path.join(targetDir, paths.infraDir, 'nginx')
    out.ensureDir(nginxDir)
    out.write(path.join(nginxDir, 'nginx.conf'), nginxConfigs['nginx.conf'], 'utf8')
    out.write(path.join(nginxDir, 'default.conf'), nginxConfigs['default.conf'], 'utf8')
  } else if (settings.proxy.type === 'apache') {
    const apacheConf = generateApacheConfig(settings)
    const apacheDir = path.join(targetDir, paths.infraDir, 'apache')
    out.ensureDir(apacheDir)
    out.write(path.join(apacheDir, 'httpd.conf'), apacheConf, 'utf8')
  } else if (settings.proxy.type === 'caddy') {
    const caddyDir = path.join(targetDir, paths.infraDir, 'caddy')
    out.ensureDir(caddyDir)
    out.write(path.join(caddyDir, 'Caddyfile'), generateCaddyConfig(settings), 'utf8')
  } else if (settings.proxy.type === 'traefik') {
    const traefikDir = path.join(targetDir, paths.infraDir, 'traefik')
    const configs = generateTraefikConfig(settings)
    out.ensureDir(traefikDir)
    out.write(path.join(traefikDir, 'traefik.yml'), configs['traefik.yml'], 'utf8')
    out.write(path.join(traefikDir, 'dynamic.yml'), configs['dynamic.yml'], 'utf8')
  }

  // 6. SQLite setup
  const hasSqlite = settings.databases.some(d => d.enabled && d.type === 'sqlite')
  if (hasSqlite) {
    const sqliteDir = path.join(targetDir, paths.infraDir, 'sqlite')
    out.ensureDir(sqliteDir)
    out.write(path.join(sqliteDir, 'README.md'), '# SQLite Shared Volume\nStores persistent database files (e.g. data.db) mounted across Docker containers and local apps.\n', 'utf8')
  }

  // 6b. Cloud & BaaS service SDK files
  const cloudFiles = generateCloudServiceFiles(settings.databases)
  if (Object.keys(cloudFiles).length > 0) {
    for (const [relPath, content] of Object.entries(cloudFiles)) {
      // Rewrite packages/ to paths.packagesDir if customized
      const targetRelPath = relPath.startsWith('packages/')
        ? `${paths.packagesDir}/${relPath.slice('packages/'.length)}`
        : relPath
      const fullPath = path.join(targetDir, targetRelPath)
      out.ensureDir(path.dirname(fullPath))
      out.write(fullPath, content, 'utf8')
    }
  }

  // 6c. Cloud env vars join the root .env / .env.example (the writer merges them in augment mode)
  const cloudEnv = generateCloudEnvVars(settings.databases)
  if (cloudEnv.env) {
    for (const [file, extra] of [['.env', cloudEnv.env], ['.env.example', cloudEnv.envExample]] as const) {
      if (files[file]) files[file].content += extra
      else out.write(file, extra)
    }
  }

  // 7. Scaffold each Microservice / Application Service
  for (const app of settings.apps) {
    const relAppPath = paths.getAppRelativePath(app.folderName, app.id, app.role)
    const appDir = path.join(targetDir, relAppPath)
    if (existingAppDirs.has(relAppPath)) continue
    out.ensureDir(appDir)

    // Hosted and native desktop/mobile templates do not run as container services.
    if (!isHostOnlyTech(app.techId)) {
      const { dockerfile, dockerignore } = getDockerfileForTech(app.techId, app.port, app.folderName, app.starterProfile)
      out.write(path.join(appDir, 'Dockerfile'), dockerfile, 'utf8')
      out.write(path.join(appDir, '.dockerignore'), dockerignore, 'utf8')
    }

    // Scoped databases for this microservice
    const assignedDbs = getServiceOwnedDatabases(settings, app)

    // Service-isolated database folder (migrations & schema)
    if (assignedDbs.length > 0) {
      const dbDir = path.join(appDir, 'db')
      out.ensureDir(path.join(dbDir, 'migrations'))
      out.ensureDir(path.join(dbDir, 'seeds'))
      const schemaSql = `-- Database Schema for ${app.folderName}\n-- Dedicated Service Databases: ${assignedDbs.map(d => d.customName || d.type).join(', ')}\n\nCREATE TABLE IF NOT EXISTS service_health (\n  id SERIAL PRIMARY KEY,\n  service_name VARCHAR(100) DEFAULT '${app.folderName}',\n  status VARCHAR(20) DEFAULT 'healthy',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n`
      out.write(path.join(dbDir, 'schema.sql'), schemaSql, 'utf8')
      const readmeDb = `# Database for ${app.folderName}\n\nThis folder holds local schema migrations and seed scripts for the ${app.folderName} microservice.\n\nAssigned instances:\n${assignedDbs.map(d => `- **${d.customName || d.type}** (Port :${d.port})`).join('\n')}\n`
      out.write(path.join(dbDir, 'README.md'), readmeDb, 'utf8')
    }

    // App .env with service-level credentials
    const nativeEnv = getNativeEnvironmentDefaults(app.techId)
    let appEnv = `PORT=${app.port}\nAPP_NAME=${app.folderName}\n${nativeEnv}`
    let appEnvExample = `PORT=${app.port}\nAPP_NAME=${app.folderName}\n${nativeEnv}`
    if (app.techId === 'python-fastapi' && app.starterProfile === 'api-service') {
      appEnv += 'API_TOKEN=local-dev-token-change-me\n'
      appEnvExample += 'API_TOKEN=replace_with_random_secret\n'
    }
    const appDbs = getAppDatabases(settings, app)
    if (appDbs.length > 0) {
      appEnv += '\n# Database connection settings\n'
      appEnvExample += '\n# Database connection settings\n'
      appDbs.forEach((db, idx) => {
        const serviceName = getDbServiceName(db, settings.databases.indexOf(db), settings.apps)
        const credentials = databaseCredentials[serviceName]
        const catalogEntry = DATABASE_CATALOG.find(item => item.id === db.type)
        // Kafka's in-network listener (29092) differs from the host-published one (9092).
        const containerPort = db.type === 'kafka' ? 29092 : catalogEntry?.defaultPort || db.port
        const host = app.runMode === 'docker' ? serviceName : 'localhost'
        const port = app.runMode === 'docker' ? containerPort : db.port
        let connectionUrl = ''
        let exampleUrl = ''
        if (['postgres', 'mysql', 'mariadb'].includes(db.type) && credentials) {
          const scheme = db.type === 'postgres' ? 'postgresql' : db.type
          connectionUrl = `${scheme}://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@${host}:${port}/${encodeURIComponent(credentials.database)}`
          exampleUrl = `${scheme}://${encodeURIComponent(credentials.username)}:replace_me@${host}:${port}/${encodeURIComponent(credentials.database)}`
        } else if (db.type === 'mongodb' && credentials) {
          connectionUrl = `mongodb://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@${host}:${port}/${encodeURIComponent(credentials.database)}?authSource=admin`
          exampleUrl = `mongodb://${encodeURIComponent(credentials.username)}:replace_me@${host}:${port}/${encodeURIComponent(credentials.database)}?authSource=admin`
        } else if (['redis', 'valkey'].includes(db.type)) {
          const scheme = db.type === 'valkey' ? 'redis' : 'redis'
          connectionUrl = `${scheme}://${host}:${port}`
          exampleUrl = connectionUrl
        } else if (db.type === 'nats') {
          connectionUrl = `nats://${host}:${port}`
          exampleUrl = connectionUrl
        } else if (db.type === 'kafka') {
          connectionUrl = `${host}:${port}`
          exampleUrl = connectionUrl
        } else if (db.type === 'rabbitmq' && credentials) {
          connectionUrl = `amqp://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@${host}:${port}`
          exampleUrl = `amqp://${encodeURIComponent(credentials.username)}:replace_me@${host}:${port}`
        }
        const messagingVariable = ({ redis: 'REDIS_URL', valkey: 'REDIS_URL', rabbitmq: 'RABBITMQ_URL', kafka: 'KAFKA_BROKERS', nats: 'NATS_URL' } as Record<string, string>)[db.type]
        const usedVariable = (name: string) => appEnv.split('\n').some(line => line.startsWith(`${name}=`))
        // Caches and brokers get their own well-known variable; DATABASE_URL stays with the first data store.
        const isFirstDataStore = !messagingVariable && appDbs.findIndex(item => !(item.type in MESSAGING_VARIABLES)) === idx
        let variable = messagingVariable && !usedVariable(messagingVariable)
          ? messagingVariable
          : isFirstDataStore ? 'DATABASE_URL' : `${serviceName.toUpperCase()}_URL`
        if (usedVariable(variable)) variable = `${serviceName.toUpperCase()}_URL`
        if (connectionUrl) {
          appEnv += `${variable}=${connectionUrl}\n`
          appEnvExample += `${variable}=${exampleUrl}\n`
          if (app.techId === 'fullstack-laravel' && idx === 0 && credentials && ['postgres', 'mysql', 'mariadb'].includes(db.type)) {
            const driver = db.type === 'postgres' ? 'pgsql' : 'mysql'
            const laravelDbEnv = `DB_CONNECTION=${driver}\nDB_HOST=${host}\nDB_PORT=${port}\nDB_DATABASE=${credentials.database}\nDB_USERNAME=${credentials.username}\n`
            appEnv += laravelDbEnv + `DB_PASSWORD=${credentials.password}\n`
            appEnvExample += laravelDbEnv + 'DB_PASSWORD=replace_me\n'
          }
        } else {
          const variablePrefix = serviceName.toUpperCase()
          appEnv += `${variablePrefix}_HOST=${host}\n${variablePrefix}_PORT=${port}\n`
          appEnvExample += `${variablePrefix}_HOST=${host}\n${variablePrefix}_PORT=${port}\n`
        }
      })
    }
    // Mobile starters read one fixed public variable; point it at the first connection.
    const starterApiVar = ({ 'react-native-expo': 'EXPO_PUBLIC_API_URL', 'capacitor-app': 'VITE_API_URL' } as Record<string, string>)[app.techId]
    for (const [index, connection] of (app.connections || []).entries()) {
      const target = appById.get(connection.targetAppId)!
      const connectionUrl = resolveServiceConnectionUrl(app, target, settings.proxy, connection)
      let lines = `${connection.envVar}=${connectionUrl}\n`
      if (starterApiVar && index === 0 && connection.envVar !== starterApiVar) lines += `${starterApiVar}=${connectionUrl}\n`
      appEnv += lines
      appEnvExample += lines
    }
    const appCloudVars = generateCloudEnvVars(settings.databases.filter(db => db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId))
    appEnv += appCloudVars.env
    appEnvExample += appCloudVars.envExample
    out.write(path.join(appDir, '.env'), appEnv, 'utf8')
    out.write(path.join(appDir, '.env.example'), appEnvExample, 'utf8')

    // Starter code files
    const starterFiles = getStarterFilesForTech(app.techId, app.folderName, app.port, app.flavor, app.starterProfile)
    // Services (not UI-only apps) get a connect/publish/subscribe example for each cache or broker they use.
    if (app.role === 'backend' || app.role === 'worker' || app.role === 'fullstack') {
      applyBrokerClients(starterFiles, appDbs.map(db => db.type).filter(isBrokerType), (app.flavor || 'typescript') === 'typescript')
    }
    for (const [fileName, fileContent] of Object.entries(starterFiles)) {
      const filePath = path.join(appDir, fileName)
      out.ensureDir(path.dirname(filePath))
      out.write(filePath, fileContent, 'utf8')
    }

    const selectedToolIds = app.testingTools || []
    const selectedTools = selectedToolIds.map(id => TESTING_TOOLS.find(tool => tool.id === id)).filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
    const customToolPackages = (app.customTestingTools || []).map(tool => tool.packageName).filter((name): name is string => Boolean(name && /^[a-zA-Z0-9@/_.*-]+$/.test(name)))
    const appPackagePath = path.join(appDir, 'package.json')
    const hasNpmTools = selectedTools.some(tool => tool.ecosystem === 'npm' || (tool.ecosystem === 'cli' && Boolean(tool.scriptName))) || customToolPackages.length > 0
    if (hasNpmTools && files[appPackagePath]) {
      try {
        const packageJson = JSON.parse(files[appPackagePath].content)
        packageJson.devDependencies = packageJson.devDependencies || {}
        packageJson.scripts = packageJson.scripts || {}
        for (const tool of selectedTools) {
          if (tool.ecosystem === 'npm') for (const packageName of tool.installPackages || []) {
            if (tool.runtimePackages?.includes(packageName)) {
              packageJson.dependencies = packageJson.dependencies || {}
              packageJson.dependencies[packageName] = 'latest'
            } else {
              packageJson.devDependencies[packageName] = 'latest'
            }
          }
          if (tool.scriptName && tool.scriptCommand) packageJson.scripts[tool.scriptName] = tool.scriptCommand
        }
        if (selectedToolIds.includes('openapi-client')) {
          const source = (app.connections || []).map(connection => ({ connection, app: appById.get(connection.targetAppId) }))
            .find(item => item.app && ['http', 'https'].includes(item.connection.protocol) && (item.app.testingTools || []).includes('swagger-openapi'))
          if (source?.app) {
            packageJson.scripts['api:generate'] = 'openapi-typescript api-contract.yaml --output src/api/schema.d.ts'
            packageJson.scripts.predev = 'npm run api:generate'
            packageJson.scripts.prebuild = 'npm run api:generate'
            out.ensureDir(path.join(appDir, 'src/api'))
            out.write(path.join(appDir, 'src/api/client.ts'), `import createClient from 'openapi-fetch'\nimport type { paths } from './schema'\n\nexport const createApiClient = (baseUrl: string, bearerToken?: string) =>\n  createClient<paths>({\n    baseUrl,\n    headers: bearerToken ? { Authorization: 'Bearer ' + bearerToken } : {}\n  })\n`, 'utf8')
          }
        }
        for (const packageName of customToolPackages) packageJson.devDependencies[packageName] = 'latest'
        out.writeJson(appPackagePath, packageJson, { spaces: 2 })
      } catch {
        // Some non-Node services include JSON files that are not npm manifests; leave them untouched.
      }
    }

    if (selectedToolIds.includes('swagger-openapi')) {
      const title = JSON.stringify(app.folderName)
      const description = JSON.stringify(`API contract for ${app.folderName}`)
      const openApi = app.starterProfile === 'api-service' ? {
        openapi: '3.1.0',
        info: { title: app.folderName, version: '1.0.0', description: `CRUD API contract for ${app.folderName}` },
        servers: [{ url: `http://localhost:${app.port}` }],
        paths: {
          '/api/items': {
            get: { operationId: 'listItems', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Items', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ItemRead' } } } } } } },
            post: { operationId: 'createItem', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemCreate' } } } }, responses: { '201': { description: 'Created item', content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemRead' } } } } } }
          },
          '/api/items/{item_id}': {
            parameters: [{ name: 'item_id', in: 'path', required: true, schema: { type: 'integer' } }],
            get: { operationId: 'getItem', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Item', content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemRead' } } } }, '404': { description: 'Item not found' } } },
            patch: { operationId: 'updateItem', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemUpdate' } } } }, responses: { '200': { description: 'Updated item', content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemRead' } } } }, '404': { description: 'Item not found' } } },
            delete: { operationId: 'deleteItem', security: [{ BearerAuth: [] }], responses: { '204': { description: 'Deleted item' }, '404': { description: 'Item not found' } } }
          }
        },
        components: {
          securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer' } },
          schemas: {
            ItemCreate: { type: 'object', required: ['title'], properties: { title: { type: 'string', minLength: 1, maxLength: 160 }, description: { type: ['string', 'null'] } } },
            ItemUpdate: { type: 'object', properties: { title: { type: 'string', minLength: 1, maxLength: 160 }, description: { type: ['string', 'null'] }, completed: { type: 'boolean' } } },
            ItemRead: { type: 'object', required: ['id', 'title', 'completed', 'created_at'], properties: { id: { type: 'integer' }, title: { type: 'string' }, description: { type: ['string', 'null'] }, completed: { type: 'boolean' }, created_at: { type: 'string', format: 'date-time' } } }
          }
        }
      } : null
      const spec = openApi ? JSON.stringify(openApi, null, 2) : `openapi: 3.1.0\ninfo:\n  title: ${title}\n  version: 1.0.0\n  description: ${description}\nservers:\n  - url: http://localhost:${app.port}\npaths:\n  /:\n    get:\n      summary: Service root\n      responses:\n        '200':\n          description: Service is responding\n`
      out.write(path.join(appDir, 'openapi.yaml'), spec + '\n', 'utf8')
    }

    if (selectedToolIds.includes('playwright')) {
      out.ensureDir(path.join(appDir, 'tests/e2e'))
      out.write(path.join(appDir, 'playwright.config.ts'), `import { defineConfig } from '@playwright/test'\n\nexport default defineConfig({\n  testDir: './tests/e2e',\n  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:${app.port}' },\n  reporter: 'list'\n})\n`, 'utf8')
      out.write(path.join(appDir, 'tests/e2e/home.spec.ts'), `import { test, expect } from '@playwright/test'\n\ntest('service responds', async ({ page }) => {\n  await page.goto('/')\n  await expect(page.locator('body')).toBeVisible()\n})\n`, 'utf8')
    }

    if (selectedToolIds.includes('newman')) {
      out.ensureDir(path.join(appDir, 'tests'))
      out.write(path.join(appDir, 'tests/api.collection.json'), JSON.stringify({
        info: { name: `${app.folderName} API checks`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [{ name: 'Root responds', request: { method: 'GET', url: `http://127.0.0.1:${app.port}/` }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('responds successfully', function () { pm.expect(pm.response.code).to.be.below(500) })"] } }] }]
      }, null, 2) + '\n', 'utf8')
    }

    if (selectedToolIds.includes('bruno')) {
      out.ensureDir(path.join(appDir, 'tests/bruno'))
      out.write(path.join(appDir, 'tests/bruno/health.bru'), `meta {\n  name: Health check\n  type: http\n  seq: 1\n}\n\nget {\n  url: http://127.0.0.1:${app.port}/health\n}\n\nassert {\n  res.status: < 500\n}\n`, 'utf8')
    }

    if (selectedToolIds.includes('storybook')) {
      out.ensureDir(path.join(appDir, '.storybook'))
      out.write(path.join(appDir, '.storybook/main.ts'), `import type { StorybookConfig } from '@storybook/react-vite'\n\nconst config: StorybookConfig = {\n  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],\n  framework: { name: '@storybook/react-vite', options: {} }\n}\n\nexport default config\n`, 'utf8')
      out.write(path.join(appDir, '.storybook/preview.ts'), `import type { Preview } from '@storybook/react-vite'\n\nconst preview: Preview = { parameters: { controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } } } }\nexport default preview\n`, 'utf8')
      out.ensureDir(path.join(appDir, 'src/stories'))
      out.write(path.join(appDir, 'src/stories/Button.stories.tsx'), `import type { Meta, StoryObj } from '@storybook/react'\n\nconst meta: Meta = { title: 'Getting Started/Button', tags: ['autodocs'] }\nexport default meta\ntype Story = StoryObj\n\nexport const Example: Story = {\n  render: () => <button type="button">A component story</button>\n}\n`, 'utf8')
    }

    const customTools = app.customTestingTools || []
    if (selectedTools.length || customTools.length) {
      const setupNotes = [
        ...selectedTools.map(tool => `- **${tool.name}** (${tool.category}): ${tool.description}${tool.installPackages?.length ? ` Packages: \`${tool.installPackages.join('`, `')}\`.` : ''}${tool.id === 'openapi-client' ? ' Edit the copied api-contract.yaml when the API changes, then run `npm run api:generate`; npm also regenerates client types before dev and build.' : tool.scriptCommand ? ` Run with \`${tool.scriptCommand}\`.` : ''}`),
        ...customTools.map(tool => `- **${tool.name}**${tool.packageName ? ` (${tool.packageName})` : ''}: configure this tool's install and run command for your stack.`)
      ]
      out.ensureDir(path.join(appDir, 'tests'))
      out.write(path.join(appDir, 'tests/TOOLING.md'), `# Testing tools for ${app.folderName}\n\n${setupNotes.join('\n')}\n`, 'utf8')
    }
  }

  for (const consumer of settings.apps.filter(app => (app.testingTools || []).includes('openapi-client'))) {
    const source = (consumer.connections || []).map(connection => ({ connection, app: appById.get(connection.targetAppId) }))
      .find(item => item.app && ['http', 'https'].includes(item.connection.protocol) && (item.app.testingTools || []).includes('swagger-openapi'))?.app
    if (!source) continue
    const sourcePath = path.join(targetDir, paths.getAppRelativePath(source.folderName, source.id, source.role), 'openapi.yaml')
    const consumerPath = path.join(targetDir, paths.getAppRelativePath(consumer.folderName, consumer.id, consumer.role), 'api-contract.yaml')
    out.copyFile(sourcePath, consumerPath)
  }

  // 8. Documentation: diagrams come from the same topology model as Compose and the Blueprint tabs.
  out.write(path.join(targetDir, paths.docsDir, 'architecture.md'), renderArchitectureMarkdown(settings), 'utf8')

  // 9. Embedded blueprint: lets LazyStack reopen, visualize and extend this project later.
  //    Machine-specific locations are omitted; secrets live only in .env.
  const { parentDir: _parentDir, targetDir: _targetDir, ...portableSettings } = settings
  out.write(path.join(targetDir, 'lazystack.json'), JSON.stringify({ $lazystack: BLUEPRINT_VERSION, ...portableSettings }, null, 2) + '\n')

  // The README's directory tree is rendered from the finished plan, so it cannot drift from the files written.
  const readme = files['README.md']
  if (readme?.content.includes(README_TREE_PLACEHOLDER)) {
    const tree = renderPlanTreeText(buildPlanTree({ dirs: [...dirs], files }, settings, { appDetail: 'none' }))
    readme.content = readme.content.replace(README_TREE_PLACEHOLDER, () => tree)
  }

  return { dirs: [...dirs], files, diskCopies }
}
