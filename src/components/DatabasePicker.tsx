import React, { useState } from 'react'
import { Database, AlertTriangle, HardDrive, ShieldCheck, Cloud, Server, ExternalLink, Package, Key, Plus, Trash2, Box } from 'lucide-react'
import { SelectedDatabase, DatabaseType, CartApp, DatabaseAdminUi } from '../types'
import { DATABASE_CATALOG } from '../data/databases'
import { getDatabaseAdminUiOption, getDatabaseAdminUiOptions } from '../data/databaseAdminUis'

interface DatabasePickerProps {
  databases: SelectedDatabase[]
  setDatabases: React.Dispatch<React.SetStateAction<SelectedDatabase[]>>
  apps: CartApp[]
}

type FilterTab = 'all' | 'self-hosted' | 'cloud'

export const DatabasePicker: React.FC<DatabasePickerProps> = ({ databases, setDatabases, apps }) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const getNextFreePort = (basePort: number) => {
    if (basePort <= 0) return 0
    let port = basePort
    const usedPorts = new Set<number>()
    databases.forEach(d => {
      if (!d.enabled) return
      if (d.port > 0) usedPorts.add(d.port)
      if (d.adminUiPort && d.adminUiPort > 0) usedPorts.add(d.adminUiPort)
    })
    apps.forEach(a => { if (a.port > 0) usedPorts.add(a.port) })
    while (usedPorts.has(port)) {
      port++
    }
    return port
  }

  const toggleDatabase = (type: DatabaseType) => {
    const existing = databases.filter(d => d.type === type && d.enabled)
    const def = DATABASE_CATALOG.find(c => c.id === type)
    if (existing.length > 0) {
      // Disable all instances of this type
      setDatabases(prev => prev.filter(d => d.type !== type))
    } else {
      // Add first instance
      const newInst: SelectedDatabase = {
        id: `${type}-${Date.now()}`,
        type,
        enabled: true,
        port: def ? getNextFreePort(def.defaultPort) : 0,
        customName: def?.name,
        assignedAppId: 'global',
        sqliteStorage: type === 'sqlite' ? 'shared-volume' : undefined
      }
      setDatabases(prev => [...prev, newInst])
    }
  }

  const addInstance = (type: DatabaseType) => {
    const def = DATABASE_CATALOG.find(c => c.id === type)
    const currentInstances = databases.filter(d => d.type === type && d.enabled)
    const nextPort = def ? getNextFreePort((def.defaultPort || 5000) + currentInstances.length) : 0
    const newInst: SelectedDatabase = {
      id: `${type}-${Date.now()}`,
      type,
      enabled: true,
      port: nextPort,
      customName: `${def?.name || type} #${currentInstances.length + 1}`,
      assignedAppId: 'global',
      sqliteStorage: type === 'sqlite' ? 'shared-volume' : undefined
    }
    setDatabases(prev => [...prev, newInst])
  }

  const removeInstance = (instanceId: string) => {
    setDatabases(prev => prev.filter(d => (d.id || d.type) !== instanceId))
  }

  const updateInstance = (instanceId: string, updates: Partial<SelectedDatabase>) => {
    setDatabases(prev => prev.map(d => (d.id || d.type) === instanceId ? { ...d, ...updates } : d))
  }

  const enabledHeavyDBs = databases.filter(d => {
    if (!d.enabled) return false
    const def = DATABASE_CATALOG.find(c => c.id === d.type)
    return def?.isHeavyMemory
  })

  const getPortCollision = (port: number, instanceId?: string, checkingAdminUi = false) => {
    if (port <= 0) return null
    const collidingDb = databases.find(d => d.enabled && d.port === port && (checkingAdminUi || (d.id || d.type) !== instanceId))
    if (collidingDb) return `Collides with ${collidingDb.customName || collidingDb.type.toUpperCase()}`
    const collidingAdminUi = databases.find(d => d.enabled && d.adminUiPort === port && (!checkingAdminUi || (d.id || d.type) !== instanceId))
    if (collidingAdminUi) return `Collides with ${getDatabaseAdminUiOption(collidingAdminUi.type, collidingAdminUi.adminUi)?.name || 'another database UI'}`
    const collidingApp = apps.find(a => a.port === port)
    if (collidingApp) return `Collides with app '${collidingApp.folderName}'`
    return null
  }

  // Filter databases by category tab
  const filteredCatalog = DATABASE_CATALOG.filter(db => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'self-hosted') return !db.isCloud
    if (activeFilter === 'cloud') return db.isCloud
    return true
  })

  const selfHostedCount = DATABASE_CATALOG.filter(d => !d.isCloud).length
  const cloudCount = DATABASE_CATALOG.filter(d => d.isCloud).length
  const enabledInstances = databases.filter(d => d.enabled)
  const enabledCloudCount = enabledInstances.filter(d => {
    const def = DATABASE_CATALOG.find(c => c.id === d.type)
    return def?.isCloud
  }).length
  const enabledSelfHostedCount = enabledInstances.filter(d => {
    const def = DATABASE_CATALOG.find(c => c.id === d.type)
    return !def?.isCloud
  }).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-700 bg-surface-900 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Database Infrastructure</h2>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-medium border border-zinc-700">
              {enabledInstances.length} active {enabledInstances.length === 1 ? 'instance' : 'instances'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure self-hosted container databases (multiple instances supported per microservice) or connect managed cloud services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 bg-surface-950 px-3 py-1.5 rounded-lg border border-surface-700 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" /> Auto Healthchecks
          </span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="px-6 py-2.5 border-b border-surface-700 bg-surface-900/50 flex items-center gap-1.5">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-zinc-100 text-zinc-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-surface-800'
          }`}
        >
          All
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
            activeFilter === 'all'
              ? 'bg-zinc-300/80 text-zinc-950 border-zinc-400/60 font-bold'
              : 'bg-surface-950 text-zinc-400 border-surface-700'
          }`}>
            {DATABASE_CATALOG.length}
          </span>
          {enabledInstances.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveFilter('self-hosted')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'self-hosted'
              ? 'bg-zinc-100 text-zinc-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-surface-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Self-Hosted
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
            activeFilter === 'self-hosted'
              ? 'bg-zinc-300/80 text-zinc-950 border-zinc-400/60 font-bold'
              : 'bg-surface-950 text-zinc-400 border-surface-700'
          }`}>
            {selfHostedCount}
          </span>
          {enabledSelfHostedCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveFilter('cloud')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'cloud'
              ? 'bg-zinc-100 text-zinc-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-surface-800'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          Cloud & BaaS
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
            activeFilter === 'cloud'
              ? 'bg-zinc-300/80 text-zinc-950 border-zinc-400/60 font-bold'
              : 'bg-surface-950 text-zinc-400 border-surface-700'
          }`}>
            {cloudCount}
          </span>
          {enabledCloudCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>

      {/* Memory Warning Banner */}
      {enabledHeavyDBs.length > 1 && (
        <div className="mx-6 mt-4 p-3 bg-zinc-900 border border-zinc-600 rounded-xl flex items-center gap-3 text-xs text-zinc-300">
          <AlertTriangle className="w-4 h-4 text-zinc-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">Resource Warning:</span> Multiple memory-heavy databases selected (
            {enabledHeavyDBs.map(d => d.type).join(', ')}). Recommended: 16GB+ RAM.
          </div>
        </div>
      )}

      {/* Database Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCatalog.map(db => {
          const instances = databases.filter(d => d.type === db.id && d.enabled)
          const isEnabled = instances.length > 0
          const isCloudService = db.isCloud

          return (
            <div
              key={db.id}
              className={`rounded-xl border p-4 transition flex flex-col justify-between ${
                isEnabled
                  ? isCloudService
                    ? 'bg-surface-900 border-zinc-600 shadow-md ring-1 ring-zinc-400/30'
                    : 'bg-surface-900 border-zinc-700 shadow-md ring-1 ring-zinc-500/20'
                  : 'bg-surface-900 border-surface-700 hover:border-surface-650'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      isEnabled ? `${db.badgeColor}` : 'bg-surface-950 text-zinc-400 border-surface-700'
                    }`}>
                      {isCloudService ? <Cloud className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {db.name}
                        {instances.length > 1 && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {instances.length}x
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${db.badgeColor}`}>
                          {db.category}
                        </span>
                        {db.id === 'sqlite' && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 rounded font-mono font-medium">
                            Embedded
                          </span>
                        )}
                        {isCloudService && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 rounded font-mono font-medium">
                            Cloud
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* High Contrast Switch */}
                  <button
                    onClick={() => toggleDatabase(db.id)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer border ${
                      isEnabled
                        ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-white'
                        : 'bg-surface-800 border-surface-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full transition-transform ${
                      isEnabled
                        ? 'translate-x-5 bg-white dark:bg-zinc-950'
                        : 'translate-x-0 bg-zinc-400 dark:bg-zinc-600'
                    }`} />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {db.description}
                </p>

                {/* Instance List */}
                {isEnabled && (
                  <div className="mt-3 space-y-2.5">
                    {instances.map((inst, index) => {
                      const instKey = inst.id || `${inst.type}-${index}`
                      const portCollision = getPortCollision(inst.port, inst.id || inst.type)

                      return (
                        <div
                          key={instKey}
                          className="p-2.5 bg-surface-950 rounded-lg border border-surface-750 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={inst.customName || `${db.name} #${index + 1}`}
                              onChange={(e) => updateInstance(instKey, { customName: e.target.value })}
                              placeholder="Instance Label"
                              className="text-xs font-semibold bg-transparent text-white border-b border-transparent hover:border-surface-600 focus:border-zinc-400 focus:outline-none px-1 py-0.5 font-mono w-2/3"
                            />
                            {instances.length > 1 && (
                              <button
                                onClick={() => removeInstance(instKey)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-surface-900 transition"
                                title="Remove this database instance"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Microservice Assignment */}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Box className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="text-[10px] text-zinc-400 font-mono">Scope:</span>
                            <select
                              value={inst.assignedAppId || 'global'}
                              onChange={(e) => updateInstance(instKey, { assignedAppId: e.target.value })}
                              className="bg-surface-900 border border-surface-700 rounded px-1.5 py-0.5 text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-zinc-400 flex-1 truncate"
                            >
                              <option value="global">🌐 Shared Infrastructure</option>
                              {apps.map(app => (
                                <option key={app.id} value={app.id}>
                                  📦 {app.folderName} ({app.techId})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Host Port (if applicable) */}
                          {(!isCloudService || db.id === 'pocketbase') && db.id !== 'sqlite' && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[10px] font-mono text-zinc-400">Host Port:</span>
                              <input
                                type="number"
                                value={inst.port}
                                onChange={(e) => updateInstance(instKey, { port: parseInt(e.target.value) || 0 })}
                                className={`w-20 bg-surface-900 border text-xs font-mono px-2 py-0.5 rounded text-white focus:outline-none ${
                                  portCollision ? 'border-red-500' : 'border-surface-650 focus:border-zinc-300'
                                }`}
                              />
                            </div>
                          )}

                          {portCollision && (
                            <p className="text-[10px] text-red-400 truncate font-mono">{portCollision}</p>
                          )}

                          {['postgres', 'mysql', 'mariadb', 'mongodb'].includes(db.id) && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <label className="text-[10px] text-zinc-400">Database name
                                <input value={inst.databaseName || `lazystack_${inst.type}`} onChange={(e) => updateInstance(instKey, { databaseName: e.target.value })} className="mt-1 w-full bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-zinc-400" />
                              </label>
                              <label className="text-[10px] text-zinc-400">Database user
                                <input value={inst.username || 'lazystack_user'} onChange={(e) => updateInstance(instKey, { username: e.target.value })} className="mt-1 w-full bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-zinc-400" />
                              </label>
                              <p className="col-span-2 text-[10px] text-zinc-500">A unique password is generated into the local .env file when the project is created.</p>
                            </div>
                          )}

                          {getDatabaseAdminUiOptions(inst.type).length > 0 && (
                            <div className="grid grid-cols-[1fr_auto] items-end gap-2 pt-1">
                              <label className="text-[10px] text-zinc-400">Database web UI
                                <select
                                  value={inst.adminUi || ''}
                                  onChange={(e) => {
                                    const adminUi = (e.target.value || undefined) as DatabaseAdminUi | undefined
                                    const option = getDatabaseAdminUiOption(inst.type, adminUi)
                                    updateInstance(instKey, {
                                      adminUi,
                                      adminUiPort: option ? getNextFreePort(option.defaultPort) : undefined
                                    })
                                  }}
                                  className="mt-1 w-full bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-zinc-400"
                                >
                                  <option value="">No admin UI</option>
                                  {getDatabaseAdminUiOptions(inst.type).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                              </label>
                              {inst.adminUi && <label className="text-[10px] text-zinc-400">UI port
                                <input
                                  type="number"
                                  min="1"
                                  max="65535"
                                  value={inst.adminUiPort || getDatabaseAdminUiOption(inst.type, inst.adminUi)?.defaultPort || ''}
                                  onChange={(e) => updateInstance(instKey, { adminUiPort: parseInt(e.target.value, 10) || 0 })}
                                  className={`mt-1 w-20 bg-surface-900 border text-xs font-mono px-2 py-1 rounded text-white focus:outline-none ${getPortCollision(inst.adminUiPort || 0, instKey, true) ? 'border-red-500' : 'border-surface-650 focus:border-zinc-300'}`}
                                />
                                {getPortCollision(inst.adminUiPort || 0, instKey, true) && <span className="block text-[9px] text-red-400 mt-1">{getPortCollision(inst.adminUiPort || 0, instKey, true)}</span>}
                              </label>}
                              {inst.adminUi && <p className="col-span-2 text-[10px] text-zinc-500">Available locally at http://localhost:{inst.adminUiPort || getDatabaseAdminUiOption(inst.type, inst.adminUi)?.defaultPort}</p>}
                            </div>
                          )}

                          {/* SQLite Storage Option */}
                          {db.id === 'sqlite' && (
                            <div className="pt-1">
                              <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                                <HardDrive className="w-3 h-3 text-zinc-400" /> Storage
                              </label>
                              <select
                                value={inst.sqliteStorage || 'shared-volume'}
                                onChange={(e) => updateInstance(instKey, { sqliteStorage: e.target.value as any })}
                                className="w-full bg-surface-900 border border-surface-650 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none font-mono"
                              >
                                <option value="shared-volume">Shared volume (/infra/sqlite/data.db)</option>
                                <option value="app-local">Local file within assigned service</option>
                                <option value="litestream">Litestream continuous S3 backup</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add Another Instance Button */}
                    <button
                      onClick={() => addInstance(db.id)}
                      className="w-full py-1.5 px-2 bg-surface-950 hover:bg-surface-850 border border-dashed border-surface-700 hover:border-zinc-500 rounded-lg text-xs font-mono text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add another {db.name.split(' ')[0]} instance</span>
                    </button>
                  </div>
                )}

                {/* Cloud Service Info */}
                {isCloudService && isEnabled && (
                  <div className="mt-3 space-y-2">
                    {db.sdkPackages && (
                      <div className="p-2 bg-surface-950 rounded-lg border border-surface-700">
                        <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                          <Package className="w-3 h-3 text-zinc-400" /> SDK Packages
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(db.sdkPackages).map(([ecosystem, pkg]) => (
                            <span
                              key={ecosystem}
                              className="text-[10px] font-mono bg-surface-900 text-zinc-300 border border-surface-650 px-1.5 py-0.5 rounded"
                            >
                              <span className="text-zinc-500">{ecosystem}:</span> {pkg.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {db.docsUrl && (
                      <a
                        href={db.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white transition px-2 py-1 bg-surface-950 rounded-lg border border-surface-700 hover:border-zinc-500"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Dashboard →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
