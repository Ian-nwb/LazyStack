import path from 'path'
import fs from 'fs-extra'
import { spawn } from 'child_process'
import { ensureUserPathsInEnv } from './auditor'

export interface StackResult {
  success: boolean
  output?: string
  error?: string
  /** Project-relative Compose file that was used. */
  composeFile?: string
}

const COMPOSE_NAMES = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']
const FALLBACK_DIRS = ['infra', 'deploy', 'infrastructure', 'docker', '.']

/**
 * Finds the project's Compose file. LazyStack projects record their infrastructure folder in
 * lazystack.json (e.g. `deploy/` for the Polyglot layout or a custom folder); other projects are
 * searched in the usual locations.
 */
export async function findComposeFile(targetPath: string): Promise<string | null> {
  const dirs: string[] = []
  try {
    const blueprint = await fs.readJson(path.join(targetPath, 'lazystack.json'))
    const infraDir = String(blueprint?.structureConfig?.infraDir || '').replace(/^\/+|\/+$/g, '')
    if (infraDir) dirs.push(infraDir)
  } catch {
    // No blueprint, or not readable: fall back to the common locations below.
  }
  for (const dir of FALLBACK_DIRS) if (!dirs.includes(dir)) dirs.push(dir)
  for (const dir of dirs) {
    for (const name of COMPOSE_NAMES) {
      const candidate = path.join(dir, name)
      if (await fs.pathExists(path.join(targetPath, candidate))) return candidate.split(path.sep).join('/')
    }
  }
  return null
}

/** Runs `docker compose up -d` or `down` against the project's own Compose file. */
export async function runStack(targetPath: string, action: 'up' | 'down'): Promise<StackResult> {
  ensureUserPathsInEnv()
  const composeFile = await findComposeFile(targetPath)
  if (!composeFile) {
    return { success: false, error: `No docker-compose.yml found in ${FALLBACK_DIRS.filter(dir => dir !== '.').join('/, ')}/ or the project root.` }
  }
  const args = ['compose']
  if (await fs.pathExists(path.join(targetPath, '.env'))) args.push('--env-file', '.env')
  args.push('-f', composeFile, ...(action === 'up' ? ['up', '-d'] : ['down']))

  return new Promise(resolve => {
    let output = ''
    const child = spawn(process.platform === 'win32' ? 'docker.exe' : 'docker', args, { cwd: targetPath, env: process.env, windowsHide: true })
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })
    child.on('error', error => {
      const message = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'Docker was not found on PATH. Install Docker Desktop/Engine (see Host Auditor).' : error.message
      resolve({ success: false, error: message, output, composeFile })
    })
    child.on('close', code => {
      resolve(code === 0
        ? { success: true, output, composeFile }
        : { success: false, error: output.trim().split('\n').slice(-3).join('\n') || `docker compose exited with code ${code}`, output, composeFile })
    })
  })
}
