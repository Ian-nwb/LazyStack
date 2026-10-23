import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { MONITORED_BINARIES, ensureUserPathsInEnv } from './auditor'

const execAsync = promisify(exec)

export interface InstallResult {
  success: boolean
  binary: string
  message: string
  addedToPath?: boolean
  output?: string
}

async function detectPackageManager(): Promise<'apt' | 'pacman' | 'dnf' | 'brew' | 'winget' | 'unknown'> {
  const platform = os.platform()
  if (platform === 'darwin') return 'brew'
  if (platform === 'win32') return 'winget'

  // Linux detection
  try {
    await execAsync('which apt-get')
    return 'apt'
  } catch {}

  try {
    await execAsync('which pacman')
    return 'pacman'
  } catch {}

  try {
    await execAsync('which dnf')
    return 'dnf'
  } catch {}

  return 'unknown'
}

/**
 * Permanently adds a directory to user's shell PATH config and updates running process.env.PATH
 */
export async function addDirectoryToPath(dirPath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(dirPath)) return false

    // 1. Update running process PATH immediately
    const currentPath = process.env.PATH || ''
    const parts = currentPath.split(path.delimiter)
    if (!parts.includes(dirPath)) {
      process.env.PATH = `${dirPath}${path.delimiter}${currentPath}`
    }

    const platform = os.platform()
    const home = os.homedir()

    if (platform === 'win32') {
      try {
        await execAsync(`setx PATH "%PATH%;${dirPath}"`)
        return true
      } catch {
        return false
      }
    } else {
      // Linux & macOS: Append to ~/.bashrc and ~/.zshrc if not already present
      const exportLine = `\nexport PATH="$PATH:${dirPath}" # Added by LazyStack\n`
      const shellConfigs = [
        path.join(home, '.bashrc'),
        path.join(home, '.zshrc'),
        path.join(home, '.profile')
      ]

      let modified = false
      for (const cfg of shellConfigs) {
        if (fs.existsSync(cfg)) {
          const content = fs.readFileSync(cfg, 'utf8')
          if (!content.includes(dirPath)) {
            fs.appendFileSync(cfg, exportLine, 'utf8')
            modified = true
          }
        }
      }
      return modified
    }
  } catch (err) {
    console.error('Error adding directory to PATH:', err)
    return false
  }
}

export async function installBinary(binaryOrId: string): Promise<InstallResult> {
  ensureUserPathsInEnv()

  // Match by id or by binary command name
  const item = MONITORED_BINARIES.find(b => b.id === binaryOrId || b.binary === binaryOrId)
  if (!item || !item.installCommand) {
    return {
      success: false,
      binary: binaryOrId,
      message: `No automated installation recipe defined for ${binaryOrId}`
    }
  }

  const pm = await detectPackageManager()
  let commandToRun = ''

  switch (pm) {
    case 'apt':
      commandToRun = item.installCommand.linuxApt ? `sudo ${item.installCommand.linuxApt}` : ''
      break
    case 'pacman':
      commandToRun = item.installCommand.linuxPacman ? `sudo ${item.installCommand.linuxPacman}` : ''
      break
    case 'dnf':
      commandToRun = item.installCommand.linuxDnf ? `sudo ${item.installCommand.linuxDnf}` : ''
      break
    case 'brew':
      // Homebrew MUST NOT run as root
      commandToRun = item.installCommand.macosBrew || ''
      break
    case 'winget':
      commandToRun = item.installCommand.windowsWinget || ''
      break
  }

  // Fallback for standalone scripts (curl | bash, rustup, bun, deno)
  if (!commandToRun && item.installCommand.linuxApt && item.installCommand.linuxApt.startsWith('curl')) {
    commandToRun = item.installCommand.linuxApt
  }

  if (!commandToRun) {
    return {
      success: false,
      binary: item.binary,
      message: `Could not find an install command for your system package manager (${pm}).`
    }
  }

  try {
    const { stdout, stderr } = await execAsync(commandToRun, { 
      timeout: 180000,
      env: process.env
    })

    // Auto-detect and configure custom install directories into PATH
    const home = os.homedir()
    let addedPath = false

    if (item.id === 'bun') {
      addedPath = await addDirectoryToPath(path.join(home, '.bun', 'bin'))
    } else if (item.id === 'cargo') {
      addedPath = await addDirectoryToPath(path.join(home, '.cargo', 'bin'))
    } else if (item.id === 'deno') {
      addedPath = await addDirectoryToPath(path.join(home, '.deno', 'bin'))
    } else if (item.id === 'composer') {
      await addDirectoryToPath(path.join(home, '.config', 'composer', 'vendor', 'bin'))
    }

    ensureUserPathsInEnv()

    // Verify installation succeeded
    try {
      const checkRes = await execAsync(`${item.binary} ${item.versionFlag}`, { env: process.env })
      const versionText = (checkRes.stdout || checkRes.stderr || '').trim().split('\n')[0]
      return {
        success: true,
        binary: item.binary,
        addedToPath: addedPath,
        message: `Successfully installed ${item.name} (${versionText}) and verified in PATH!`,
        output: stdout || stderr
      }
    } catch {
      return {
        success: false,
        binary: item.binary,
        message: `Installation command completed, but ${item.binary} was not found in PATH yet. Run 'source ~/.bashrc' or restart your terminal.`,
        output: stdout || stderr
      }
    }
  } catch (error: any) {
    return {
      success: false,
      binary: item.binary,
      message: `Installation failed: ${error.message}`,
      output: error.stderr || error.stdout
    }
  }
}
