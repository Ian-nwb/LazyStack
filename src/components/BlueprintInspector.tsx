import React, { useState, useRef } from 'react'
import { FolderTree, Code, Network, FileText, Download, Upload } from 'lucide-react'
import { ProjectSettings } from '../types'
import { DATABASE_CATALOG } from '../data/databases'

interface BlueprintInspectorProps {
  settings: ProjectSettings
  onImportBlueprint?: (imported: Partial<ProjectSettings>) => void
}

export const BlueprintInspector: React.FC<BlueprintInspectorProps> = ({ settings, onImportBlueprint }) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'compose' | 'ports' | 'env'>('tree')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const projectName = settings.projectName || 'my-monorepo'
  const activeDatabases = settings.databases.filter(d => d.enabled)

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

  // Generate dynamic Docker Compose preview
  const generateComposePreview = () => {
    let yaml = `version: '3.8'\n\nnetworks:\n  lazystack_net:\n    driver: bridge\n\nvolumes:\n`
    
    activeDatabases.forEach(d => {
      if (d.type !== 'sqlite') {
        yaml += `  ${d.type}_data:\n`
      }
    })

    yaml += `\nservices:\n`

    activeDatabases.forEach(d => {
      const def = DATABASE_CATALOG.find(c => c.id === d.type)
      if (d.type === 'sqlite') {
        yaml += `  # SQLite: Storage in shared volume /infra/sqlite/data.db\n`
      } else {
        yaml += `  ${d.type}:\n`
        yaml += `    image: ${def?.imageTag}\n`
        yaml += `    restart: unless-stopped\n`
        yaml += `    ports:\n      - "${d.port}:${def?.defaultPort}"\n`
        yaml += `    networks:\n      - lazystack_net\n`
        yaml += `    volumes:\n      - ${d.type}_data:/var/lib/${d.type}/data\n\n`
      }
    })

    const dockerApps = settings.apps.filter(a => a.runMode === 'docker')
    dockerApps.forEach(a => {
      yaml += `  ${a.folderName}:\n`
      yaml += `    build:\n      context: ../apps/${a.folderName}\n      dockerfile: Dockerfile\n`
      yaml += `    restart: unless-stopped\n`
      if (a.port > 0) {
        yaml += `    ports:\n      - "${a.port}:${a.port}"\n`
      }
      yaml += `    env_file:\n      - ../.env\n      - ../apps/${a.folderName}/.env\n`
      if (activeDatabases.length > 0) {
        yaml += `    depends_on:\n`
        activeDatabases.filter(d => d.type !== 'sqlite').forEach(d => {
          yaml += `      ${d.type}:\n        condition: service_healthy\n`
        })
      }
      yaml += `    networks:\n      - lazystack_net\n\n`
    })

    if (settings.proxy.type !== 'none') {
      yaml += `  gateway:\n`
      yaml += `    image: ${settings.proxy.type === 'nginx' ? 'nginx:alpine' : 'httpd:alpine'}\n`
      yaml += `    ports:\n      - "${settings.proxy.httpPort}:${settings.proxy.httpPort}"\n`
      yaml += `    volumes:\n      - ./infra/${settings.proxy.type}:/etc/${settings.proxy.type}/conf.d:ro\n`
      yaml += `    networks:\n      - lazystack_net\n`
    }

    return yaml
  }

  const generateEnvPreview = () => {
    let env = `# Root Environment Configuration for LazyStack\nPROJECT_NAME=${projectName}\nNODE_ENV=development\n\n`
    env += `# Application Ports\n`
    settings.apps.forEach(a => {
      const varName = `${a.folderName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PORT`
      env += `${varName}=${a.port}\n`
    })
    env += `\n# Database Configurations\n`
    activeDatabases.forEach(d => {
      env += `${d.type.toUpperCase()}_PORT=${d.port}\n`
      env += `${d.type.toUpperCase()}_USER=lazystack_user\n`
      env += `${d.type.toUpperCase()}_PASSWORD=secret_${Math.random().toString(36).substring(2, 8)}\n`
      env += `${d.type.toUpperCase()}_DB=lazystack_${d.type}\n`
    })
    return env
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
      {/* Tab Selector */}
      <div className="px-6 py-3 border-b border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-surface-950 p-1 rounded-lg border border-surface-700 text-xs">
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
            <Network className="w-3.5 h-3.5" /> Ports Map
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
        {activeTab === 'tree' && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 text-zinc-300 leading-relaxed max-w-2xl">
            <div className="text-white font-bold mb-2">📁 {projectName}/</div>
            <div className="pl-4 border-l border-surface-700 space-y-1">
              <div>├── 📁 .github/workflows/ <span className="text-zinc-500 font-sans text-[11px]">(CI/CD workflows)</span></div>
              <div>├── 📁 .vscode/ <span className="text-zinc-500 font-sans text-[11px]">(recommended extensions)</span></div>
              <div>├── 📁 apps/ <span className="text-zinc-500 font-sans text-[11px]">({settings.apps.length} applications)</span></div>
              <div className="pl-4 border-l border-surface-700 space-y-1">
                {settings.apps.map(a => (
                  <div key={a.id} className="text-zinc-100">
                    ├── 📁 {a.folderName}/
                    <span className="text-zinc-500 font-sans text-[11px] ml-2">
                      ({a.techId} {a.flavor ? `[${a.flavor}]` : ''} • port {a.port} • {a.runMode})
                    </span>
                  </div>
                ))}
              </div>
              <div>├── 📁 docs/ <span className="text-zinc-500 font-sans text-[11px]">(architecture & port diagrams)</span></div>
              <div>├── 📁 infra/ <span className="text-zinc-500 font-sans text-[11px]">(orchestration & proxies)</span></div>
              <div className="pl-4 border-l border-surface-700 space-y-1">
                {settings.proxy.type !== 'none' && (
                  <div>├── 📁 {settings.proxy.type}/ <span className="text-zinc-500 font-sans text-[11px]">(reverse proxy configs)</span></div>
                )}
                {settings.databases.some(d => d.enabled && d.type === 'sqlite') && (
                  <div>├── 📁 sqlite/ <span className="text-zinc-500 font-sans text-[11px]">(shared database volume)</span></div>
                )}
                <div>├── 📄 docker-compose.yml</div>
                <div>└── 📄 docker-compose.dev.yml</div>
              </div>
              <div>├── 📁 scripts/ <span className="text-zinc-500 font-sans text-[11px]">(dev.sh, dev.ps1)</span></div>
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
                  <th className="p-3">Host Port</th>
                  <th className="p-3">Container Port</th>
                  <th className="p-3">Run Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700 text-zinc-300">
                {settings.apps.map(a => (
                  <tr key={a.id} className="hover:bg-surface-850">
                    <td className="p-3 font-semibold text-white">apps/{a.folderName}</td>
                    <td className="p-3 text-zinc-400 capitalize">{a.role}</td>
                    <td className="p-3 font-bold text-white font-mono">:{a.port}</td>
                    <td className="p-3 font-mono">:{a.port}</td>
                    <td className="p-3 capitalize">{a.runMode}</td>
                  </tr>
                ))}
                {activeDatabases.map(d => (
                  <tr key={d.type} className="hover:bg-surface-850">
                    <td className="p-3 font-semibold text-white">{d.type}</td>
                    <td className="p-3 text-zinc-400">Database</td>
                    <td className="p-3 font-bold text-white font-mono">:{d.port}</td>
                    <td className="p-3 font-mono">:{d.port}</td>
                    <td className="p-3">Docker Container</td>
                  </tr>
                ))}
                {settings.proxy.type !== 'none' && (
                  <tr className="hover:bg-surface-850">
                    <td className="p-3 font-semibold text-white">Gateway ({settings.proxy.type})</td>
                    <td className="p-3 text-zinc-400">Reverse Proxy</td>
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
