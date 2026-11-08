import path from 'path'
import fs from 'fs-extra'

export type ScaffoldMode = 'create' | 'augment'

export interface ScaffoldChanges {
  created: string[]
  updated: string[]
  merged: string[]
  skipped: string[]
  backupDir?: string
}

export interface WriterOptions {
  mode: ScaffoldMode
  dryRun: boolean
  /** Project-relative files that augment mode may regenerate (after backing up the original). */
  regenerable: (relPath: string) => boolean
  /** Project-relative directories of apps that already exist; augment mode never writes inside them. */
  protectedDirs: string[]
}

const toPosix = (value: string) => value.split(path.sep).join('/')
const MERGEABLE_ENV = /(^|\/)\.env(\.example)?$/

function mergeEnv(existing: string, generated: string): string {
  const keys = new Set(existing.split(/\r?\n/).map(line => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1]).filter(Boolean))
  const additions = generated.split(/\r?\n/).filter(line => {
    const key = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1]
    return key && !keys.has(key)
  })
  if (!additions.length) return existing
  return `${existing.replace(/\s*$/, '')}\n\n# Added by LazyStack\n${additions.join('\n')}\n`
}

/**
 * File-system facade used by the generator. In `create` mode it writes everything.
 * In `augment` mode (modifying an existing project) it:
 *  - creates files that do not exist yet,
 *  - never touches anything inside an existing app's directory,
 *  - appends missing keys to existing `.env` / `.env.example` files instead of replacing them,
 *  - regenerates whitelisted infrastructure files after copying the originals to `.lazystack/backup/<timestamp>/`,
 *  - leaves every other existing file untouched.
 * With `dryRun` it only records what would happen.
 */
export function createScaffoldWriter(targetDir: string, options: WriterOptions) {
  const changes: ScaffoldChanges = { created: [], updated: [], merged: [], skipped: [] }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupRoot = path.join(targetDir, '.lazystack', 'backup', stamp)
  const augment = options.mode === 'augment'
  const isProtected = (rel: string) => options.protectedDirs.some(dir => rel === dir || rel.startsWith(`${dir}/`))

  const relative = (filePath: string) => toPosix(path.relative(targetDir, filePath))

  async function decide(filePath: string): Promise<'write' | 'skip' | 'merge' | 'regenerate'> {
    if (!augment) return 'write'
    const rel = relative(filePath)
    if (isProtected(rel)) return 'skip'
    if (!(await fs.pathExists(filePath))) return 'write'
    if (MERGEABLE_ENV.test(rel)) return 'merge'
    if (options.regenerable(rel)) return 'regenerate'
    return 'skip'
  }

  async function backup(filePath: string) {
    const destination = path.join(backupRoot, path.relative(targetDir, filePath))
    await fs.ensureDir(path.dirname(destination))
    await fs.copyFile(filePath, destination)
    changes.backupDir = toPosix(path.relative(targetDir, backupRoot))
  }

  async function write(filePath: string, content: string | Buffer, _encoding?: BufferEncoding): Promise<boolean> {
    const rel = relative(filePath)
    const action = await decide(filePath)
    if (action === 'skip') {
      changes.skipped.push(rel)
      return false
    }
    if (action === 'merge') {
      const existing = await fs.readFile(filePath, 'utf8')
      const merged = mergeEnv(existing, content.toString())
      if (merged === existing) {
        changes.skipped.push(rel)
        return false
      }
      changes.merged.push(rel)
      if (!options.dryRun) {
        await backup(filePath)
        await fs.writeFile(filePath, merged, 'utf8')
      }
      return true
    }
    if (action === 'regenerate') {
      const existing = await fs.readFile(filePath, 'utf8')
      if (existing === content.toString()) {
        changes.skipped.push(rel)
        return false
      }
      changes.updated.push(rel)
      if (!options.dryRun) await backup(filePath)
    } else {
      changes.created.push(rel)
    }
    if (!options.dryRun) {
      await fs.ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, content)
    }
    return true
  }

  return {
    changes,
    write,
    async writeJson(filePath: string, value: unknown, _options?: unknown) {
      return write(filePath, JSON.stringify(value, null, 2) + '\n')
    },
    async ensureDir(dirPath: string) {
      // Augment mode creates folders only as a side effect of writing a file into them,
      // so an existing repository never gains empty scaffolding directories.
      if (options.dryRun || augment) return
      await fs.ensureDir(dirPath)
    },
    async chmod(filePath: string, mode: number) {
      if (options.dryRun || !(await fs.pathExists(filePath))) return
      const rel = relative(filePath)
      if (augment && !changes.created.includes(rel) && !changes.updated.includes(rel)) return
      await fs.chmod(filePath, mode)
    },
    async copyFile(source: string, destination: string) {
      if (options.dryRun && !(await fs.pathExists(source))) {
        changes.created.push(relative(destination))
        return
      }
      return write(destination, await fs.readFile(source))
    }
  }
}
