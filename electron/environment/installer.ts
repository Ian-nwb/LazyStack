import { spawn } from 'child_process'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { MONITORED_BINARIES, ensureUserPathsInEnv, findOnPath } from './auditor'

export interface InstallResult {
  success: boolean
  binary: string
  message: string
  addedToPath?: boolean
  output?: string
}

type PackageManager = 'apt' | 'dnf' | 'pacman' | 'brew' | 'winget' | 'unknown'
type Recipe = NonNullable<(typeof MONITORED_BINARIES)[number]['installCommand']>

const INSTALL_TIMEOUT_MS = 15 * 60 * 1000
const MAX_OUTPUT = 64 * 1024

const PM_LABEL: Record<PackageManager, string> = {
  apt: 'apt',
  dnf: 'dnf',
  pacman: 'pacman',
  brew: 'Homebrew',
  winget: 'winget',
  unknown: 'your package manager'
}

/** Uses a PATH lookup instead of `which`, which minimal images (e.g. archlinux:base) don't ship. */
function detectPackageManager(): PackageManager {
  if (process.platform === 'darwin') return 'brew'
  if (process.platform === 'win32') return 'winget'
  if (findOnPath('apt-get')) return 'apt'
  if (findOnPath('dnf')) return 'dnf'
  if (findOnPath('pacman')) return 'pacman'
  return 'unknown'
}

interface RunResult {
  code: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

/**
 * Runs a shell command with stdin closed, so a tool that waits for an answer (winget's agreement
 * prompt, apt questions) fails instead of hanging until the timeout.
 */
function run(command: string, timeoutMs = INSTALL_TIMEOUT_MS): Promise<RunResult> {
  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const child = spawn(command, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      windowsHide: true
    })
    const append = (buf: string, chunk: Buffer) => (buf + chunk.toString()).slice(-MAX_OUTPUT)
    child.stdout?.on('data', chunk => { stdout = append(stdout, chunk) })
    child.stderr?.on('data', chunk => { stderr = append(stderr, chunk) })
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, timeoutMs)
    child.on('error', err => {
      clearTimeout(timer)
      resolve({ code: null, stdout, stderr: stderr + String(err), timedOut })
    })
    child.on('close', code => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    })
  })
}

const shQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

/** System package manager commands need root; user-level installers (cargo, dart pub, npm -g, curl | sh) must not. */
function isSystemCommand(command: string): boolean {
  return /^(apt-get|apt|pacman|dnf|snap)\b/.test(command)
}

let aptUpdated = false

type Elevation =
  | { kind: 'run'; command: string; viaPkexec: boolean }
  | { kind: 'manual'; command: string }

/**
 * A GUI app has no terminal, so a plain `sudo` fails at once ("a terminal is required to read the
 * password"), or, under `npm run dev`, prompts unseen in the dev server's terminal. Use root if we
 * have it, then passwordless/cached sudo, then pkexec (graphical prompt), else hand back the command.
 */
async function elevate(script: string): Promise<Elevation> {
  if (process.getuid?.() === 0) return { kind: 'run', command: `/bin/sh -c ${shQuote(script)}`, viaPkexec: false }
  if (findOnPath('sudo')) {
    const probe = await run('sudo -n true', 10000)
    if (probe.code === 0) return { kind: 'run', command: `sudo -n /bin/sh -c ${shQuote(script)}`, viaPkexec: false }
  }
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY)
  if (findOnPath('pkexec') && hasDisplay) {
    return { kind: 'run', command: `pkexec /bin/sh -c ${shQuote(script)}`, viaPkexec: true }
  }
  return { kind: 'manual', command: `sudo sh -c ${shQuote(script)}` }
}

let wingetAvailable: boolean | null = null

/** winget.exe is an App Execution Alias (a 0-byte reparse point) that a stat-based PATH lookup can miss, so ask it directly. */
async function hasWinget(): Promise<boolean> {
  if (wingetAvailable === null) wingetAvailable = (await run('winget --version', 20000)).code === 0
  return wingetAvailable
}

/** Turns a recipe's `winget install <Id>` into an exact, non-interactive install. */
function wingetCommand(command: string): string {
  const match = command.match(/^winget install\s+(\S+)\s*$/)
  if (!match) return command
  return `winget install --id ${match[1]} -e --accept-source-agreements --accept-package-agreements --silent`
}

interface Attempt {
  command: string
  system: boolean
}

function plannedAttempts(pm: PackageManager, recipe: Recipe): { attempts: Attempt[]; skipped?: string } {
  const attempts: Attempt[] = []
  let skipped: string | undefined
  let primary: string | undefined
  switch (pm) {
    case 'apt': primary = recipe.linuxApt; break
    case 'dnf': primary = recipe.linuxDnf; break
    case 'pacman': primary = recipe.linuxPacman; break
    case 'brew': primary = recipe.macosBrew; break // Homebrew must not run as root
    case 'winget': primary = recipe.windowsWinget; break
  }
  if (primary && /^snap\b/.test(primary) && !findOnPath('snap')) {
    skipped = `the ${PM_LABEL[pm]} recipe uses snap, which isn't installed`
    primary = undefined
  }
  if (primary) attempts.push({ command: primary, system: process.platform === 'linux' && isSystemCommand(primary) })

  // Linux fallback: a user-level installer, used when there is no recipe for this package manager
  // or the package manager could not install it (package missing from this distro's repos).
  if (process.platform === 'linux') {
    const fallback = recipe.linuxFallback ?? (recipe.linuxApt && !isSystemCommand(recipe.linuxApt) ? recipe.linuxApt : undefined)
    if (fallback && fallback !== primary) attempts.push({ command: fallback, system: false })
  }
  return { attempts, skipped }
}

/** Extra PATH entries for installers that put binaries in a user directory. */
function userBinDirs(id: string): string[] {
  const home = os.homedir()
  switch (id) {
    case 'bun': return [path.join(home, '.bun', 'bin')]
    case 'cargo':
    case 'rustc':
    case 'trunk':
    case 'dx': return [path.join(home, '.cargo', 'bin')]
    case 'deno': return [path.join(home, '.deno', 'bin')]
    case 'serverpod':
    case 'jaspr': return [path.join(home, '.pub-cache', 'bin')]
    case 'composer': return [path.join(home, '.config', 'composer', 'vendor', 'bin')]
    case 'dotnet': return [path.join(home, '.dotnet')]
    case 'dart': return [path.join(home, '.local', 'share', 'dart-sdk', 'bin')]
    case 'sbt': return [path.join(home, '.local', 'share', 'sbt', 'bin')]
    case 'gradle': return [path.join(home, '.local', 'share', 'gradle', 'bin')]
    case 'flutter': return [path.join(home, 'development', 'flutter', 'bin')]
    case 'gleam': return [path.join(home, '.local', 'bin')]
    case 'nim': return [path.join(home, '.nimble', 'bin')]
    case 'julia': return [path.join(home, '.juliaup', 'bin')]
    default: return []
  }
}

function powershellEncoded(script: string): string {
  return `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${Buffer.from(script, 'utf16le').toString('base64')}`
}

/**
 * Permanently adds a directory to the user's PATH and updates the running process.env.PATH.
 * Windows: edits only HKCU\Environment\Path (keeping %VAR% references). `setx PATH "%PATH%;dir"`
 * copied the merged system+user PATH into the user PATH and truncated it at 1024 characters.
 */
export async function addDirectoryToPath(dirPath: string): Promise<boolean> {
  try {
    if (typeof dirPath !== 'string' || !path.isAbsolute(dirPath) || !fs.existsSync(dirPath)) return false

    const currentPath = process.env.PATH || ''
    const sameDir = (a: string, b: string) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
    if (!currentPath.split(path.delimiter).some(p => sameDir(p, dirPath))) {
      process.env.PATH = `${dirPath}${path.delimiter}${currentPath}`
    }

    if (process.platform === 'win32') {
      const ps = [
        `$d = '${dirPath.replace(/'/g, "''")}'`,
        `$k = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)`,
        `$p = [string]$k.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)`,
        `$parts = @($p -split ';' | Where-Object { $_ -ne '' })`,
        `if ($parts -notcontains $d -and $parts -notcontains ($d + '\\')) {`,
        `  $k.SetValue('Path', (($parts + $d) -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString)`,
        `  [Environment]::SetEnvironmentVariable('LAZYSTACK_PATH_REFRESH', '1', 'User')`,
        `  [Environment]::SetEnvironmentVariable('LAZYSTACK_PATH_REFRESH', $null, 'User')`,
        `  'added'`,
        `}`,
        `$k.Close()`
      ].join('\n')
      const res = await run(powershellEncoded(ps), 30000)
      return res.code === 0 && res.stdout.includes('added')
    }

    // Linux & macOS: append to existing shell configs that don't mention the directory yet.
    const home = os.homedir()
    const exportLine = `\nexport PATH="$PATH:${dirPath}" # Added by LazyStack\n`
    let modified = false
    for (const cfg of ['.bashrc', '.zshrc', '.profile'].map(f => path.join(home, f))) {
      if (fs.existsSync(cfg) && !fs.readFileSync(cfg, 'utf8').includes(dirPath)) {
        fs.appendFileSync(cfg, exportLine, 'utf8')
        modified = true
      }
    }
    return modified
  } catch (err) {
    console.error('Error adding directory to PATH:', err)
    return false
  }
}

function tail(text: string, lines = 6): string {
  return text.trim().split('\n').slice(-lines).join('\n')
}

export async function installBinary(binaryOrId: string): Promise<InstallResult> {
  ensureUserPathsInEnv()

  const item = MONITORED_BINARIES.find(b => b.id === binaryOrId || b.binary === binaryOrId)
  if (!item) {
    return { success: false, binary: binaryOrId, message: `No automated installation recipe defined for ${binaryOrId}` }
  }
  const manualHint = item.docsUrl ? ` Install it manually: ${item.docsUrl}` : ''
  const pm = detectPackageManager()
  const { attempts, skipped } = plannedAttempts(pm, item.installCommand ?? {})

  if (attempts.length === 0) {
    const why = pm === 'unknown'
      ? `LazyStack installs with apt, dnf or pacman on Linux and found none of them.`
      : `No automatic install for ${item.name} with ${PM_LABEL[pm]}${skipped ? ` (${skipped})` : ''}.`
    return { success: false, binary: item.binary, message: `${why}${manualHint}` }
  }

  const failures: string[] = []
  let output = ''

  for (const attempt of attempts) {
    let command = attempt.command
    if (pm === 'winget' && /^winget\b/.test(command)) {
      if (!(await hasWinget())) {
        failures.push(`winget isn't available on this PC (install "App Installer" from the Microsoft Store)`)
        continue
      }
      command = wingetCommand(command)
    }

    let viaPkexec = false
    if (attempt.system) {
      let script = command
      if (pm === 'apt' && /^apt(-get)?\b/.test(command)) {
        script = aptUpdated
          ? `export DEBIAN_FRONTEND=noninteractive; ${command}`
          : `export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && { ${command}; }`
      } else if (pm === 'pacman' && /^pacman\b/.test(command)) {
        // Only sync when there is no package database at all (fresh install/container); a plain -Sy
        // on a used system would risk a partial upgrade.
        script = `{ [ -e /var/lib/pacman/sync/core.db ] || pacman -Sy --noconfirm; } && ${command}`
      }
      const elevation = await elevate(script)
      if (elevation.kind === 'manual') {
        failures.push(`installing ${item.name} needs administrator rights and no password prompt is available. Run this in a terminal:\n${elevation.command}`)
        continue
      }
      command = elevation.command
      viaPkexec = elevation.viaPkexec
    } else if (process.platform !== 'win32' && /\|/.test(command) && findOnPath('bash')) {
      // `curl … | sh` must fail when curl fails, not report the empty script's exit 0.
      command = `bash -o pipefail -c ${shQuote(command)}`
    }

    const res = await run(command)
    output = `${output}$ ${attempt.command}\n${res.stdout}${res.stderr}`.slice(-MAX_OUTPUT)

    if (res.code === 0 && attempt.system && pm === 'apt') aptUpdated = true

    for (const dir of userBinDirs(item.id)) await addDirectoryToPath(dir)
    ensureUserPathsInEnv()

    // Some commands exit non-zero although the tool is now there (winget: "already installed").
    if (res.code === 0 || findOnPath(item.binary)) break

    if (res.timedOut) failures.push(`\`${attempt.command}\` timed out after ${INSTALL_TIMEOUT_MS / 60000} minutes`)
    else if (viaPkexec && (res.code === 126 || res.code === 127)) {
      failures.push(`the administrator password prompt was cancelled or no polkit agent is running`)
      break
    } else failures.push(`\`${attempt.command}\` failed (exit ${res.code}): ${tail(res.stderr || res.stdout) || 'no output'}`)
  }

  if (!findOnPath(item.binary)) {
    if (failures.length) {
      return { success: false, binary: item.binary, message: `Could not install ${item.name}: ${failures.join('; then ')}.${manualHint}`, output }
    }
  }

  const restartHint = process.platform === 'win32'
    ? 'Restart LazyStack or open a new terminal so the new PATH is picked up.'
    : "Open a new terminal or run 'source ~/.bashrc'."
  const res = await run(`${item.binary} ${item.versionFlag}`, item.timeoutMs ?? 30000)
  const firstLine = (res.stdout || res.stderr || '').trim().split('\n')[0]
  if (res.code === 0 || (res.timedOut && findOnPath(item.binary))) {
    return {
      success: true,
      binary: item.binary,
      addedToPath: userBinDirs(item.id).some(d => fs.existsSync(d)),
      message: `Successfully installed ${item.name}${res.code === 0 && firstLine ? ` (${firstLine})` : ''} and verified in PATH!`,
      output
    }
  }
  if (findOnPath(item.binary)) {
    return {
      success: false,
      binary: item.binary,
      message: `${item.name} was installed, but \`${item.binary} ${item.versionFlag}\` failed: ${tail(res.stderr || res.stdout, 3) || `exit ${res.code}`}`,
      output
    }
  }
  return {
    success: false,
    binary: item.binary,
    message: `Installation command completed, but ${item.binary} was not found in PATH yet. ${restartHint}`,
    output
  }
}

/** Pure helpers exported for unit tests (scripts/unit-tests.ts). */
export const __test__ = { wingetCommand, shQuote, isSystemCommand, plannedAttempts, userBinDirs }
