import React, { useState, useRef } from 'react'
import { FolderTree, Code, Network, FileText, Download, Upload, Sliders, Layers, Database } from 'lucide-react'
import { ProjectSettings, SelectedDatabase, FolderStructureConfig } from '../types'
import { DATABASE_CATALOG } from '../data/databases'
import { resolveStructurePaths } from '../data/structurePresets'
import { StructureCustomizer } from './StructureCustomizer'
import { resolveServiceConnectionUrl } from '../utils/serviceConnections'

interface BlueprintInspectorProps {
  settings: ProjectSettings
  onImportBlueprint?: (imported: Partial<ProjectSettings>) => void
  onUpdateStructure?: (config: FolderStructureConfig) => void
}

export const BlueprintInspector: React.FC<BlueprintInspectorProps> = ({
  settings,
  onImportBlueprint,
  onUpdateStructure
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'tree' | 'compose' | 'ports' | 'env'>('structure')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const projectName = settings.projectName || 'my-monorepo'
  const activeDatabases = settings.databases.filter(d => d.enabled)
  const paths = resolveStructurePaths(settings)

  // Export lazystack.json
  const handleExportBlueprint = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `${projectName || 'lazystack'}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Import lazystack.json
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json && onImportBlueprint) {
          onImportBlueprint(json)
        }
      } catch (err) {
        alert('Invalid lazystack.json file format.')
      }
    }
    reader.readAsText(file)
  }

  const getDbServiceName = (db: SelectedDatabase, idx: number) => {
    if (db.customName) {
      const slug = db.customName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
      if (slug) return slug
    }
    const assignedApp = settings.apps.find(a => a.id === db.assignedAppId)
    if (assignedApp) {
      return `${assignedApp.folderName}_${db.type}`
    }
    return `${db.type}_${db.port || idx + 1}`
  }

  // Generate dynamic Docker Compose preview
  const generateComposePreview = () => {
    let yaml = `version: '3.8'\n\nnetworks:\n  lazystack_net:\n    driver: bridge\n\nvolumes:\n`

    // Volumes
    activeDatabases.forEach((d, idx) => {
      const def = DATABASE_CATALOG.find(c => c.id === d.type)
      if (def?.isCloud && d.type !== 'pocketbase') return
      if (d.type !== 'sqlite') {
        const sName = getDbServiceName(d, idx)
        yaml += `  ${sName}_data:\n`
      }
    })

    yaml += `\nservices:\n`

    // Database services
    activeDatabases.forEach((d, idx) => {
      const def = DATABASE_CATALOG.find(c => c.id === d.type)
      const sName = getDbServiceName(d, idx)

      if (def?.isCloud && d.type !== 'pocketbase') {
        yaml += `  # ${d.customName || def?.name || d.type}: Managed Cloud Service (no local container needed)\n`
      } else if (d.type === 'sqlite') {
        yaml += `  # ${sName} (SQLite): Local/Shared file storage\n`
      } else if (d.type === 'pocketbase') {
        yaml += `  ${sName}:\n`
        yaml += `    image: ghcr.io/muchobien/pocketbase:latest\n`
        yaml += `    restart: unless-stopped\n`
        yaml += `    ports:\n      - "${d.port}:8090"\n`
        yaml += `    networks:\n      - lazystack_net\n`
        yaml += `    volumes:\n      - ${sName}_data:/pb_data\n\n`
      } else {
        yaml += `  ${sName}:\n`
        yaml += `    image: ${def?.imageTag}\n`
        yaml += `    restart: unless-stopped\n`
        yaml += `    ports:\n      - "${d.port}:${def?.defaultPort}"\n`
        yaml += `    networks:\n      - lazystack_net\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/${d.type}/data\n\n`
      }
    })

    // Microservice Applications
    const dockerApps = settings.apps.filter(a => a.runMode === 'docker')
    dockerApps.forEach(a => {
      const appRelPath = paths.getAppRelativePath(a.folderName, a.id, a.role)
      yaml += `  ${a.folderName}:\n`
      yaml += `    build:\n      context: ../${appRelPath}\n      dockerfile: Dockerfile\n`
      yaml += `    restart: unless-stopped\n`
      if (a.port > 0) {
        yaml += `    ports:\n      - "${a.port}:${a.port}"\n`
      }
      yaml += `    env_file:\n      - ../${appRelPath}/.env\n`
      if ((a.connections || []).some(connection => settings.apps.find(target => target.id === connection.targetAppId)?.runMode === 'host')) {
        yaml += `    extra_hosts:\n      - "host.docker.internal:host-gateway"\n`
      }

      // Microservice DB dependencies
      const relevantDbs = activeDatabases.filter(d => {
        const def = DATABASE_CATALOG.find(c => c.id === d.type)
        if (d.type === 'sqlite' || (def?.isCloud && d.type !== 'pocketbase')) return false
        if (paths.databaseIsolation === 'service-isolated') {
          return d.assignedAppId === a.id || d.assignedAppId === 'global' || !d.assignedAppId
        }
        return true
      })

      const dependencies = new Map<string, 'service_healthy' | 'service_started'>()
      relevantDbs.forEach(d => dependencies.set(getDbServiceName(d, settings.databases.indexOf(d)), 'service_healthy'))
      ;(a.connections || []).forEach(connection => {
        const target = settings.apps.find(app => app.id === connection.targetAppId)
        if (target?.runMode === 'docker') dependencies.set(target.folderName, target.healthCheck?.enabled ? 'service_healthy' : 'service_started')
      })
      if (dependencies.size > 0) {
        yaml += `    depends_on:\n`
        dependencies.forEach((condition, serviceName) => {
          yaml += `      ${serviceName}:\n        condition: ${condition}\n`
        })
      }
      if (a.healthCheck?.enabled) {
        const health = a.healthCheck
        const command = health.type === 'http'
          ? `wget --no-verbose --tries=1 --spider http://127.0.0.1:${a.port}${health.path || '/health'}`
          : (health.command || '').replaceAll('${PORT}', String(a.port))
        yaml += `    healthcheck:\n      test: ["CMD-SHELL", ${JSON.stringify(command)}]\n      interval: ${health.intervalSeconds}s\n      timeout: ${health.timeoutSeconds}s\n      retries: ${health.retries}\n      start_period: ${health.startPeriodSeconds}s\n`
      }
      yaml += `    networks:\n      - lazystack_net\n\n`
    })

    if (settings.proxy.type !== 'none') {
      yaml += `  gateway:\n`
      yaml += `    image: ${settings.proxy.type === 'nginx' ? 'nginx:alpine' : 'httpd:alpine'}\n`
      yaml += `    ports:\n      - "${settings.proxy.httpPort}:${settings.proxy.httpPort}"\n`
      yaml += `    volumes:\n      - ./${settings.proxy.type}:/etc/${settings.proxy.type}/conf.d:ro\n`
      yaml += `    networks:\n      - lazystack_net\n`
    }

    return yaml
  }

  const generateEnvPreview = () => {
    let env = `# Root Environment Configuration for LazyStack\nPROJECT_NAME=${projectName}\nNODE_ENV=development\nARCHITECTURE_LAYOUT=${settings.structureConfig?.preset || 'monorepo'}\n\n`
    env += `# Application Ports\n`
    settings.apps.forEach(a => {
      const varName = `${a.folderName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PORT`
      env += `${varName}=${a.port}\n`
      ;(a.connections || []).forEach(connection => {
        const target = settings.apps.find(app => app.id === connection.targetAppId)
        if (!target) return
        env += `${connection.envVar}=${resolveServiceConnectionUrl(a, target, settings.proxy, connection) || '<configure-url>'}\n`
      })
    })

    const selfHostedDbs = activeDatabases.filter(d => {
      const def = DATABASE_CATALOG.find(c => c.id === d.type)
      return !def?.isCloud
    })
    const cloudDbs = activeDatabases.filter(d => {
      const def = DATABASE_CATALOG.find(c => c.id === d.type)
      return def?.isCloud
    })

    if (selfHostedDbs.length > 0) {
      env += `\n# Self-Hosted Database Instances\n`
      selfHostedDbs.forEach((d, idx) => {
        const sName = getDbServiceName(d, idx).toUpperCase()
        const assignedApp = settings.apps.find(a => a.id === d.assignedAppId)
        const scopeNote = assignedApp ? `[Scoped to ${assignedApp.folderName}]` : '[Global Infrastructure]'

        env += `# ${d.customName || d.type.toUpperCase()} ${scopeNote}\n`
        env += `${sName}_PORT=${d.port}\n`
        env += `${sName}_USER=lazystack_user\n`
        env += `${sName}_PASSWORD=secret_${Math.random().toString(36).substring(2, 8)}\n`
        env += `${sName}_DB=${d.databaseName || `${d.type}_db`}\n`
        env += `${sName}_URL=${d.type}://lazystack_user:secret@${getDbServiceName(d, idx)}:${d.port}/${d.databaseName || `${d.type}_db`}\n\n`
      })
    }

    if (cloudDbs.length > 0) {
      env += `\n# Cloud / BaaS Provider Configurations\n`
      cloudDbs.forEach(d => {
        const def = DATABASE_CATALOG.find(c => c.id === d.type)
        if (def) {
          env += `# ${d.customName || def.name}\n`
          def.envVars?.forEach(v => {
            env += `${v}=your_${v.toLowerCase()}_here\n`
          })
          env += `\n`
        }
      })
    }
    return env
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
      {/* Tab Selector */}
      <div className="px-6 py-3 border-b border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-surface-950 p-1 rounded-lg border border-surface-700 text-xs">
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'structure' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Architecture & Folders
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tree' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" /> Directory Contract
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'compose' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> docker-compose.yml
          </button>
          <button
            onClick={() => setActiveTab('ports')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ports' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" /> Ports & Services Map
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'env' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> .env Blueprint
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg border border-surface-700 bg-surface-950 hover:bg-surface-850 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            title="Import configuration from lazystack.json"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExportBlueprint}
            className="px-2.5 py-1.5 rounded-lg border border-surface-700 bg-surface-950 hover:bg-surface-850 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            title="Save configuration as lazystack.json"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export</span>
          </button>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            Contract Root: <span className="text-white font-bold">{projectName}/</span>
          </span>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-auto p-6 font-mono text-xs">
        {activeTab === 'structure' && (
          <StructureCustomizer
            settings={settings}
            onUpdateStructure={(cfg) => {
              if (onUpdateStructure) onUpdateStructure(cfg)
            }}
          />
        )}

        {activeTab === 'tree' && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 text-zinc-300 leading-relaxed max-w-3xl">
            <div className="text-white font-bold mb-2">📁 {projectName}/</div>
            <div className="pl-4 border-l border-surface-700 space-y-1">
              <div>├── 📁 .github/workflows/ <span className="text-zinc-500 font-sans text-[11px]">(CI/CD workflows)</span></div>
              <div>├── 📁 .vscode/ <span className="text-zinc-500 font-sans text-[11px]">(recommended extensions)</span></div>

              {/* Role-aware app directory roots */}
              {settings.apps.length === 0 ? (
                <div>├── 📁 {paths.appsDir}/ <span className="text-zinc-500 font-sans text-[11px]">(applications)</span></div>
              ) : [...new Set(settings.apps.map(app => paths.getAppRelativePath(app.folderName, app.id, app.role).split('/').slice(0, -1).join('/') || paths.appsDir))].map(root => (
                <React.Fragment key={root}>
                  <div>├── 📁 {root}/</div>
                  <div className="pl-4 border-l border-surface-700 space-y-1.5">
                    {settings.apps.filter(app => (paths.getAppRelativePath(app.folderName, app.id, app.role).split('/').slice(0, -1).join('/') || paths.appsDir) === root).map(a => {
                      const assignedDbs = activeDatabases.filter(d => d.assignedAppId === a.id)
                      return (
                        <div key={a.id} className="text-zinc-100">
                          <div>├── 📁 {a.folderName}/ <span className="text-zinc-500 font-sans text-[11px] ml-2">({a.role} · {a.techId} {a.flavor ? `[${a.flavor}]` : ''} · port {a.port} · {a.runMode})</span></div>
                          <div className="pl-4 border-l border-surface-750 text-zinc-400 space-y-0.5">
                            <div>├── 📁 src/</div>
                            {assignedDbs.length > 0 && paths.databaseIsolation === 'service-isolated' && <div className="text-emerald-400">├── 📁 db/ <span className="text-zinc-500 font-sans text-[11px]">(schema, migrations for {assignedDbs.map(d => d.customName || d.type).join(', ')})</span></div>}
                            <div>├── 📄 Dockerfile</div>
                            <div>└── 📄 .env <span className="text-zinc-500 font-sans text-[11px]">(service config and connections)</span></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </React.Fragment>
              ))}

              {/* Shared Packages / Core */}
              <div>├── 📁 {paths.packagesDir}/ <span className="text-zinc-500 font-sans text-[11px]">(shared packages & contracts)</span></div>
              <div className="pl-4 border-l border-surface-700 space-y-1">
                <div>├── 📁 types/ <span className="text-zinc-500 font-sans text-[11px]">(shared TypeScript DTOs)</span></div>
                <div>├── 📁 shared/ <span className="text-zinc-500 font-sans text-[11px]">(shared utils)</span></div>
                {activeDatabases.some(d => {
                  const def = DATABASE_CATALOG.find(c => c.id === d.type)
                  return def?.isCloud
                }) && (
                  <div>
                    <div>├── 📁 cloud/ <span className="text-zinc-500 font-sans text-[11px]">(SDK clients for Cloud / BaaS)</span></div>
                    <div className="pl-4 border-l border-surface-750 space-y-0.5">
                      {activeDatabases.filter(d => {
                        const def = DATABASE_CATALOG.find(c => c.id === d.type)
                        return def?.isCloud
                      }).map(d => (
                        <div key={d.id || d.type} className="text-zinc-400">
                          ├── 📄 {d.type}.ts
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Infra / Deploy */}
              <div>├── 📁 {paths.infraDir}/ <span className="text-zinc-500 font-sans text-[11px]">(orchestration & proxies)</span></div>
              <div className="pl-4 border-l border-surface-700 space-y-1">
                {settings.proxy.type !== 'none' && (
                  <div>├── 📁 {settings.proxy.type}/ <span className="text-zinc-500 font-sans text-[11px]">(reverse proxy gateway configs)</span></div>
                )}
                {activeDatabases.some(d => d.type === 'sqlite') && (
                  <div>├── 📁 sqlite/ <span className="text-zinc-500 font-sans text-[11px]">(shared database volume)</span></div>
                )}
                <div>├── 📄 docker-compose.yml</div>
                <div>└── 📄 docker-compose.dev.yml</div>
              </div>

              <div>├── 📁 {paths.docsDir}/ <span className="text-zinc-500 font-sans text-[11px]">(architecture & port diagrams)</span></div>
              <div>├── 📁 {paths.scriptsDir}/ <span className="text-zinc-500 font-sans text-[11px]">(dev.sh, dev.ps1)</span></div>
              {settings.structureConfig?.customFolders?.map(folder => (
                <div key={folder}>├── 📁 {folder}/ <span className="text-zinc-500 font-sans text-[11px]">(custom root folder)</span></div>
              ))}
              <div>├── 📁 tests/ <span className="text-zinc-500 font-sans text-[11px]">(integration test harness)</span></div>
              <div>├── 📄 .env</div>
              <div>├── 📄 .gitignore</div>
              <div>└── 📄 README.md</div>
            </div>
          </div>
        )}

        {activeTab === 'compose' && (
          <pre className="bg-surface-900 border border-surface-700 rounded-xl p-5 text-zinc-200 overflow-x-auto selection:bg-zinc-700 selection:text-white">
            {generateComposePreview()}
          </pre>
        )}

        {activeTab === 'ports' && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-950 text-zinc-400 text-[11px] uppercase">
                  <th className="p-3">Entity</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Scope / Assigned To</th>
                  <th className="p-3">Host Port</th>
                  <th className="p-3">Container Port</th>
                  <th className="p-3">Run Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700 text-zinc-300">
                {settings.apps.map(a => (
                  <tr key={a.id} className="hover:bg-surface-850">
                    <td className="p-3 font-semibold text-white">{paths.getAppRelativePath(a.folderName, a.id, a.role)}</td>
                    <td className="p-3 text-zinc-400 capitalize">{a.role}</td>
                    <td className="p-3 text-zinc-400 font-sans text-xs">Self (Microservice)</td>
                    <td className="p-3 font-bold text-white font-mono">:{a.port}</td>
                    <td className="p-3 font-mono">:{a.port}</td>
                    <td className="p-3 capitalize">{a.runMode}</td>
                  </tr>
                ))}
                {activeDatabases.map((d, idx) => {
                  const def = DATABASE_CATALOG.find(c => c.id === d.type)
                  const isCloud = def?.isCloud && d.type !== 'pocketbase'
                  const assignedApp = settings.apps.find(a => a.id === d.assignedAppId)
                  const scopeLabel = assignedApp ? `📦 apps/${assignedApp.folderName}` : '🌐 Global Infra'

                  return (
                    <tr key={d.id || `${d.type}-${idx}`} className="hover:bg-surface-850">
                      <td className="p-3 font-semibold text-white flex items-center gap-2">
                        {d.customName || def?.name || d.type}
                        {def?.isCloud && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Cloud
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-400 capitalize">{def?.category || 'Database'}</td>
                      <td className="p-3 font-sans text-xs text-emerald-400 font-medium">
                        {scopeLabel}
                      </td>
                      <td className="p-3 font-bold text-white font-mono">
                        {isCloud ? <span className="text-zinc-500 font-sans text-xs">Cloud Hosted</span> : `:${d.port}`}
                      </td>
                      <td className="p-3 font-mono">
                        {isCloud ? <span className="text-zinc-500 font-sans text-xs">HTTPS / API</span> : `:${d.port}`}
                      </td>
                      <td className="p-3 text-xs">
                        {isCloud ? (
                          <span className="text-emerald-400">Managed Provider</span>
                        ) : d.type === 'pocketbase' ? (
                          <span className="text-amber-400">Docker Container (Self-hosted)</span>
                        ) : (
                          'Docker Container'
                        )}
                      </td>
                    </tr>
                  )
                })}
                {settings.proxy.type !== 'none' && (
                  <tr className="hover:bg-surface-850">
                    <td className="p-3 font-semibold text-white">Gateway ({settings.proxy.type})</td>
                    <td className="p-3 text-zinc-400">Reverse Proxy</td>
                    <td className="p-3 text-zinc-400 font-sans text-xs">Global Gateway</td>
                    <td className="p-3 font-bold text-white font-mono">:{settings.proxy.httpPort}</td>
                    <td className="p-3 font-mono">:{settings.proxy.httpPort}</td>
                    <td className="p-3">Docker Container</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'env' && (
          <pre className="bg-surface-900 border border-surface-700 rounded-xl p-5 text-zinc-300 overflow-x-auto">
            {generateEnvPreview()}
          </pre>
        )}
      </div>
    </div>
  )
}
