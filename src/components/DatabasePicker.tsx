import React, { useState } from 'react'
import { Database, AlertTriangle, HardDrive, ShieldCheck, Cloud, Server, ExternalLink, Package, Key } from 'lucide-react'
import { SelectedDatabase, DatabaseType, CartApp } from '../types'
import { DATABASE_CATALOG } from '../data/databases'

interface DatabasePickerProps {
  databases: SelectedDatabase[]
  setDatabases: React.Dispatch<React.SetStateAction<SelectedDatabase[]>>
  apps: CartApp[]
}

type FilterTab = 'all' | 'self-hosted' | 'cloud'

export const DatabasePicker: React.FC<DatabasePickerProps> = ({ databases, setDatabases, apps }) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const toggleDatabase = (type: DatabaseType) => {
    setDatabases(prev => {
      const existing = prev.find(d => d.type === type)
      const def = DATABASE_CATALOG.find(c => c.id === type)
      if (existing) {
        return prev.map(d => d.type === type ? { ...d, enabled: !d.enabled } : d)
      } else {
        return [...prev, {
          type,
          enabled: true,
          port: def ? def.defaultPort : 0,
          sqliteStorage: type === 'sqlite' ? 'shared-volume' : undefined
        }]
      }
    })
  }

  const updatePort = (type: DatabaseType, port: number) => {
    setDatabases(prev => prev.map(d => d.type === type ? { ...d, port } : d))
  }

  const updateSqliteStorage = (storage: 'shared-volume' | 'app-local' | 'litestream') => {
    setDatabases(prev => prev.map(d => d.type === 'sqlite' ? { ...d, sqliteStorage: storage } : d))
  }

  const enabledHeavyDBs = databases.filter(d => {
    if (!d.enabled) return false
    const def = DATABASE_CATALOG.find(c => c.id === d.type)
    return def?.isHeavyMemory
  })

  const getPortCollision = (port: number, currentType: DatabaseType) => {
    if (port <= 0) return null
    const collidingDb = databases.find(d => d.type !== currentType && d.enabled && d.port === port)
    if (collidingDb) return `Collides with ${collidingDb.type.toUpperCase()}`
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
  const enabledCloudCount = databases.filter(d => {
    if (!d.enabled) return false
    const def = DATABASE_CATALOG.find(c => c.id === d.type)
    return def?.isCloud
  }).length
  const enabledSelfHostedCount = databases.filter(d => {
    if (!d.enabled) return false
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
              {databases.filter(d => d.enabled).length} active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure containerized Docker databases, embedded SQLite, or connect managed cloud services & BaaS providers.
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
          <Database className="w-3.5 h-3.5" />
          All
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
            activeFilter === 'all'
              ? 'bg-zinc-300/80 text-zinc-950 border-zinc-400/60 font-bold'
              : 'bg-surface-950 text-zinc-400 border-surface-700'
          }`}>
            {DATABASE_CATALOG.length}
          </span>
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
          const selected = databases.find(d => d.type === db.id)
          const isEnabled = selected?.enabled ?? false
          const port = selected?.port ?? db.defaultPort
          const portCollision = isEnabled ? getPortCollision(port, db.id) : null
          const isCloudService = db.isCloud

          return (
            <div
              key={db.id}
              className={`rounded-xl border p-4 transition flex flex-col justify-between ${
                isEnabled
                  ? isCloudService
                    ? 'bg-surface-900 border-zinc-600 shadow-md ring-1 ring-zinc-400/30'
                    : 'bg-surface-900 border-zinc-800 dark:border-zinc-300 shadow-md ring-1 ring-zinc-500/20'
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

                {/* SQLite Special Storage Option */}
                {db.id === 'sqlite' && isEnabled && (
                  <div className="mt-3 p-2.5 bg-surface-950 rounded-lg border border-surface-700">
                    <label className="block text-[10px] font-semibold text-zinc-300 uppercase mb-1 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-zinc-400" /> Storage Target
                    </label>
                    <select
                      value={selected?.sqliteStorage || 'shared-volume'}
                      onChange={(e) => updateSqliteStorage(e.target.value as any)}
                      className="w-full bg-surface-900 border border-surface-650 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 font-mono"
                    >
                      <option value="shared-volume">Shared Docker volume (/infra/sqlite/data.db)</option>
                      <option value="app-local">Local file within each app subfolder</option>
                      <option value="litestream">Litestream continuous S3 backup</option>
                    </select>
                  </div>
                )}

                {/* Cloud Service Details (SDK, Env Vars, Dashboard Link) */}
                {isCloudService && isEnabled && (
                  <div className="mt-3 space-y-2">
                    {/* SDK Packages */}
                    {db.sdkPackages && (
                      <div className="p-2.5 bg-surface-950 rounded-lg border border-surface-700">
                        <label className="block text-[10px] font-semibold text-zinc-300 uppercase mb-1.5 flex items-center gap-1">
                          <Package className="w-3 h-3 text-zinc-400" /> SDK Packages
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(db.sdkPackages).map(([ecosystem, pkg]) => (
                            <span
                              key={ecosystem}
                              className="text-[10px] font-mono bg-surface-900 text-zinc-300 border border-surface-650 px-1.5 py-0.5 rounded"
                              title={`${ecosystem}: ${pkg}`}
                            >
                              <span className="text-zinc-500">{ecosystem}:</span> {pkg.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Required Env Vars */}
                    {db.envVars && db.envVars.length > 0 && (
                      <div className="p-2.5 bg-surface-950 rounded-lg border border-surface-700">
                        <label className="block text-[10px] font-semibold text-zinc-300 uppercase mb-1.5 flex items-center gap-1">
                          <Key className="w-3 h-3 text-zinc-400" /> Required Env Vars
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {db.envVars.map(envVar => (
                            <span
                              key={envVar}
                              className="text-[10px] font-mono bg-surface-900 text-zinc-400 border border-surface-650 px-1.5 py-0.5 rounded"
                            >
                              {envVar}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dashboard Link */}
                    {db.docsUrl && (
                      <a
                        href={db.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white transition px-2.5 py-1.5 bg-surface-950 rounded-lg border border-surface-700 hover:border-zinc-500"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Dashboard →
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Port & Image Tag Footer — only for self-hosted non-SQLite databases */}
              {isEnabled && !isCloudService && db.id !== 'sqlite' && (
                <div className="mt-3 pt-3 border-t border-surface-750 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-400">Host Port:</span>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => updatePort(db.id, parseInt(e.target.value) || 0)}
                      className={`w-20 bg-surface-950 border text-xs font-mono px-2 py-0.5 rounded text-white focus:outline-none ${
                        portCollision ? 'border-zinc-500' : 'border-surface-650 focus:border-zinc-300'
                      }`}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[120px]" title={db.imageTag}>
                    {db.imageTag}
                  </span>
                </div>
              )}

              {/* Pocketbase gets port config since it can run as Docker */}
              {isEnabled && db.id === 'pocketbase' && (
                <div className="mt-3 pt-3 border-t border-surface-750 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-400">Host Port:</span>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => updatePort(db.id, parseInt(e.target.value) || 0)}
                      className={`w-20 bg-surface-950 border text-xs font-mono px-2 py-0.5 rounded text-white focus:outline-none ${
                        portCollision ? 'border-zinc-500' : 'border-surface-650 focus:border-zinc-300'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[120px]" title={db.imageTag}>
                    {db.imageTag}
                  </span>
                </div>
              )}

              {portCollision && (
                <p className="text-[10px] text-zinc-400 mt-1 truncate font-mono">{portCollision}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
