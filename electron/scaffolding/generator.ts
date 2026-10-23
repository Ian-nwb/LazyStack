import path from 'path'
import fs from 'fs-extra'
import { ProjectSettings } from '../../src/types'
import { generateDockerCompose, generateDockerDevCompose, getDockerfileForTech } from './templates/docker'
import { generateNginxConfig, generateApacheConfig } from './templates/proxies'
import { getStarterFilesForTech } from './templates/appTemplates'
import { generateMetaFiles } from './templates/meta'

export interface ScaffoldResult {
  success: boolean
  targetDir: string
  filesCreated: number
  error?: string
}

export async function scaffoldProject(settings: ProjectSettings): Promise<ScaffoldResult> {
  const targetDir = settings.targetDir || path.join(settings.parentDir, settings.projectName)
  let filesCreated = 0

  try {
    // 1. Ensure target directory exists
    await fs.ensureDir(targetDir)

    // 2. Scaffold enforced directory contract
    const directories = [
      '.github/workflows',
      '.vscode',
      'apps',
      'docs',
      'infra',
      'scripts',
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
    await fs.writeFile(path.join(targetDir, 'infra/docker-compose.yml'), composeContent, 'utf8')
    filesCreated++

    const devComposeContent = generateDockerDevCompose(settings)
    await fs.writeFile(path.join(targetDir, 'infra/docker-compose.dev.yml'), devComposeContent, 'utf8')
    filesCreated++

    // 5. Write Proxy Configurations
    if (settings.proxy.type === 'nginx') {
      const nginxConfigs = generateNginxConfig(settings)
      const nginxDir = path.join(targetDir, 'infra/nginx')
      await fs.ensureDir(nginxDir)
      await fs.writeFile(path.join(nginxDir, 'nginx.conf'), nginxConfigs['nginx.conf'], 'utf8')
      await fs.writeFile(path.join(nginxDir, 'default.conf'), nginxConfigs['default.conf'], 'utf8')
      filesCreated += 2
    } else if (settings.proxy.type === 'apache') {
      const apacheConf = generateApacheConfig(settings)
      const apacheDir = path.join(targetDir, 'infra/apache')
      await fs.ensureDir(apacheDir)
      await fs.writeFile(path.join(apacheDir, 'httpd.conf'), apacheConf, 'utf8')
      filesCreated++
    }

    // 6. SQLite setup
    const hasSqlite = settings.databases.some(d => d.enabled && d.type === 'sqlite')
    if (hasSqlite) {
      const sqliteDir = path.join(targetDir, 'infra/sqlite')
      await fs.ensureDir(sqliteDir)
      await fs.writeFile(path.join(sqliteDir, 'README.md'), '# SQLite Shared Volume\nStores persistent database files (e.g. data.db) mounted across Docker containers and local apps.\n', 'utf8')
      filesCreated++
    }

    // 7. Scaffold each Application Service
    for (const app of settings.apps) {
      const appDir = path.join(targetDir, 'apps', app.folderName)
      await fs.ensureDir(appDir)

      // Dockerfile & .dockerignore
      const { dockerfile, dockerignore } = getDockerfileForTech(app.techId, app.port)
      await fs.writeFile(path.join(appDir, 'Dockerfile'), dockerfile, 'utf8')
      await fs.writeFile(path.join(appDir, '.dockerignore'), dockerignore, 'utf8')
      filesCreated += 2

      // App .env
      const appEnv = `PORT=${app.port}\nNODE_ENV=development\nAPP_NAME=${app.folderName}\n`
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
    const archDoc = `# System Architecture: ${settings.projectName}\n\nAuto-generated documentation of components, services, and networking topology.\n`
    await fs.writeFile(path.join(targetDir, 'docs/architecture.md'), archDoc, 'utf8')
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
    return {
      success: false,
      targetDir,
      filesCreated,
      error: error.message || 'Scaffolding failed'
    }
  }
}
