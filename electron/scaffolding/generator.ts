import path from 'path'
import fs from 'fs-extra'
import { ProjectSettings } from '../../src/types'
import { validateFolderName, validatePath, joinPaths } from '../../src/utils/pathValidation'
import { generateDockerCompose, generateDockerDevCompose, getDockerfileForTech, getDbServiceName } from './templates/docker'
import { generateNginxConfig, generateApacheConfig } from './templates/proxies'
import { getStarterFilesForTech } from './templates/appTemplates'
import { generateMetaFiles } from './templates/meta'
import { generateCloudServiceFiles, generateCloudEnvVars } from './templates/cloudServices'
import { resolveStructurePaths } from '../../src/data/structurePresets'

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

  const targetDir = path.normalize(joinPaths(settings.parentDir, settings.projectName))
  const paths = resolveStructurePaths(settings)
  let filesCreated = 0

  try {
    // 1. Ensure target directory exists
    await fs.ensureDir(targetDir)

    // 2. Scaffold configured directory contract
    const directories = [
      '.github/workflows',
      '.vscode',
      paths.appsDir,
      paths.docsDir,
      paths.infraDir,
      paths.scriptsDir,
      paths.packagesDir,
      'tests'
    ]

    for (const dir of directories) {
      await fs.ensureDir(path.join(targetDir, dir))
    }

    // 3. Write Root Meta files
    const metaFiles = generateMetaFiles(settings)
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
      const relAppPath = paths.getAppRelativePath(app.folderName, app.id)
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
      if (assignedDbs.length > 0) {
        appEnv += `\n# Dedicated Microservice Database Connections\n`
        assignedDbs.forEach((d, idx) => {
          const sName = getDbServiceName(d, idx, settings.apps).toLowerCase()
          appEnv += `${sName.toUpperCase()}_PORT=${d.port}\n`
          appEnv += `${sName.toUpperCase()}_URL=${d.type}://lazystack_user:secret@${sName}:${d.port}/${d.databaseName || `${d.type}_db`}\n`
        })
      }
      await fs.writeFile(path.join(appDir, '.env'), appEnv, 'utf8')
      filesCreated++

      // Starter code files
      const starterFiles = getStarterFilesForTech(app.techId, app.folderName, app.port, app.flavor)
      for (const [fileName, fileContent] of Object.entries(starterFiles)) {
        const filePath = path.join(appDir, fileName)
        await fs.ensureDir(path.dirname(filePath))
        await fs.writeFile(filePath, fileContent, 'utf8')
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
