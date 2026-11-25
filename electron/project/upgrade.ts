import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import { spawnSync } from 'child_process'
import { ProjectSettings } from '../../src/types'
import { GENERATOR_VERSION, splitBlueprint } from '../../src/utils/blueprintMeta'
import { scaffoldProject } from '../scaffolding/generator'
import { mergeEnv } from '../scaffolding/writer'

/**
 * `lazystack upgrade`: pulls template fixes from a newer LazyStack into a generated project with a
 * three-way merge, the way Copier and cruft do.
 *
 *   base   = the project's blueprint rendered by the LazyStack version that generated it
 *   theirs = the same blueprint rendered by this version
 *   ours   = the files in the project now
 *
 * Files the user never changed take the new template; files only the user changed stay as they are;
 * files changed on both sides are merged with `git merge-file`, and overlapping edits get standard
 * conflict markers. `.env` files only gain missing keys (they hold generated secrets).
 */

export type UpgradeAction =
  | 'updated'          // the user had not changed it: new template written
  | 'merged'           // both sides changed, merged cleanly
  | 'conflict'         // both sides changed the same lines: conflict markers written
  | 'created'          // new in this version of the template
  | 'env-merged'       // .env gained missing keys
  | 'kept'             // only the user changed it, or the template did not change it
  | 'deleted-by-you'   // the template still has it, but the user removed it: not recreated
  | 'unchanged'        // already identical to the new template

export interface UpgradeFile {
  path: string
  action: UpgradeAction
  conflicts?: number
}

export interface UpgradeResult {
  success: boolean
  error?: string
  from?: string
  to: string
  files: UpgradeFile[]
  backupDir?: string
}

export interface UpgradeOptions {
  /** Version that generated the project. Defaults to `$generator` in its lazystack.json. */
  from?: string
  dryRun?: boolean
  /** Proceed even when the project is a git repository with uncommitted changes. */
  allowDirty?: boolean
  /**
   * Renders `settings` with LazyStack `version` into `parentDir` and returns the project folder.
   * Defaults to `npx lazystack@<version> scaffold`. Tests inject a renderer.
   */
  renderBase?: (version: string, settings: ProjectSettings, parentDir: string) => Promise<string>
}

const SKIP_DIRS = new Set(['.git', 'node_modules', '.lazystack'])
const ENV_FILE = /(^|\/)\.env$/
const toPosix = (value: string) => value.split(path.sep).join('/')

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(path.join(dir, entry.name))
      } else if (entry.isFile()) {
        out.push(toPosix(path.relative(root, path.join(dir, entry.name))))
      }
    }
  }
  if (await fs.pathExists(root)) await walk(root)
  return out
}

async function readMaybe(file: string): Promise<Buffer | undefined> {
  return (await fs.pathExists(file)) ? fs.readFile(file) : undefined
}

function runGit(args: string[], cwd?: string) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' })
}

/** Uncommitted changes in a git work tree, or null when the folder is not in one (or git is missing). */
function gitStatus(dir: string): string | null {
  const result = runGit(['status', '--porcelain'], dir)
  if (result.error || result.status !== 0) return null
  // LazyStack's own backups never count as user changes, even when .gitignore doesn't list them.
  return result.stdout.split('\n').filter(line => line.trim() && !line.includes('.lazystack/')).join('\n').trim()
}

/** npx lazystack@<version> scaffold, so the base is exactly what that version wrote. */
async function renderWithPublishedCli(version: string, settings: ProjectSettings, parentDir: string): Promise<string> {
  const blueprintFile = path.join(parentDir, 'blueprint.json')
  await fs.writeJson(blueprintFile, settings, { spaces: 2 })
  const windows = process.platform === 'win32'
  // npx is a .cmd shim on Windows, which needs a shell; quote paths that may contain spaces.
  const quote = (value: string) => windows && /\s/.test(value) ? `"${value}"` : value
  const args = ['--yes', `lazystack@${version}`, 'scaffold', '--config', blueprintFile, '--out', parentDir, '--skip-port-check'].map(quote)
  const result = spawnSync('npx', args, {
    encoding: 'utf8',
    shell: windows,
    env: { ...process.env, npm_config_update_notifier: 'false' }
  })
  if (result.error || result.status !== 0) {
    const detail = `${result.stderr || ''}${result.stdout || ''}`.trim().split('\n').slice(-3).join(' ')
    throw new Error(`could not run LazyStack ${version} from npm (npx lazystack@${version}): ${detail || result.error?.message || 'unknown error'}`)
  }
  return path.join(parentDir, settings.projectName)
}

async function renderCurrent(settings: ProjectSettings, parentDir: string): Promise<string> {
  const result = await scaffoldProject({ ...settings, parentDir, targetDir: path.join(parentDir, settings.projectName) })
  if (!result.success) throw new Error(`could not render the project with LazyStack ${GENERATOR_VERSION}: ${result.error}`)
  return path.join(parentDir, settings.projectName)
}

/** Three-way text merge with `git merge-file`. Returns the merged text and the number of conflicts. */
async function mergeText(work: string, ours: Buffer, base: Buffer, theirs: Buffer, labels: [string, string, string]): Promise<{ text: string; conflicts: number }> {
  const files = ['ours', 'base', 'theirs'].map(name => path.join(work, name))
  await Promise.all([fs.writeFile(files[0], ours), fs.writeFile(files[1], base), fs.writeFile(files[2], theirs)])
  const result = runGit(['merge-file', '-p', '-L', labels[0], '-L', labels[1], '-L', labels[2], ...files])
  if (result.error) throw new Error('git is needed to merge files (git merge-file). Install git and run the upgrade again.')
  if (result.status === null || result.status < 0 || result.status > 127) throw new Error(`git merge-file failed: ${result.stderr.trim()}`)
  return { text: result.stdout, conflicts: result.status }
}

const isBinary = (data: Buffer) => data.includes(0)

export async function upgradeProject(projectDir: string, options: UpgradeOptions = {}): Promise<UpgradeResult> {
  const to = GENERATOR_VERSION
  const root = path.resolve(projectDir)
  const blueprintPath = path.join(root, 'lazystack.json')
  if (!(await fs.pathExists(blueprintPath))) {
    return { success: false, to, files: [], error: `${root} has no lazystack.json. Only projects generated by LazyStack can be upgraded.` }
  }

  let meta: ReturnType<typeof splitBlueprint>['meta']
  let settings: ProjectSettings
  try {
    const split = splitBlueprint(await fs.readJson(blueprintPath))
    meta = split.meta
    settings = { ...split.settings, projectName: split.settings.projectName || path.basename(root), parentDir: path.dirname(root), targetDir: root }
  } catch (error) {
    return { success: false, to, files: [], error: `lazystack.json could not be read: ${(error as Error).message}` }
  }

  const from = options.from || meta.$generator
  if (!from) {
    return { success: false, to, files: [], error: 'This project does not record which LazyStack version generated it (projects made before 2.1.0). Run the upgrade with --from <version>, for example --from 2.0.0.' }
  }
  if (from === to && !options.from) {
    return { success: true, from, to, files: [] }
  }

  const dirty = gitStatus(root)
  if (dirty && !options.allowDirty && !options.dryRun) {
    return { success: false, from, to, files: [], error: 'The project has uncommitted changes. Commit or stash them first so the upgrade is easy to review and undo, or pass --allow-dirty.' }
  }

  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'lazystack-upgrade-'))
  try {
    const renderBase = options.renderBase || renderWithPublishedCli
    let baseRoot: string
    let theirsRoot: string
    try {
      await fs.ensureDir(path.join(work, 'base'))
      await fs.ensureDir(path.join(work, 'theirs'))
      await fs.ensureDir(path.join(work, 'merge'))
      const portable = { ...settings, parentDir: path.join(work, 'base'), targetDir: '' }
      baseRoot = await renderBase(from, portable, path.join(work, 'base'))
      theirsRoot = await renderCurrent(settings, path.join(work, 'theirs'))
    } catch (error) {
      return { success: false, from, to, files: [], error: (error as Error).message }
    }

    const paths = [...new Set([...await listFiles(baseRoot), ...await listFiles(theirsRoot)])].sort()
    const files: UpgradeFile[] = []
    const writes: Array<{ rel: string; content: Buffer | string }> = []
    const labels: [string, string, string] = ['yours', `lazystack ${from}`, `lazystack ${to}`]

    for (const rel of paths) {
      const [ours, base, theirs] = await Promise.all([
        readMaybe(path.join(root, rel)), readMaybe(path.join(baseRoot, rel)), readMaybe(path.join(theirsRoot, rel))
      ])
      // Removed from the template: leave the user's copy alone.
      if (!theirs) continue

      if (ENV_FILE.test(rel)) {
        if (!ours) { files.push({ path: rel, action: 'created' }); writes.push({ rel, content: theirs }); continue }
        const merged = mergeEnv(ours.toString('utf8'), theirs.toString('utf8'))
        if (merged === ours.toString('utf8')) files.push({ path: rel, action: 'kept' })
        else { files.push({ path: rel, action: 'env-merged' }); writes.push({ rel, content: merged }) }
        continue
      }

      if (rel === 'lazystack.json') {
        // Keep the user's settings (they may have edited them), and record the new generator version.
        const current = splitBlueprint(await fs.readJson(blueprintPath)).settings
        const next = JSON.stringify({ ...splitBlueprint(JSON.parse(theirs.toString('utf8'))).meta, ...current }, null, 2) + '\n'
        if (ours && ours.toString('utf8') === next) files.push({ path: rel, action: 'unchanged' })
        else { files.push({ path: rel, action: 'updated' }); writes.push({ rel, content: next }) }
        continue
      }

      if (!ours) {
        if (base) files.push({ path: rel, action: 'deleted-by-you' })
        else { files.push({ path: rel, action: 'created' }); writes.push({ rel, content: theirs }) }
        continue
      }
      if (ours.equals(theirs)) { files.push({ path: rel, action: 'unchanged' }); continue }
      if (base && ours.equals(base)) { files.push({ path: rel, action: 'updated' }); writes.push({ rel, content: theirs }); continue }
      if (base && base.equals(theirs)) { files.push({ path: rel, action: 'kept' }); continue }

      // Both sides changed (or the file existed before this template version generated it).
      if (isBinary(ours) || isBinary(theirs) || (base && isBinary(base))) { files.push({ path: rel, action: 'kept' }); continue }
      const { text, conflicts } = await mergeText(path.join(work, 'merge'), ours, base || Buffer.alloc(0), theirs, labels)
      files.push(conflicts ? { path: rel, action: 'conflict', conflicts } : { path: rel, action: 'merged' })
      writes.push({ rel, content: text })
    }

    let backupDir: string | undefined
    if (!options.dryRun && writes.length) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupRoot = path.join(root, '.lazystack', 'backup', `upgrade-${stamp}`)
      for (const { rel, content } of writes) {
        const target = path.join(root, rel)
        if (await fs.pathExists(target)) {
          await fs.ensureDir(path.dirname(path.join(backupRoot, rel)))
          await fs.copyFile(target, path.join(backupRoot, rel))
          backupDir = toPosix(path.relative(root, backupRoot))
        }
        await fs.ensureDir(path.dirname(target))
        await fs.writeFile(target, content)
      }
    }
    return { success: true, from, to, files, backupDir }
  } finally {
    await fs.remove(work).catch(() => undefined)
  }
}
