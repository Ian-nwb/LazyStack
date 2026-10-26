import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import fs from 'fs-extra'
import detectPort from 'detect-port'
import { scaffoldProject } from './scaffolding/generator'
import { auditEnvironment } from './environment/auditor'
import { installBinary, addDirectoryToPath } from './environment/installer'
import { ProjectSettings } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null = null
const preload = path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  win = new BrowserWindow({
    title: 'LazyStack — Monorepo Architecture Studio',
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0c0d12',
    frame: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (url) {
    win.loadURL(url)
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // IPC Handlers
  ipcMain.handle('get-default-path', async () => {
    return ''
  })

  ipcMain.handle('select-directory', async (event, defaultPath) => {
    try {
      // Find the window that made this request, or the active main window
      const callerWin = BrowserWindow.fromWebContents(event.sender) || (win && !win.isDestroyed() ? win : null)

      let resolvedDefault = os.homedir()
      if (defaultPath && typeof defaultPath === 'string' && defaultPath.trim()) {
        try {
          const normalized = path.normalize(defaultPath.trim())
          if (fs.existsSync(normalized)) {
            resolvedDefault = normalized
          } else {
            // Find closest existing ancestor directory
            let ancestor = path.dirname(normalized)
            let prev = ''
            while (ancestor && ancestor !== prev && !fs.existsSync(ancestor)) {
              prev = ancestor
              ancestor = path.dirname(ancestor)
            }
            if (ancestor && fs.existsSync(ancestor)) {
              resolvedDefault = ancestor
            }
          }
        } catch {
          resolvedDefault = os.homedir()
        }
      }

      const dialogProperties: Array<'openDirectory' | 'createDirectory' | 'promptToCreate' | 'dontAddToRecent'> =
        process.platform === 'darwin'
          ? ['openDirectory', 'createDirectory']
          : ['openDirectory', 'promptToCreate', 'dontAddToRecent']

      const dialogOptions: Electron.OpenDialogOptions = {
        title: 'Select Monorepo Parent Directory',
        defaultPath: resolvedDefault,
        properties: dialogProperties
      }

      // Safe invocation: never pass undefined as first arg on Windows
      const result = callerWin
        ? await dialog.showOpenDialog(callerWin, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null
      }
      return path.normalize(result.filePaths[0])
    } catch (err) {
      console.error('Error in select-directory:', err)
      return null
    }
  })

  ipcMain.handle('check-directory', async (_event, targetPath: string) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') {
        return { exists: false, empty: true, writable: false, error: 'Target path is empty' }
      }
      const normalized = path.normalize(targetPath.trim())
      const exists = await fs.pathExists(normalized)

      if (!exists) {
        // Test writability of the closest existing ancestor
        let ancestor = path.dirname(normalized)
        let prev = ''
        while (ancestor && ancestor !== prev && !(await fs.pathExists(ancestor))) {
          prev = ancestor
          ancestor = path.dirname(ancestor)
        }

        let writable = true
        let error: string | undefined = undefined

        if (ancestor && (await fs.pathExists(ancestor))) {
          try {
            const testFile = path.join(ancestor, `.lazystack_test_${Date.now()}`)
            await fs.writeFile(testFile, 'test')
            await fs.remove(testFile)
          } catch (writeErr: any) {
            writable = false
            error = writeErr.code === 'EACCES' || writeErr.code === 'EPERM'
              ? 'Permission denied: directory is read-only or requires administrator privileges'
              : writeErr.message
          }
        } else {
          writable = false
          error = 'Drive or root path does not exist'
        }

        return { exists: false, empty: true, writable, error }
      }

      const files = await fs.readdir(normalized)
      let writable = true
      let error: string | undefined = undefined
      try {
        const testFile = path.join(normalized, `.lazystack_test_${Date.now()}`)
        await fs.writeFile(testFile, 'test')
        await fs.remove(testFile)
      } catch (writeErr: any) {
        writable = false
        error = writeErr.code === 'EACCES' || writeErr.code === 'EPERM'
          ? 'Permission denied: directory is read-only or requires administrator privileges'
          : writeErr.message
      }

      return {
        exists: true,
        empty: files.length === 0,
        fileCount: files.length,
        writable,
        error
      }
    } catch (err: any) {
      return { exists: false, empty: false, writable: false, error: err.message }
    }
  })

  ipcMain.handle('check-port-available', async (_event, port: number) => {
    try {
      const availablePort = await detectPort(port)
      return {
        port,
        available: availablePort === port,
        suggested: availablePort
      }
    } catch (err: any) {
      return { port, available: false, error: err.message }
    }
  })

  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      homedir: os.homedir(),
      cpus: os.cpus().length,
      freeMemoryGB: Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10,
      totalMemoryGB: Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
    }
  })

  // Scaffolding IPC
  ipcMain.handle('scaffold-project', async (_event, settings: ProjectSettings) => {
    return await scaffoldProject(settings)
  })

  // Post-generation Actions
  ipcMain.handle('open-folder', async (_event, targetPath: string) => {
    await shell.openPath(targetPath)
  })

  ipcMain.handle('open-vscode', async (_event, targetPath: string) => {
    exec(`code "${targetPath}"`, (err) => {
      if (err) {
        console.error('Failed to open VS Code:', err)
      }
    })
  })

  ipcMain.handle('open-terminal', async (_event, targetPath: string) => {
    try {
      if (process.platform === 'win32') {
        exec(`start cmd.exe /K "cd /d "${targetPath}""`)
      } else if (process.platform === 'darwin') {
        exec(`open -a Terminal "${targetPath}"`)
      } else {
        exec(`x-terminal-emulator --working-directory="${targetPath}" || gnome-terminal --working-directory="${targetPath}" || konsole --workdir "${targetPath}" || xterm -e "cd '${targetPath}' && bash"`)
      }
      return { success: true }
    } catch (err: any) {
      console.error('Failed to open terminal:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('install-dependencies', async (_event, targetPath: string) => {
    return new Promise((resolve) => {
      exec('npm install', { cwd: targetPath }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, output: stderr })
        } else {
          resolve({ success: true, output: stdout })
        }
      })
    })
  })

  ipcMain.handle('start-stack', async (_event, targetPath: string) => {
    return new Promise((resolve) => {
      exec('docker compose --env-file .env -f infra/docker-compose.yml up -d', { cwd: targetPath }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, output: stderr })
        } else {
          resolve({ success: true, output: stdout })
        }
      })
    })
  })

  ipcMain.handle('stop-stack', async (_event, targetPath: string) => {
    return new Promise((resolve) => {
      exec('docker compose --env-file .env -f infra/docker-compose.yml down', { cwd: targetPath }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, output: stderr })
        } else {
          resolve({ success: true, output: stdout })
        }
      })
    })
  })

  // Environment & Installer IPC
  ipcMain.handle('audit-environment', async () => {
    return await auditEnvironment()
  })

  ipcMain.handle('install-binary', async (_event, binaryId: string) => {
    return await installBinary(binaryId)
  })

  ipcMain.handle('add-to-path', async (_event, dirPath: string) => {
    return await addDirectoryToPath(dirPath)
  })

  createWindow()
})
