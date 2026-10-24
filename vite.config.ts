import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'fs-extra', 'detect-port']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
    ]),
    renderer(),
    {
      name: 'lazystack-host-api',
      configureServer(server) {
        server.middlewares.use('/api/get-default-path', async (_req, res) => {
          try {
            const os = await import('os')
            const path = await import('path')
            const defaultParent = path.normalize(path.join(os.homedir(), 'Projects'))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ defaultPath: defaultParent }))
          } catch (err: any) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })

        server.middlewares.use('/api/check-directory', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { targetPath } = JSON.parse(body || '{}')
              const fs = await import('fs-extra')
              const path = await import('path')
              if (!targetPath) {
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({ exists: false, empty: true, writable: false, error: 'Path is empty' }))
              }
              const normalized = path.normalize(targetPath)
              const exists = await fs.pathExists(normalized)
              if (!exists) {
                let ancestor = path.dirname(normalized)
                let prev = ''
                while (ancestor && ancestor !== prev && !(await fs.pathExists(ancestor))) {
                  prev = ancestor
                  ancestor = path.dirname(ancestor)
                }
                let writable = true
                let error: string | undefined
                if (ancestor && (await fs.pathExists(ancestor))) {
                  try {
                    const testFile = path.join(ancestor, `.lazystack_test_${Date.now()}`)
                    await fs.writeFile(testFile, 'test')
                    await fs.remove(testFile)
                  } catch (wErr: any) {
                    writable = false
                    error = wErr.message
                  }
                } else {
                  writable = false
                  error = 'Root or drive does not exist'
                }
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({ exists: false, empty: true, writable, error }))
              }
              const files = await fs.readdir(normalized)
              let writable = true
              let error: string | undefined
              try {
                const testFile = path.join(normalized, `.lazystack_test_${Date.now()}`)
                await fs.writeFile(testFile, 'test')
                await fs.remove(testFile)
              } catch (wErr: any) {
                writable = false
                error = wErr.message
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ exists: true, empty: files.length === 0, fileCount: files.length, writable, error }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })

        server.middlewares.use('/api/audit', async (_req, res) => {
          try {
            const { auditEnvironment } = await import('./electron/environment/auditor')
            const results = await auditEnvironment()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(results))
          } catch (err: any) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })

        server.middlewares.use('/api/install', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { binaryId } = JSON.parse(body || '{}')
              const { installBinary } = await import('./electron/environment/installer')
              const result = await installBinary(binaryId)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })

        server.middlewares.use('/api/scaffold', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const settings = JSON.parse(body || '{}')
              const { scaffoldProject } = await import('./electron/scaffolding/generator')
              const result = await scaffoldProject(settings)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        })

        server.middlewares.use('/api/open-folder', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { targetPath } = JSON.parse(body || '{}')
              const { exec } = await import('child_process')
              const opener = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open'
              exec(`${opener} "${targetPath}"`)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })

        server.middlewares.use('/api/open-vscode', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { targetPath } = JSON.parse(body || '{}')
              const { exec } = await import('child_process')
              exec(`code "${targetPath}"`)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        })

        server.middlewares.use('/api/start-stack', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { targetPath } = JSON.parse(body || '{}')
              const { exec } = await import('child_process')
              exec('docker compose --env-file .env -f infra/docker-compose.yml up -d', { cwd: targetPath }, (error, stdout, stderr) => {
                res.setHeader('Content-Type', 'application/json')
                if (error) {
                  res.end(JSON.stringify({ success: false, error: error.message, output: stderr }))
                } else {
                  res.end(JSON.stringify({ success: true, output: stdout }))
                }
              })
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        })

        server.middlewares.use('/api/stop-stack', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { targetPath } = JSON.parse(body || '{}')
              const { exec } = await import('child_process')
              exec('docker compose --env-file .env -f infra/docker-compose.yml down', { cwd: targetPath }, (error, stdout, stderr) => {
                res.setHeader('Content-Type', 'application/json')
                if (error) {
                  res.end(JSON.stringify({ success: false, error: error.message, output: stderr }))
                } else {
                  res.end(JSON.stringify({ success: true, output: stdout }))
                }
              })
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        })
        server.middlewares.use('/api/select-directory', async (req, res) => {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { defaultPath } = JSON.parse(body || '{}')
              const { exec } = await import('child_process')
              const os = await import('os')
              const fs = await import('fs-extra')
              const path = await import('path')

              let startDir = defaultPath || os.homedir()
              try {
                if (!(await fs.pathExists(startDir))) startDir = os.homedir()
              } catch { startDir = os.homedir() }

              let cmd: string
              if (process.platform === 'win32') {
                cmd = `powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.SelectedPath = '${startDir.replace(/'/g, "''")}'; $f.Description = 'Select Parent Directory'; if($f.ShowDialog() -eq 'OK'){Write-Output $f.SelectedPath}"`
              } else if (process.platform === 'darwin') {
                cmd = `osascript -e 'tell application "Finder" to set result to POSIX path of (choose folder with prompt "Select Parent Directory" default location POSIX file "${startDir}")'`
              } else {
                cmd = `zenity --file-selection --directory --title="Select Parent Directory" --filename="${startDir}/" 2>/dev/null || kdialog --getexistingdirectory "${startDir}" 2>/dev/null`
              }

              exec(cmd, { timeout: 120000 }, (error, stdout) => {
                res.setHeader('Content-Type', 'application/json')
                if (error || !stdout?.trim()) {
                  res.end(JSON.stringify({ selected: null }))
                } else {
                  res.end(JSON.stringify({ selected: stdout.trim() }))
                }
              })
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ selected: null, error: err.message }))
            }
          })
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  }
})
