import path from 'path'
import fs from 'fs-extra'
import { ProjectSettings } from '../../src/types'
import { validateFolderName, validatePath, validateRelativeProjectPath, joinPaths } from '../../src/utils/pathValidation'
import { generateDockerCompose, generateDockerDevCompose, getDockerfileForTech, getDbServiceName } from './templates/docker'
import { generateNginxConfig, generateApacheConfig } from './templates/proxies'
import { getStarterFilesForTech } from './templates/appTemplates'
import { createDatabaseCredentials, generateMetaFiles } from './templates/meta'
import { DATABASE_CATALOG } from '../../src/data/databases'
import { generateCloudServiceFiles, generateCloudEnvVars } from './templates/cloudServices'
import { resolveStructurePaths } from '../../src/data/structurePresets'
import { TESTING_TOOLS } from '../../src/data/testingTools'
import { resolveServiceConnectionUrl } from '../../src/utils/serviceConnections'
import { getDatabaseAdminUiOption } from '../../src/data/databaseAdminUis'
import { TECH_CATALOG } from '../../src/data/frameworks'

export interface ScaffoldResult {
  success: boolean
  targetDir: string
  filesCreated: number
  error?: string
}

export async function scaffoldProject(settings: ProjectSettings): Promise<ScaffoldResult> {
  // Pre-flight checks on inputs
  const nameVal = validateFolderName(settings.projectName, 'project')
  if (!nameVal.valid) {
    return {
      success: false,
      targetDir: '',
      filesCreated: 0,
      error: `Invalid project name: ${nameVal.error}`
    }
  }

  const pathVal = validatePath(settings.parentDir)
  if (!pathVal.valid) {
    return {
      success: false,
      targetDir: '',
      filesCreated: 0,
      error: `Invalid parent location: ${pathVal.error}`
    }
  }

  for (const app of settings.apps) {
    const appVal = validateFolderName(app.folderName, 'app')
    if (!appVal.valid) {
      return {
        success: false,
        targetDir: '',
        filesCreated: 0,
        error: `Invalid app folder name '${app.folderName}': ${appVal.error}`
      }
    }
  }

  for (const folder of settings.structureConfig?.customFolders || []) {
    const folderVal = validateFolderName(folder)
    if (!folderVal.valid) {
      return {
        success: false,
        targetDir: '',
        filesCreated: 0,
        error: `Invalid custom folder name '${folder}': ${folderVal.error}`
      }
    }
  }

  const structure = settings.structureConfig
  const configuredPaths = [
    ['apps root', structure?.appsDir], ['infrastructure root', structure?.infraDir],
    ['shared packages root', structure?.packagesDir], ['documentation root', structure?.docsDir],
    ['scripts root', structure?.scriptsDir],
    ...Object.entries(structure?.appDirectories || {}).map(([role, root]) => [`${role} app root`, root] as [string, string | undefined]),
    ...Object.entries(structure?.customAppPaths || {}).map(([appId, appPath]) => [`custom app path ${appId}`, appPath] as [string, string | undefined])
  ]
  for (const [label, configuredPath] of configuredPaths) {
    if (!configuredPath) continue
    const pathValidation = validateRelativeProjectPath(configuredPath)
    if (!pathValidation.valid) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Invalid ${label}: ${pathValidation.error}` }
    }
  }

  const appById = new Map(settings.apps.map(app => [app.id, app]))
  for (const consumer of settings.apps.filter(app => (app.testingTools || []).includes('openapi-client'))) {
    const consumerLanguage = TECH_CATALOG.find(tech => tech.id === consumer.techId)?.language || ''
    const isTypeScriptApp = /^(JS \/ TS|JavaScript|TypeScript|Node\.js)$/.test(consumerLanguage)
    const source = (consumer.connections || []).map(connection => ({ connection, app: appById.get(connection.targetAppId) }))
      .find(item => item.app && ['http', 'https'].includes(item.connection.protocol) && (item.app.testingTools || []).includes('swagger-openapi'))
    if (!isTypeScriptApp || !source) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Typed OpenAPI client generation for '${consumer.folderName}' needs a JavaScript/TypeScript app connected over HTTP(S) to an API service with Swagger/OpenAPI selected.` }
    }
  }

  for (const app of settings.apps) {
    const envNames = new Set<string>()
    for (const connection of app.connections || []) {
      if (!appById.has(connection.targetAppId) || connection.targetAppId === app.id) {
        return { success: false, targetDir: '', filesCreated: 0, error: `Invalid service connection on '${app.folderName}': choose a different existing service.` }
      }
      if (!/^[A-Z][A-Z0-9_]*$/.test(connection.envVar) || envNames.has(connection.envVar)) {
        return { success: false, targetDir: '', filesCreated: 0, error: `Invalid or duplicate environment variable '${connection.envVar}' on '${app.folderName}'.` }
      }
      if (connection.protocol === 'custom' && (!connection.customUrl || !/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/[^\s#]+$/.test(connection.customUrl))) {
        return { success: false, targetDir: '', filesCreated: 0, error: `Enter a valid single-line custom URL for '${app.folderName}'.` }
      }
      envNames.add(connection.envVar)
    }
    if (app.healthCheck?.enabled && app.healthCheck.type === 'http' && (!app.healthCheck.path?.startsWith('/') || /[\r\n]/.test(app.healthCheck.path))) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Health-check paths for '${app.folderName}' must start with '/'.` }
    }
    if (app.healthCheck?.enabled && app.healthCheck.type === 'command' && !app.healthCheck.command?.trim()) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Enter a command for the '${app.folderName}' health check.` }
    }
    if (app.healthCheck?.enabled && [app.healthCheck.intervalSeconds, app.healthCheck.timeoutSeconds, app.healthCheck.retries, app.healthCheck.startPeriodSeconds].some(value => !Number.isInteger(value) || value < 0)) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Health-check timing values for '${app.folderName}' must be non-negative whole seconds.` }
    }
    if (app.healthCheck?.enabled && (app.healthCheck.intervalSeconds < 1 || app.healthCheck.timeoutSeconds < 1 || app.healthCheck.retries < 1)) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Health-check interval, timeout, and retries for '${app.folderName}' must be at least 1.` }
    }
  }

  const dependencyEdges = new Map(settings.apps.map(app => [app.id, (app.connections || []).map(connection => connection.targetAppId)]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const dependencyId of dependencyEdges.get(id) || []) if (hasCycle(dependencyId)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  if (settings.apps.some(app => hasCycle(app.id))) {
    return { success: false, targetDir: '', filesCreated: 0, error: 'Service connections contain a startup dependency cycle. Remove one connection to continue.' }
  }

  for (const db of settings.databases.filter(item => item.enabled)) {
    for (const [field, value] of [['database name', db.databaseName], ['database username', db.username]] as Array<[string, string | undefined]>) {
      if (value && (!/^[a-zA-Z0-9_.-]+$/.test(value) || value.length > 128)) {
        return { success: false, targetDir: '', filesCreated: 0, error: `${field} for '${db.customName || db.type}' must use letters, numbers, dots, underscores, or hyphens (up to 128 characters).` }
      }
    }
    if (db.adminUi && !getDatabaseAdminUiOption(db.type, db.adminUi)) {
      return { success: false, targetDir: '', filesCreated: 0, error: `The selected admin UI is not supported for '${db.customName || db.type}'.` }
    }
    if (db.adminUi && (!Number.isInteger(db.adminUiPort) || (db.adminUiPort || 0) < 1 || (db.adminUiPort || 0) > 65535)) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Choose a valid local port (1–65535) for the ${db.adminUi} UI on '${db.customName || db.type}'.` }
    }
  }

  for (const app of settings.apps.filter(item => item.techId === 'python-fastapi' && item.starterProfile === 'api-service')) {
    const appDatabases = settings.databases.filter(db => {
      if (!db.enabled || db.type === 'sqlite' || DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud) return false
      return resolveStructurePaths(settings).databaseIsolation !== 'service-isolated' || db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId
    })
    const firstDb = appDatabases[0]
    if (firstDb && !['postgres', 'mysql', 'mariadb'].includes(firstDb.type)) {
      return { success: false, targetDir: '', filesCreated: 0, error: `The FastAPI API service profile needs PostgreSQL, MySQL, or MariaDB as its first configured database for '${app.folderName}'. Remove or reorder the incompatible database, or use the minimal starter.` }
    }
  }

  const declaredPorts = [
    ...settings.apps.filter(app => app.port > 0).map(app => ({ port: app.port, name: app.folderName })),
    ...settings.databases.filter(db => {
      if (!db.enabled || db.port <= 0) return false
      const definition = DATABASE_CATALOG.find(item => item.id === db.type)
      return !definition?.isCloud || Boolean(definition.imageTag)
    }).map(db => ({ port: db.port, name: db.customName || db.type })),
    ...settings.databases.filter(db => db.enabled && db.adminUi && db.adminUiPort).map(db => ({ port: db.adminUiPort!, name: `${db.customName || db.type} admin UI` }))
  ]
  const occupiedPorts = new Map<number, string>()
  for (const item of declaredPorts) {
    const existing = occupiedPorts.get(item.port)
    if (existing) {
      return { success: false, targetDir: '', filesCreated: 0, error: `Port ${item.port} is used by both '${existing}' and '${item.name}'. Choose different ports.` }
    }
    occupiedPorts.set(item.port, item.name)
  }

  const targetDir = path.normalize(joinPaths(settings.parentDir, settings.projectName))
  const paths = resolveStructurePaths(settings)
  const appRootDirectories = settings.apps.length
    ? [...new Set(settings.apps.map(app => paths.getAppRelativePath(app.folderName, app.id, app.role).split('/').slice(0, -1).join('/') || paths.appsDir))]
    : [paths.appsDir]
  let filesCreated = 0

  try {
    // 1. Ensure target directory exists
    await fs.ensureDir(targetDir)

    // 2. Scaffold configured directory contract
    const presetExtraDirs: Record<string, string[]> = {
      'ai-ml-platform': ['models', 'prompts', 'pipelines/eval', 'agents/workers'],
      'clean-architecture': ['domain'],
      'cqrs': ['events'],
      'jamstack-edge': ['edge/workers', 'edge/schedulers'],
      'mobile-crossplatform': ['packages/ui', 'packages/core'],
      'cli-tooling': ['plugins', 'examples'],
      'data-platform': ['schemas'],
      'event-driven': ['events'],
      'domain-driven': ['core']
    }
    const currentPreset = settings.structureConfig?.preset || 'monorepo'
    const extraDirs = presetExtraDirs[currentPreset] || []

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
      await fs.ensureDir(path.join(targetDir, dir))
    }

    // 3. Write Root Meta files
    const databaseCredentials = createDatabaseCredentials(settings)
    const metaFiles = generateMetaFiles(settings, databaseCredentials)
    for (const [relPath, content] of Object.entries(metaFiles)) {
      const fullPath = path.join(targetDir, relPath)
      await fs.ensureDir(path.dirname(fullPath))
      await fs.writeFile(fullPath, content, 'utf8')
      filesCreated++

      // Ensure execution permission for shell scripts
      if (relPath.endsWith('.sh')) {
        try {
          await fs.chmod(fullPath, 0o755)
        } catch {
          // Ignore on Windows
        }
      }
    }

    // 4. Write Docker Compose files
    const composeContent = generateDockerCompose(settings)
    await fs.writeFile(path.join(targetDir, paths.infraDir, 'docker-compose.yml'), composeContent, 'utf8')
    filesCreated++

    const devComposeContent = generateDockerDevCompose(settings)
    await fs.writeFile(path.join(targetDir, paths.infraDir, 'docker-compose.dev.yml'), devComposeContent, 'utf8')
    filesCreated++

    // 5. Write Proxy Configurations
    if (settings.proxy.type === 'nginx') {
      const nginxConfigs = generateNginxConfig(settings)
      const nginxDir = path.join(targetDir, paths.infraDir, 'nginx')
      await fs.ensureDir(nginxDir)
      await fs.writeFile(path.join(nginxDir, 'nginx.conf'), nginxConfigs['nginx.conf'], 'utf8')
      await fs.writeFile(path.join(nginxDir, 'default.conf'), nginxConfigs['default.conf'], 'utf8')
      filesCreated += 2
    } else if (settings.proxy.type === 'apache') {
      const apacheConf = generateApacheConfig(settings)
      const apacheDir = path.join(targetDir, paths.infraDir, 'apache')
      await fs.ensureDir(apacheDir)
      await fs.writeFile(path.join(apacheDir, 'httpd.conf'), apacheConf, 'utf8')
      filesCreated++
    }

    // 6. SQLite setup
    const hasSqlite = settings.databases.some(d => d.enabled && d.type === 'sqlite')
    if (hasSqlite) {
      const sqliteDir = path.join(targetDir, paths.infraDir, 'sqlite')
      await fs.ensureDir(sqliteDir)
      await fs.writeFile(path.join(sqliteDir, 'README.md'), '# SQLite Shared Volume\nStores persistent database files (e.g. data.db) mounted across Docker containers and local apps.\n', 'utf8')
      filesCreated++
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
        await fs.ensureDir(path.dirname(fullPath))
        await fs.writeFile(fullPath, content, 'utf8')
        filesCreated++
      }
    }

    // 6c. Cloud env vars appended to .env and .env.example
    const cloudEnv = generateCloudEnvVars(settings.databases)
    if (cloudEnv.env) {
      const envPath = path.join(targetDir, '.env')
      const envExamplePath = path.join(targetDir, '.env.example')
      // Append to existing .env (created by meta generator)
      if (await fs.pathExists(envPath)) {
        await fs.appendFile(envPath, cloudEnv.env, 'utf8')
      } else {
        await fs.writeFile(envPath, cloudEnv.env, 'utf8')
        filesCreated++
      }
      // Create/append .env.example
      if (await fs.pathExists(envExamplePath)) {
        await fs.appendFile(envExamplePath, cloudEnv.envExample, 'utf8')
      } else {
        await fs.writeFile(envExamplePath, cloudEnv.envExample, 'utf8')
        filesCreated++
      }
    }

    // 7. Scaffold each Microservice / Application Service
    for (const app of settings.apps) {
      const relAppPath = paths.getAppRelativePath(app.folderName, app.id, app.role)
      const appDir = path.join(targetDir, relAppPath)
      await fs.ensureDir(appDir)

      // Hosted and native-client templates do not run as container services.
      if (!['python-anvil', 'swiftui-client'].includes(app.techId)) {
        const { dockerfile, dockerignore } = getDockerfileForTech(app.techId, app.port, app.folderName, app.starterProfile)
        await fs.writeFile(path.join(appDir, 'Dockerfile'), dockerfile, 'utf8')
        await fs.writeFile(path.join(appDir, '.dockerignore'), dockerignore, 'utf8')
        filesCreated += 2
      }

      // Scoped databases for this microservice
      const assignedDbs = settings.databases.filter(d => d.enabled && d.assignedAppId === app.id)

      // Service-isolated database folder (migrations & schema)
      if (assignedDbs.length > 0 && paths.databaseIsolation === 'service-isolated') {
        const dbDir = path.join(appDir, 'db')
        await fs.ensureDir(path.join(dbDir, 'migrations'))
        await fs.ensureDir(path.join(dbDir, 'seeds'))
        const schemaSql = `-- Database Schema for ${app.folderName}\n-- Dedicated Service Databases: ${assignedDbs.map(d => d.customName || d.type).join(', ')}\n\nCREATE TABLE IF NOT EXISTS service_health (\n  id SERIAL PRIMARY KEY,\n  service_name VARCHAR(100) DEFAULT '${app.folderName}',\n  status VARCHAR(20) DEFAULT 'healthy',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n`
        await fs.writeFile(path.join(dbDir, 'schema.sql'), schemaSql, 'utf8')
        const readmeDb = `# Database for ${app.folderName}\n\nThis folder holds local schema migrations and seed scripts for the ${app.folderName} microservice.\n\nAssigned instances:\n${assignedDbs.map(d => `- **${d.customName || d.type}** (Port :${d.port})`).join('\n')}\n`
        await fs.writeFile(path.join(dbDir, 'README.md'), readmeDb, 'utf8')
        filesCreated += 2
      }

      // App .env with service-level credentials
      let appEnv = `PORT=${app.port}\nNODE_ENV=development\nAPP_NAME=${app.folderName}\n`
      let appEnvExample = `PORT=${app.port}\nNODE_ENV=development\nAPP_NAME=${app.folderName}\n`
      if (app.techId === 'python-fastapi' && app.starterProfile === 'api-service') {
        appEnv += 'API_TOKEN=local-dev-token-change-me\n'
        appEnvExample += 'API_TOKEN=replace_with_random_secret\n'
      }
      const appDbs = settings.databases.filter(db => {
        if (!db.enabled || db.type === 'sqlite' || DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud) return false
        if (paths.databaseIsolation === 'service-isolated') return db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId
        return true
      })
      if (appDbs.length > 0) {
        appEnv += '\n# Database connection settings\n'
        appEnvExample += '\n# Database connection settings\n'
        appDbs.forEach((db, idx) => {
          const serviceName = getDbServiceName(db, settings.databases.indexOf(db), settings.apps)
          const credentials = databaseCredentials[serviceName]
          const catalogEntry = DATABASE_CATALOG.find(item => item.id === db.type)
          const containerPort = catalogEntry?.defaultPort || db.port
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
          } else if (db.type === 'rabbitmq' && credentials) {
            connectionUrl = `amqp://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@${host}:${port}`
            exampleUrl = `amqp://${encodeURIComponent(credentials.username)}:replace_me@${host}:${port}`
          }
          const variable = idx === 0 ? 'DATABASE_URL' : `${serviceName.toUpperCase()}_URL`
          if (connectionUrl) {
            appEnv += `${variable}=${connectionUrl}\n`
            appEnvExample += `${variable}=${exampleUrl}\n`
          } else {
            const variablePrefix = serviceName.toUpperCase()
            appEnv += `${variablePrefix}_HOST=${host}\n${variablePrefix}_PORT=${port}\n`
            appEnvExample += `${variablePrefix}_HOST=${host}\n${variablePrefix}_PORT=${port}\n`
          }
        })
      }
      for (const connection of app.connections || []) {
        const target = appById.get(connection.targetAppId)!
        const connectionUrl = resolveServiceConnectionUrl(app, target, settings.proxy, connection)
        appEnv += `${connection.envVar}=${connectionUrl}\n`
        appEnvExample += `${connection.envVar}=${connectionUrl}\n`
      }
      const appCloudVars = generateCloudEnvVars(settings.databases.filter(db => db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId))
      appEnv += appCloudVars.env
      appEnvExample += appCloudVars.envExample
      await fs.writeFile(path.join(appDir, '.env'), appEnv, 'utf8')
      await fs.writeFile(path.join(appDir, '.env.example'), appEnvExample, 'utf8')
      filesCreated += 2

      // Starter code files
      const starterFiles = getStarterFilesForTech(app.techId, app.folderName, app.port, app.flavor, app.starterProfile)
      for (const [fileName, fileContent] of Object.entries(starterFiles)) {
        const filePath = path.join(appDir, fileName)
        await fs.ensureDir(path.dirname(filePath))
        await fs.writeFile(filePath, fileContent, 'utf8')
        filesCreated++
      }

      const selectedToolIds = app.testingTools || []
      const selectedTools = selectedToolIds.map(id => TESTING_TOOLS.find(tool => tool.id === id)).filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
      const customToolPackages = (app.customTestingTools || []).map(tool => tool.packageName).filter((name): name is string => Boolean(name && /^[a-zA-Z0-9@/_.*-]+$/.test(name)))
      const appPackagePath = path.join(appDir, 'package.json')
      const hasNpmTools = selectedTools.some(tool => tool.ecosystem === 'npm' || (tool.ecosystem === 'cli' && Boolean(tool.scriptName))) || customToolPackages.length > 0
      if (hasNpmTools && await fs.pathExists(appPackagePath)) {
        try {
          const packageJson = await fs.readJson(appPackagePath)
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
              await fs.ensureDir(path.join(appDir, 'src/api'))
              await fs.writeFile(path.join(appDir, 'src/api/client.ts'), `import createClient from 'openapi-fetch'\nimport type { paths } from './schema'\n\nexport const createApiClient = (baseUrl: string, bearerToken?: string) =>\n  createClient<paths>({\n    baseUrl,\n    headers: bearerToken ? { Authorization: 'Bearer ' + bearerToken } : {}\n  })\n`, 'utf8')
              filesCreated++
            }
          }
          for (const packageName of customToolPackages) packageJson.devDependencies[packageName] = 'latest'
          await fs.writeJson(appPackagePath, packageJson, { spaces: 2 })
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
        await fs.writeFile(path.join(appDir, 'openapi.yaml'), spec + '\n', 'utf8')
        filesCreated++
      }

      if (selectedToolIds.includes('playwright')) {
        await fs.ensureDir(path.join(appDir, 'tests/e2e'))
        await fs.writeFile(path.join(appDir, 'playwright.config.ts'), `import { defineConfig } from '@playwright/test'\n\nexport default defineConfig({\n  testDir: './tests/e2e',\n  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:${app.port}' },\n  reporter: 'list'\n})\n`, 'utf8')
        await fs.writeFile(path.join(appDir, 'tests/e2e/home.spec.ts'), `import { test, expect } from '@playwright/test'\n\ntest('service responds', async ({ page }) => {\n  await page.goto('/')\n  await expect(page.locator('body')).toBeVisible()\n})\n`, 'utf8')
        filesCreated += 2
      }

      if (selectedToolIds.includes('newman')) {
        await fs.ensureDir(path.join(appDir, 'tests'))
        await fs.writeFile(path.join(appDir, 'tests/api.collection.json'), JSON.stringify({
          info: { name: `${app.folderName} API checks`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
          item: [{ name: 'Root responds', request: { method: 'GET', url: `http://127.0.0.1:${app.port}/` }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('responds successfully', function () { pm.expect(pm.response.code).to.be.below(500) })"] } }] }]
        }, null, 2) + '\n', 'utf8')
        filesCreated++
      }

      if (selectedToolIds.includes('bruno')) {
        await fs.ensureDir(path.join(appDir, 'tests/bruno'))
        await fs.writeFile(path.join(appDir, 'tests/bruno/health.bru'), `meta {\n  name: Health check\n  type: http\n  seq: 1\n}\n\nget {\n  url: http://127.0.0.1:${app.port}/health\n}\n\nassert {\n  res.status: < 500\n}\n`, 'utf8')
        filesCreated++
      }

      if (selectedToolIds.includes('storybook')) {
        await fs.ensureDir(path.join(appDir, '.storybook'))
        await fs.writeFile(path.join(appDir, '.storybook/main.ts'), `import type { StorybookConfig } from '@storybook/react-vite'\n\nconst config: StorybookConfig = {\n  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],\n  framework: { name: '@storybook/react-vite', options: {} }\n}\n\nexport default config\n`, 'utf8')
        await fs.writeFile(path.join(appDir, '.storybook/preview.ts'), `import type { Preview } from '@storybook/react-vite'\n\nconst preview: Preview = { parameters: { controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } } } }\nexport default preview\n`, 'utf8')
        await fs.ensureDir(path.join(appDir, 'src/stories'))
        await fs.writeFile(path.join(appDir, 'src/stories/Button.stories.tsx'), `import type { Meta, StoryObj } from '@storybook/react'\n\nconst meta: Meta = { title: 'Getting Started/Button', tags: ['autodocs'] }\nexport default meta\ntype Story = StoryObj\n\nexport const Example: Story = {\n  render: () => <button type="button">A component story</button>\n}\n`, 'utf8')
        filesCreated += 3
      }

      const customTools = app.customTestingTools || []
      if (selectedTools.length || customTools.length) {
        const setupNotes = [
          ...selectedTools.map(tool => `- **${tool.name}** (${tool.category}): ${tool.description}${tool.installPackages?.length ? ` Packages: \`${tool.installPackages.join('`, `')}\`.` : ''}${tool.id === 'openapi-client' ? ' Edit the copied api-contract.yaml when the API changes, then run `npm run api:generate`; npm also regenerates client types before dev and build.' : tool.scriptCommand ? ` Run with \`${tool.scriptCommand}\`.` : ''}`),
          ...customTools.map(tool => `- **${tool.name}**${tool.packageName ? ` (${tool.packageName})` : ''}: configure this tool's install and run command for your stack.`)
        ]
        await fs.ensureDir(path.join(appDir, 'tests'))
        await fs.writeFile(path.join(appDir, 'tests/TOOLING.md'), `# Testing tools for ${app.folderName}\n\n${setupNotes.join('\n')}\n`, 'utf8')
        filesCreated++
      }
    }

    for (const consumer of settings.apps.filter(app => (app.testingTools || []).includes('openapi-client'))) {
      const source = (consumer.connections || []).map(connection => ({ connection, app: appById.get(connection.targetAppId) }))
        .find(item => item.app && ['http', 'https'].includes(item.connection.protocol) && (item.app.testingTools || []).includes('swagger-openapi'))?.app
      if (!source) continue
      const sourcePath = path.join(targetDir, paths.getAppRelativePath(source.folderName, source.id, source.role), 'openapi.yaml')
      const consumerPath = path.join(targetDir, paths.getAppRelativePath(consumer.folderName, consumer.id, consumer.role), 'api-contract.yaml')
      await fs.copyFile(sourcePath, consumerPath)
      filesCreated++
    }

    // 8. Documentation files
    const diagramId = (prefix: string, index: number) => `${prefix}_${index + 1}`
    const mermaidLabel = (label: string) => JSON.stringify(label.replace(/[\r\n"]+/g, ' '))
    const appNodeIds = new Map(settings.apps.map((app, index) => [app.id, diagramId('app', index)]))
    const enabledDbs = settings.databases.filter(db => db.enabled)
    const dbNodeIds = new Map(enabledDbs.map((db, index) => [db, diagramId('db', index)]))
    const isCloudDb = (db: typeof enabledDbs[number]) => Boolean(DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud && db.type !== 'pocketbase')
    const serviceDiagram = [
      'flowchart LR',
      ...settings.apps.map((app, index) => `  ${diagramId('app', index)}[${mermaidLabel(`${app.folderName} · ${app.techId} · :${app.port}`)}]`),
      ...enabledDbs.map((db, index) => `  ${diagramId('db', index)}[${mermaidLabel(`${db.customName || db.type} · ${db.type} · ${db.port ? `:${db.port}` : 'managed/file'}`)}]`),
      ...settings.apps.flatMap(app => [
        ...(app.connections || []).flatMap(connection => {
          const target = appNodeIds.get(connection.targetAppId)
          const source = appNodeIds.get(app.id)
          return source && target ? [`  ${source} -->|${connection.protocol} ${connection.envVar}| ${target}`] : []
        }),
        ...enabledDbs.flatMap(db => {
          const source = appNodeIds.get(app.id)
          const target = dbNodeIds.get(db)
          if (!source || !target) return []
          const relevant = paths.databaseIsolation !== 'service-isolated' || db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId
          return relevant ? [`  ${source} -->|database| ${target}`] : []
        })
      ]),
      ...(settings.apps.length + enabledDbs.length === 0 ? ['  empty[No services selected]'] : [])
    ].join('\n')
    const topologyLines = [
      'flowchart LR',
      '  subgraph host["Host machine"]',
      '    client["Browser / external client"]',
      ...settings.apps.filter(app => app.runMode === 'host').map(app => `    ${appNodeIds.get(app.id)}[${mermaidLabel(`${app.folderName} · host :${app.port}`)}]`),
      ...enabledDbs.filter(db => db.type === 'sqlite').map(db => `    ${dbNodeIds.get(db)}[${mermaidLabel(`${db.customName || db.type} · local file`)}]`),
      '  end',
      '  subgraph docker["Docker bridge · lazystack_net"]',
      ...(settings.proxy.type !== 'none' ? [`    gateway[${mermaidLabel(`${settings.proxy.type} gateway · host :${settings.proxy.httpPort}`)}]`] : []),
      ...settings.apps.filter(app => app.runMode === 'docker').map(app => `    ${appNodeIds.get(app.id)}[${mermaidLabel(`${app.folderName} · container :${app.port} · published`)}]`),
      ...enabledDbs.filter(db => !isCloudDb(db) && db.type !== 'sqlite').map(db => `    ${dbNodeIds.get(db)}[${mermaidLabel(`${db.customName || db.type} · container${db.port ? ` · host :${db.port}` : ''}`)}]`),
      '  end',
      ...enabledDbs.filter(isCloudDb).map(db => `  ${dbNodeIds.get(db)}[${mermaidLabel(`${db.customName || db.type} · managed external`)}]`),
      ...(settings.proxy.type !== 'none' ? ['  client --> gateway'] : settings.apps.filter(app => app.runMode === 'docker').map(app => `  client --> ${appNodeIds.get(app.id)}`)),
      ...(settings.proxy.type !== 'none' ? settings.apps.filter(app => app.runMode === 'docker').map(app => `  gateway -->|${app.routePrefix || '/'}| ${appNodeIds.get(app.id)}`) : []),
      ...settings.apps.flatMap(app => (app.connections || []).flatMap(connection => {
        const target = appNodeIds.get(connection.targetAppId)
        const source = appNodeIds.get(app.id)
        return source && target ? [`  ${source} -. ${connection.protocol} .-> ${target}`] : []
      })),
      ...settings.apps.flatMap(app => enabledDbs.flatMap(db => {
        const source = appNodeIds.get(app.id)
        const target = dbNodeIds.get(db)
        const relevant = paths.databaseIsolation !== 'service-isolated' || db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId
        return source && target && relevant && (isCloudDb(db) || db.type === 'sqlite') ? [`  ${source} -. data connection .-> ${target}`] : []
      })),
      ...(settings.apps.length + enabledDbs.length === 0 ? ['  empty[No services selected]'] : [])
    ].join('\n')
    const archDoc = `# System Architecture: ${settings.projectName}\n\n- **Architecture style:** ${settings.structureConfig?.preset || 'monorepo'}\n- **Database pattern:** ${paths.databaseIsolation}\n- **Services:** ${settings.apps.length}\n- **Databases:** ${enabledDbs.length}\n- **Unified workspace:** ${settings.useUnifiedWorkspace === false ? 'off' : 'on'}\n\n## Service diagram\n\nShows service-to-service protocols and database dependencies.\n\n\`\`\`mermaid\n${serviceDiagram}\n\`\`\`\n\n## Network topology\n\nShows host-published endpoints, Docker bridge membership, host-run apps, and managed external services.\n\n\`\`\`mermaid\n${topologyLines}\n\`\`\`\n`
    await fs.writeFile(path.join(targetDir, paths.docsDir, 'architecture.md'), archDoc, 'utf8')
    filesCreated++

    // 9. Initialize Git repository
    try {
      const { exec } = await import('child_process')
      await new Promise<void>((resolve) => {
        exec('git init', { cwd: targetDir }, () => resolve())
      })
    } catch {
      // Ignore if git CLI is not installed on host
    }

    return {
      success: true,
      targetDir,
      filesCreated
    }
  } catch (error: any) {
    let errorMsg = error.message || 'Scaffolding failed'
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      errorMsg = `Permission denied writing to "${targetDir}". Try running with administrator privileges or choose a location in your user profile (e.g. C:\\Users\\<Username>\\Projects or ~/Projects).`
    } else if (error.code === 'ENOENT') {
      errorMsg = `Cannot write to destination "${targetDir}". Ensure that the drive letter and parent folders exist.`
    } else if (error.code === 'EINVAL') {
      errorMsg = `Destination path "${targetDir}" contains invalid characters for this operating system.`
    }
    return {
      success: false,
      targetDir,
      filesCreated,
      error: errorMsg
    }
  }
}
