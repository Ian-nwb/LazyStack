import path from 'path'
import os from 'os'
import fs from 'fs-extra'
import { spawn } from 'child_process'
import { ensureUserPathsInEnv } from './auditor'

export interface InstallStep {
  id: number
  /** Project-relative directory ('.' for the root). */
  dir: string
  label: string
  command: string
  /** Executable that must be on PATH for the step to run. */
  binary: string
}

export interface InstallStepResult extends InstallStep {
  status: 'ok' | 'failed' | 'skipped'
  message?: string
  /** Tail of the command output, kept for failed steps. */
  output?: string
  durationMs: number
}

export type InstallProgressEvent =
  | { type: 'plan'; steps: InstallStep[] }
  | { type: 'step-start'; step: InstallStep; index: number; total: number }
  | { type: 'output'; stepId: number; line: string }
  | { type: 'step-end'; result: InstallStepResult; index: number; total: number }
  | { type: 'done'; result: InstallResultSummary }

export interface InstallResultSummary {
  success: boolean
  steps: InstallStepResult[]
  error?: string
  /** Flat log kept for backwards compatibility with the old IPC response. */
  output: string
}

const IGNORED = new Set(['node_modules', '.git', 'target', 'dist', 'build', '.venv', 'venv', 'vendor', '_build', 'deps', '.next', '.nuxt', '.output', '.svelte-kit', 'bin', 'obj', '.gradle', '.dart_tool', '.build', '.lazystack', 'out', 'coverage'])
const MAX_DEPTH = 4
const STEP_TIMEOUT_MS = 15 * 60 * 1000
const OUTPUT_TAIL_LINES = 40

/** Adds version-manager and toolchain directories that GUI-launched apps do not inherit. */
function extendPath() {
  ensureUserPathsInEnv()
  const home = os.homedir()
  const extra: string[] = []
  const versionDirs = (root: string, suffix: string[]) => {
    try {
      return fs.readdirSync(root).sort().reverse().map(version => path.join(root, version, ...suffix))
    } catch {
      return []
    }
  }
  if (process.platform === 'win32') {
    extra.push(path.join(home, '.dotnet', 'tools'), path.join(home, 'go', 'bin'), 'C:\\Program Files\\Go\\bin')
  } else {
    extra.push(
      ...versionDirs(path.join(home, '.nvm', 'versions', 'node'), ['bin']).slice(0, 1),
      path.join(home, '.volta', 'bin'),
      path.join(home, '.local', 'share', 'fnm', 'aliases', 'default', 'bin'),
      path.join(home, '.local', 'share', 'pnpm'),
      path.join(home, 'go', 'bin'),
      '/usr/local/go/bin',
      path.join(home, '.dotnet'),
      path.join(home, '.dotnet', 'tools'),
      path.join(home, '.mix', 'escripts'),
      path.join(home, '.pub-cache', 'bin'),
      path.join(home, 'flutter', 'bin'),
      path.join(home, '.juliaup', 'bin'),
      '/opt/homebrew/bin',
      '/home/linuxbrew/.linuxbrew/bin'
    )
  }
  const segments = (process.env.PATH || '').split(path.delimiter)
  for (const dir of extra) if (dir && !segments.includes(dir) && fs.existsSync(dir)) segments.push(dir)
  process.env.PATH = segments.join(path.delimiter)
}

function which(binary: string): boolean {
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : ['']
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      if (!dir) continue
      if (fs.existsSync(path.join(dir, binary + ext)) || fs.existsSync(path.join(dir, binary + ext.toLowerCase()))) return true
    }
  }
  return false
}

async function collectAppDirs(root: string): Promise<string[]> {
  const dirs = new Set<string>(['.'])
  async function walk(dir: string, depth: number) {
    let entries: fs.Dirent[]
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || IGNORED.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      dirs.add(path.relative(root, full).split(path.sep).join('/'))
      if (depth < MAX_DEPTH) await walk(full, depth + 1)
    }
  }
  await walk(root, 1)
  return [...dirs]
}

/** Works out which package managers to run, and where. Nothing is executed here. */
export async function planInstallSteps(targetPath: string): Promise<InstallStep[]> {
  extendPath()
  const isWin = process.platform === 'win32'
  const steps: InstallStep[] = []
  const add = (dir: string, label: string, command: string, binary: string) =>
    steps.push({ id: steps.length + 1, dir, label, command, binary })

  let rootWorkspaces = false
  try {
    const rootPkg = await fs.readJson(path.join(targetPath, 'package.json'))
    rootWorkspaces = Boolean(rootPkg.workspaces)
  } catch { /* no root package.json */ }

  for (const dir of await collectAppDirs(targetPath)) {
    const abs = path.join(targetPath, dir)
    const has = (file: string) => fs.existsSync(path.join(abs, file))
    let files: string[] = []
    try { files = await fs.readdir(abs) } catch { continue }

    if (has('package.json') && (dir === '.' || !rootWorkspaces)) add(dir, 'Node.js packages', 'npm install --no-audit --no-fund', 'npm')
    if (has('requirements.txt')) {
      const py = isWin ? 'python' : 'python3'
      const pip = isWin ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip'
      add(dir, 'Python virtualenv + requirements', `${py} -m venv .venv && ${pip} install -r requirements.txt`, py)
    }
    if (has('composer.json')) add(dir, 'Composer packages', 'composer install --no-interaction', 'composer')
    if (has('Gemfile')) add(dir, 'Ruby gems', 'bundle install', 'bundle')
    if (has('mix.exs')) add(dir, 'Elixir deps', 'mix local.hex --force --if-missing && mix deps.get', 'mix')
    if (has('Cargo.toml')) add(dir, 'Rust crates', 'cargo fetch', 'cargo')
    if (has('go.mod')) add(dir, 'Go modules', 'go mod tidy', 'go')
    if (files.some(file => file.endsWith('.csproj'))) add(dir, '.NET packages', 'dotnet restore', 'dotnet')
    if (has('pom.xml')) add(dir, 'Maven dependencies', 'mvn -q -B dependency:resolve', 'mvn')
    if (has('pubspec.yaml')) add(dir, 'Flutter packages', 'flutter pub get', 'flutter')
    if (has('shard.yml')) add(dir, 'Crystal shards', 'shards install', 'shards')
    if (has('rebar.config')) add(dir, 'Erlang deps', 'rebar3 get-deps', 'rebar3')
    if (has('Project.toml')) add(dir, 'Julia packages', 'julia --project=. -e "using Pkg; Pkg.instantiate()"', 'julia')
    if (has('deno.json') && has('main.ts')) add(dir, 'Deno modules', 'deno cache main.ts', 'deno')
  }
  return steps
}

function runStep(step: InstallStep, targetPath: string, onLine: (line: string) => void): Promise<{ ok: boolean; output: string; message?: string }> {
  return new Promise(resolve => {
    const tail: string[] = []
    const push = (chunk: Buffer) => {
      for (const raw of chunk.toString().split(/\r?\n/)) {
        const line = raw.replace(/\u001b\[[0-9;]*m/g, '').trimEnd()
        if (!line) continue
        tail.push(line)
        if (tail.length > OUTPUT_TAIL_LINES) tail.shift()
        onLine(line)
      }
    }
    const child = spawn(step.command, {
      cwd: path.join(targetPath, step.dir),
      shell: true,
      env: { ...process.env, CI: '1', npm_config_progress: 'false' },
      windowsHide: true
    })
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, output: tail.join('\n'), message: `Timed out after ${STEP_TIMEOUT_MS / 60000} minutes` })
    }, STEP_TIMEOUT_MS)
    child.stdout?.on('data', push)
    child.stderr?.on('data', push)
    child.on('error', error => {
      clearTimeout(timer)
      resolve({ ok: false, output: tail.join('\n'), message: error.message })
    })
    child.on('close', code => {
      clearTimeout(timer)
      resolve({ ok: code === 0, output: tail.join('\n'), message: code === 0 ? undefined : `Exited with code ${code}` })
    })
  })
}

/** Runs every planned step sequentially, reporting progress; never throws. */
export async function installDependencies(targetPath: string, onEvent: (event: InstallProgressEvent) => void = () => {}): Promise<InstallResultSummary> {
  const log: string[] = []
  const results: InstallStepResult[] = []
  try {
    if (!(await fs.pathExists(targetPath))) throw new Error(`Project folder not found: ${targetPath}`)
    const steps = await planInstallSteps(targetPath)
    onEvent({ type: 'plan', steps })
    for (const [index, step] of steps.entries()) {
      onEvent({ type: 'step-start', step, index, total: steps.length })
      const started = Date.now()
      let result: InstallStepResult
      if (!which(step.binary)) {
        result = { ...step, status: 'skipped', message: `'${step.binary}' was not found on PATH. Install it (see Host Auditor), then run: ${step.command}`, durationMs: 0 }
      } else {
        log.push(`[Installing] ${step.command} in ${step.dir}`)
        const run = await runStep(step, targetPath, line => {
          log.push(line)
          onEvent({ type: 'output', stepId: step.id, line })
        })
        result = { ...step, status: run.ok ? 'ok' : 'failed', message: run.message, output: run.ok ? undefined : run.output, durationMs: Date.now() - started }
      }
      results.push(result)
      onEvent({ type: 'step-end', result, index, total: steps.length })
    }
    const summary: InstallResultSummary = {
      success: results.every(result => result.status !== 'failed'),
      steps: results,
      output: log.join('\n'),
      error: steps.length === 0 ? 'No package manifests were found in this project.' : undefined
    }
    onEvent({ type: 'done', result: summary })
    return summary
  } catch (error) {
    const summary: InstallResultSummary = { success: false, steps: results, output: log.join('\n'), error: (error as Error).message }
    onEvent({ type: 'done', result: summary })
    return summary
  }
}
