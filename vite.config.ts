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
