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
    const directories = [
      '.github/workflows',
      '.vscode',
      ...appRootDirectories,
      paths.docsDir,
      paths.infraDir,
      paths.scriptsDir,
      paths.packagesDir,
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

      // Dockerfile & .dockerignore
      const { dockerfile, dockerignore } = getDockerfileForTech(app.techId, app.port)
      await fs.writeFile(path.join(appDir, 'Dockerfile'), dockerfile, 'utf8')
      await fs.writeFile(path.join(appDir, '.dockerignore'), dockerignore, 'utf8')
      filesCreated += 2

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
      const starterFiles = getStarterFilesForTech(app.techId, app.folderName, app.port, app.flavor)
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
      const hasNpmTools = selectedTools.some(tool => tool.ecosystem === 'npm') || customToolPackages.length > 0
      if (hasNpmTools && await fs.pathExists(appPackagePath)) {
        try {
          const packageJson = await fs.readJson(appPackagePath)
          packageJson.devDependencies = packageJson.devDependencies || {}
          packageJson.scripts = packageJson.scripts || {}
          for (const tool of selectedTools) {
            if (tool.ecosystem === 'npm') for (const packageName of tool.installPackages || []) packageJson.devDependencies[packageName] = 'latest'
            if (tool.scriptName && tool.scriptCommand) packageJson.scripts[tool.scriptName] = tool.scriptCommand
          }
          for (const packageName of customToolPackages) packageJson.devDependencies[packageName] = 'latest'
          await fs.writeJson(appPackagePath, packageJson, { spaces: 2 })
        } catch {
          // Some non-Node services include JSON files that are not npm manifests; leave them untouched.
        }
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
          ...selectedTools.map(tool => `- **${tool.name}** (${tool.category}): ${tool.description}${tool.installPackages?.length ? ` Packages: \`${tool.installPackages.join('`, `')}\`.` : ''}${tool.scriptCommand ? ` Run with \`${tool.scriptCommand}\`.` : ''}`),
          ...customTools.map(tool => `- **${tool.name}**${tool.packageName ? ` (${tool.packageName})` : ''}: configure this tool's install and run command for your stack.`)
        ]
        await fs.ensureDir(path.join(appDir, 'tests'))
        await fs.writeFile(path.join(appDir, 'tests/TOOLING.md'), `# Testing tools for ${app.folderName}\n\n${setupNotes.join('\n')}\n`, 'utf8')
        filesCreated++
      }
    }

    // 8. Documentation files
    const archDoc = `# System Architecture: ${settings.projectName}\n\n- **Architecture Style**: ${settings.structureConfig?.preset || 'monorepo'}\n- **Database Pattern**: ${paths.databaseIsolation}\n- **Services**: ${settings.apps.length}\n- **Databases**: ${settings.databases.filter(d => d.enabled).length}\n\nAuto-generated documentation of components, services, and networking topology.\n`
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
