import path from 'path'
import crypto from 'crypto'
import fs from 'fs-extra'
import { ProjectSettings } from '../../src/types'
import { validateFolderName, validatePath, validateRelativeProjectPath, joinPaths } from '../../src/utils/pathValidation'
import { createDatabaseCredentials } from './templates/meta'
import { planScaffold } from './plan'
import { DATABASE_CATALOG } from '../../src/data/databases'
import { resolveStructurePaths } from '../../src/data/structurePresets'
import { getDatabaseAdminUiOption } from '../../src/data/databaseAdminUis'
import { TECH_CATALOG, isHostOnlyTech } from '../../src/data/frameworks'
import { createScaffoldWriter, ScaffoldChanges, ScaffoldMode } from './writer'
import { getAppDatabases } from '../../src/utils/databaseScope'

export interface ScaffoldResult {
  success: boolean
  targetDir: string
  filesCreated: number
  error?: string
  /** Per-file outcome; always reported, and the only output of a dry run. */
  changes?: ScaffoldChanges
}

export { BLUEPRINT_VERSION } from './plan'

export interface ScaffoldOptions {
  /** `create` (default) writes a new project; `augment` adds to an existing one without overwriting app code. */
  mode?: ScaffoldMode
  /** Report the planned changes without touching the disk. */
  dryRun?: boolean
}

export async function scaffoldProject(inputSettings: ProjectSettings, options: ScaffoldOptions = {}): Promise<ScaffoldResult> {
  // Desktop, mobile and hosted apps always run on the host. Older blueprints may still
  // say `docker` for them (e.g. Electron, Tauri, Flutter), so normalize instead of failing.
  const settings: ProjectSettings = {
    ...inputSettings,
    apps: inputSettings.apps.map(app => isHostOnlyTech(app.techId) && app.runMode !== 'host' ? { ...app, runMode: 'host' } : app)
  }

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
    const appDatabases = getAppDatabases(settings, app)
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
  let filesCreated = 0

  const mode: ScaffoldMode = options.mode || 'create'
  const infraRoot = paths.infraDir.replace(/^\/+|\/+$/g, '')
  // In augment mode, apps whose directory already exists are the user's code: never scaffold into them.
  const existingAppDirs = new Set(mode === 'augment'
    ? (await Promise.all(settings.apps.map(async app => {
        const rel = paths.getAppRelativePath(app.folderName, app.id, app.role)
        return (await fs.pathExists(path.join(targetDir, rel))) ? rel : null
      }))).filter((rel): rel is string => Boolean(rel))
    : [])
  const protectedDirs = [...existingAppDirs].filter(rel => rel !== '.' && rel !== '')
  const out = createScaffoldWriter(targetDir, {
    mode,
    dryRun: Boolean(options.dryRun),
    protectedDirs,
    // Generated infrastructure that must reflect the updated stack; originals are backed up first.
    regenerable: rel => rel === 'lazystack.json'
      || rel === `${infraRoot}/docker-compose.yml`
      || rel === `${infraRoot}/docker-compose.dev.yml`
      || /^(nginx|apache|caddy|traefik)\//.test(rel.slice(infraRoot.length + 1)) && rel.startsWith(`${infraRoot}/`)
      || rel === `${paths.scriptsDir.replace(/^\/+|\/+$/g, '')}/dev-orchestrator.mjs`
  })

  try {
    // 1. Ensure target directory exists
    await out.ensureDir(targetDir)

    // 2. Plan every directory and file, then replay the plan through the writer so create,
    //    augment and dry-run modes all share one source of truth.
    const plan = planScaffold(settings, createDatabaseCredentials(settings, () => crypto.randomBytes(16).toString('hex')), { existingAppDirs })
    for (const dir of plan.dirs) await out.ensureDir(path.join(targetDir, dir))
    for (const [relPath, file] of Object.entries(plan.files)) {
      const fullPath = path.join(targetDir, relPath)
      await out.ensureDir(path.dirname(fullPath))
      await out.write(fullPath, file.content, 'utf8')
      filesCreated++
      if (file.mode) {
        try {
          await out.chmod(fullPath, file.mode)
        } catch {
          // Ignore on Windows
        }
      }
    }
    for (const copy of plan.diskCopies) {
      await out.copyFile(path.join(targetDir, copy.from), path.join(targetDir, copy.to))
      filesCreated++
    }

    // 10. Initialize Git repository for brand-new projects
    if (mode === 'create' && !options.dryRun && !(await fs.pathExists(path.join(targetDir, '.git')))) {
      try {
        const { exec } = await import('child_process')
        await new Promise<void>((resolve) => {
          exec('git init', { cwd: targetDir }, () => resolve())
        })
      } catch {
        // Ignore if git CLI is not installed on host
      }
    }

    return {
      success: true,
      targetDir,
      filesCreated: options.dryRun || mode === 'augment' ? out.changes.created.length + out.changes.updated.length + out.changes.merged.length : filesCreated,
      changes: out.changes
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
