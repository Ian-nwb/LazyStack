import React, { useMemo, useState } from 'react'
import { ChevronDown, Link2, HeartPulse, FlaskConical, Plus, X } from 'lucide-react'
import { AppHealthCheck, CartApp, ServiceConnection, CustomTestingTool } from '../types'
import { TESTING_CATEGORIES, TESTING_TOOLS } from '../data/testingTools'
import { TECH_CATALOG } from '../data/frameworks'
import { getDefaultConnectionEnvVar } from '../utils/serviceConnections'

interface ServiceOptionsPanelProps {
  app: CartApp
  apps: CartApp[]
  onUpdate: (updates: Partial<CartApp>) => void
}

const DEFAULT_HEALTH_CHECK: AppHealthCheck = {
  enabled: false,
  type: 'http',
  path: '/health',
  intervalSeconds: 10,
  timeoutSeconds: 3,
  retries: 5,
  startPeriodSeconds: 10
}

export const ServiceOptionsPanel: React.FC<ServiceOptionsPanelProps> = ({ app, apps, onUpdate }) => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [otherName, setOtherName] = useState('')
  const [otherPackage, setOtherPackage] = useState('')
  const [connectionTarget, setConnectionTarget] = useState('')
  const techLanguage = (TECH_CATALOG.find(tech => tech.id === app.techId)?.language || '').toLowerCase()
  const usesNodeEcosystem = /(javascript|typescript|node|bun|deno|js\s*\/\s*ts)/.test(techLanguage)

  const availableTools = useMemo(() => TESTING_TOOLS.filter(tool => {
    if (!tool.roles.includes(app.role)) return false
    if (tool.techIds && !tool.techIds.includes(app.techId)) return false
    if (tool.ecosystem === 'npm' && !usesNodeEcosystem) return false
    if (tool.ecosystem === 'python' && !techLanguage.includes('python')) return false
    if (tool.ecosystem === 'go' && !techLanguage.includes('go')) return false
    if (tool.ecosystem === 'rust' && !techLanguage.includes('rust')) return false
    if (tool.ecosystem === 'jvm' && !/(java|kotlin|scala|clojure)/.test(techLanguage)) return false
    if (tool.ecosystem === 'dotnet' && !/(c#|\.net)/.test(techLanguage)) return false
    if (tool.ecosystem === 'php' && !techLanguage.includes('php')) return false
    if (tool.id === 'node-test' && !usesNodeEcosystem) return false
    if (tool.id === 'go-test' && !techLanguage.includes('go')) return false
    if (tool.id === 'rust-test' && !techLanguage.includes('rust')) return false
    if (category !== 'all' && tool.category !== category) return false
    return `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(search.toLowerCase())
  }), [app.role, app.techId, category, search, techLanguage, usesNodeEcosystem])

  const toggleTool = (toolId: string) => {
    const current = app.testingTools || []
    const tool = TESTING_TOOLS.find(item => item.id === toolId)
    const conflicting = tool?.scriptName ? current.filter(id => {
      const existing = TESTING_TOOLS.find(item => item.id === id)
      return existing?.scriptName === tool.scriptName
    }) : []
    const next = current.includes(toolId)
      ? current.filter(id => id !== toolId)
      : [...current.filter(id => !conflicting.includes(id)), toolId]
    onUpdate({ testingTools: next })
  }

  const addOtherTool = () => {
    const name = otherName.trim()
    if (!name) return
    const custom: CustomTestingTool = { name, packageName: otherPackage.trim() || undefined }
    onUpdate({ customTestingTools: [...(app.customTestingTools || []), custom] })
    setOtherName('')
    setOtherPackage('')
  }

  const addConnection = () => {
    const target = apps.find(item => item.id === connectionTarget)
    if (!target) return
    const connections = app.connections || []
    if (connections.some(item => item.targetAppId === target.id)) return
    const connection: ServiceConnection = {
      targetAppId: target.id,
      envVar: getDefaultConnectionEnvVar(app, target),
      protocol: 'http'
    }
    onUpdate({ connections: [...connections, connection] })
    setConnectionTarget('')
  }

  const updateConnection = (index: number, updates: Partial<ServiceConnection>) => {
    onUpdate({ connections: (app.connections || []).map((connection, i) => i === index ? { ...connection, ...updates } : connection) })
  }

  const healthCheck = app.healthCheck || DEFAULT_HEALTH_CHECK
  const patchHealthCheck = (updates: Partial<AppHealthCheck>) => onUpdate({ healthCheck: { ...healthCheck, ...updates } })
  const candidateTargets = apps.filter(item => item.id !== app.id && !(app.connections || []).some(connection => connection.targetAppId === item.id))

  return (
    <details className="group border-t border-surface-750/70 pt-2">
      <summary className="list-none cursor-pointer flex items-center justify-between gap-3 rounded-md py-1 text-xs text-zinc-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400">
        <span className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" /> Connections, health & testing
          {(app.connections?.length || app.testingTools?.length || app.customTestingTools?.length || app.healthCheck?.enabled) ? (
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">Configured</span>
          ) : null}
        </span>
        <ChevronDown className="w-4 h-4 transition group-open:rotate-180" />
      </summary>

      <div className="mt-3 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {app.techId === 'python-fastapi' && <section className="xl:col-span-3 border border-surface-700 bg-surface-950 p-3">
          <label className="block text-[11px] font-semibold text-zinc-300">Service starter
            <select value={app.starterProfile || 'minimal'} onChange={event => onUpdate({ starterProfile: event.target.value as CartApp['starterProfile'] })} className="mt-1 block w-full max-w-md rounded border border-surface-700 bg-surface-900 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400">
              <option value="minimal">Minimal FastAPI</option>
              <option value="api-service">API service · CRUD, database, bearer auth, migrations, tests</option>
            </select>
          </label>
          <p className="mt-1 text-[10px] text-zinc-500">The API service profile uses an assigned PostgreSQL/MySQL database, or SQLite when no database is configured.</p>
        </section>}
        <section className="min-w-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 flex items-center gap-1.5 mb-2"><Link2 className="w-3.5 h-3.5" /> Service connections</h4>
          <p className="text-[10px] text-zinc-500 mb-2">Generate URL environment variables and start dependencies for this service.</p>
          {(app.connections || []).map((connection, index) => {
            const target = apps.find(item => item.id === connection.targetAppId)
            return (
              <div key={`${connection.targetAppId}-${index}`} className="mb-2 rounded-lg border border-surface-700 bg-surface-950 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-200">{target?.folderName || 'Missing service'}</span>
                  <button type="button" onClick={() => onUpdate({ connections: (app.connections || []).filter((_, i) => i !== index) })} aria-label="Remove service connection" className="rounded p-1 text-zinc-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-zinc-500">Environment variable
                    <input value={connection.envVar} onChange={event => updateConnection(index, { envVar: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} className="mt-1 w-full rounded border border-surface-700 bg-surface-900 px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-zinc-400" />
                  </label>
                  <label className="text-[10px] text-zinc-500">Protocol
                    <select value={connection.protocol} onChange={event => updateConnection(index, { protocol: event.target.value as ServiceConnection['protocol'] })} className="mt-1 w-full rounded border border-surface-700 bg-surface-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-400">
                      <option value="http">HTTP</option><option value="https">HTTPS</option><option value="grpc">gRPC</option><option value="custom">Custom URL</option>
                    </select>
                  </label>
                </div>
                {connection.protocol === 'custom' && <input aria-label="Custom service URL" value={connection.customUrl || ''} onChange={event => updateConnection(index, { customUrl: event.target.value })} placeholder="https://service.example" className="w-full rounded border border-surface-700 bg-surface-900 px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-zinc-400" />}
              </div>
            )
          })}
          {candidateTargets.length > 0 ? <div className="flex gap-2">
            <select value={connectionTarget} onChange={event => setConnectionTarget(event.target.value)} aria-label="Choose a service to connect" className="min-w-0 flex-1 rounded border border-surface-700 bg-surface-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400">
              <option value="">Choose a service…</option>{candidateTargets.map(target => <option key={target.id} value={target.id}>{target.folderName}</option>)}
            </select>
            <button type="button" onClick={addConnection} disabled={!connectionTarget} className="rounded border border-surface-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"><Plus className="inline w-3 h-3 mr-1" />Add</button>
          </div> : null}
        </section>

        <section className="min-w-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 flex items-center gap-1.5 mb-2"><HeartPulse className="w-3.5 h-3.5" /> Health check</h4>
          <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" checked={healthCheck.enabled} onChange={event => patchHealthCheck({ enabled: event.target.checked })} className="accent-zinc-200" /> Wait until this service is healthy before dependents start</label>
          {healthCheck.enabled && <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-zinc-500">Check type<select value={healthCheck.type} onChange={event => patchHealthCheck({ type: event.target.value as AppHealthCheck['type'] })} className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white"><option value="http">HTTP endpoint</option><option value="command">Command</option></select></label>
            {healthCheck.type === 'http' ? <label className="text-[10px] text-zinc-500">Path<input value={healthCheck.path || '/health'} onChange={event => patchHealthCheck({ path: event.target.value })} placeholder="/health" className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs font-mono text-white" /></label> : <label className="text-[10px] text-zinc-500">Command<input value={healthCheck.command || ''} onChange={event => patchHealthCheck({ command: event.target.value })} placeholder="curl -f localhost:PORT/health" className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs font-mono text-white" /></label>}
            <label className="text-[10px] text-zinc-500">Interval (seconds)<input type="number" min="1" value={healthCheck.intervalSeconds} onChange={event => patchHealthCheck({ intervalSeconds: Number(event.target.value) || 1 })} className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white" /></label>
            <label className="text-[10px] text-zinc-500">Retries<input type="number" min="1" value={healthCheck.retries} onChange={event => patchHealthCheck({ retries: Number(event.target.value) || 1 })} className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white" /></label>
            <label className="text-[10px] text-zinc-500">Timeout (seconds)<input type="number" min="1" value={healthCheck.timeoutSeconds} onChange={event => patchHealthCheck({ timeoutSeconds: Number(event.target.value) || 1 })} className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white" /></label>
            <label className="text-[10px] text-zinc-500">Start period (seconds)<input type="number" min="0" value={healthCheck.startPeriodSeconds} onChange={event => patchHealthCheck({ startPeriodSeconds: Number(event.target.value) || 0 })} className="mt-1 w-full rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white" /></label>
          </div>}
          <p className="mt-2 text-[10px] text-zinc-500">HTTP checks call the configured path on the app’s container port.</p>
        </section>

        <section className="min-w-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 flex items-center gap-1.5 mb-2"><FlaskConical className="w-3.5 h-3.5" /> Testing tools</h4>
          <p className="text-[10px] text-zinc-500 mb-2">Choose any compatible tools. The catalog spans languages and test types.</p>
          <div className="flex gap-2 mb-2">
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search testing tools…" aria-label="Search testing tools" className="min-w-0 flex-1 rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400" />
            <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter tools by category" className="max-w-36 rounded border border-surface-700 bg-surface-950 px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-400"><option value="all">All types</option>{TESTING_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </div>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-surface-700 bg-surface-950 divide-y divide-surface-800">
            {availableTools.map(tool => <label key={tool.id} className="flex gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-900 focus-within:bg-surface-900">
              <input type="checkbox" checked={(app.testingTools || []).includes(tool.id)} onChange={() => toggleTool(tool.id)} className="mt-0.5 accent-zinc-200" />
              <span className="min-w-0"><span className="block text-xs text-zinc-200">{tool.name} <span className="ml-1 text-[9px] uppercase text-zinc-500">{tool.category}</span></span><span className="block text-[10px] text-zinc-500">{tool.description}</span></span>
            </label>)}
            {availableTools.length === 0 && <p className="p-3 text-[10px] text-zinc-500">No tools match this filter.</p>}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1.5">
            <input value={otherName} onChange={event => setOtherName(event.target.value)} aria-label="Custom testing tool name" placeholder="Other tool name" className="min-w-0 rounded border border-surface-700 bg-surface-950 px-2 py-1 text-[10px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400" />
            <input value={otherPackage} onChange={event => setOtherPackage(event.target.value)} aria-label="Custom testing tool package" placeholder="Package or command" className="min-w-0 rounded border border-surface-700 bg-surface-950 px-2 py-1 text-[10px] font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400" />
            <button type="button" disabled={!otherName.trim()} onClick={addOtherTool} className="rounded border border-surface-700 px-2 py-1 text-[10px] text-zinc-200 hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed">Add</button>
          </div>
          {(app.customTestingTools || []).map((tool, index) => <div key={`${tool.name}-${index}`} className="mt-1 flex items-center justify-between text-[10px] text-zinc-300"><span>{tool.name}{tool.packageName ? ` · ${tool.packageName}` : ''}</span><button type="button" aria-label={`Remove ${tool.name}`} onClick={() => onUpdate({ customTestingTools: (app.customTestingTools || []).filter((_, i) => i !== index) })} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button></div>)}
          {app.testingTools?.includes('storybook') && <p className="mt-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[10px] text-zinc-300">Storybook adds a component workbench with a dev server on port 6006.</p>}
        </section>
      </div>
    </details>
  )
}
