import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, ArrowUp, ArrowDown, Search, Server, Monitor, Check, AlertTriangle, RefreshCw, Code2, Download, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react'
import { CartApp, TechItem, AppRole, SelectedDatabase, LanguageFlavor } from '../types'
import { TECH_CATALOG } from '../data/frameworks'
import { STACK_PRESETS, StackPreset } from '../data/presets'
import { validateFolderName } from '../utils/pathValidation'

interface CartBuilderProps {
  apps: CartApp[]
  setApps: React.Dispatch<React.SetStateAction<CartApp[]>>
  databases: SelectedDatabase[]
  onApplyPreset?: (preset: StackPreset) => void
}

export const CartBuilder: React.FC<CartBuilderProps> = ({ apps, setApps, databases, onApplyPreset }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFlavor, setSelectedFlavor] = useState<LanguageFlavor>('typescript')

  // Prerequisite audit cache
  const [auditStatus, setAuditStatus] = useState<Record<string, { installed: boolean; version?: string }>>({})
  const [installingBinary, setInstallingBinary] = useState<string | null>(null)
  const [installNotification, setInstallNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Fetch host binary status
  const fetchAudit = async () => {
    try {
      let results: any[] = []
      if (window.electronAPI?.auditEnvironment) {
        results = await window.electronAPI.auditEnvironment()
      } else {
        // Query live host environment audit from Vite dev server API
        const response = await fetch('/api/audit')
        results = await response.json()
      }

      if (Array.isArray(results)) {
        const map: Record<string, { installed: boolean; version?: string }> = {}
        results.forEach(item => {
          map[item.binary] = { installed: item.installed, version: item.version }
          map[item.id] = { installed: item.installed, version: item.version }
        })
        setAuditStatus(map)
      }
    } catch (err) {
      console.error('Audit fetch error:', err)
    }
  }

  useEffect(() => {
    fetchAudit()
  }, [])

  // Quick Install and Add to PATH handler
  const handleQuickInstall = async (binaryName: string, label: string) => {
    setInstallingBinary(binaryName)
    setInstallNotification(null)

    try {
      let res: any
      if (window.electronAPI?.installBinary) {
        res = await window.electronAPI.installBinary(binaryName)
      } else {
        const response = await fetch('/api/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ binaryId: binaryName })
        })
        res = await response.json()
      }

      if (res?.success) {
        setInstallNotification({
          text: res.message || `Successfully installed ${label} and added to PATH!`,
          type: 'success'
        })
        await fetchAudit()
      } else {
        setInstallNotification({
          text: res?.message || `Failed to install ${label}`,
          type: 'error'
        })
      }
    } catch (err: any) {
      setInstallNotification({
        text: err.message || `Installation error for ${label}`,
        type: 'error'
      })
    } finally {
      setInstallingBinary(null)
      setTimeout(() => setInstallNotification(null), 6000)
    }
  }

  // Find next available port starting from base
  const findNextAvailablePort = (basePort: number): number => {
    const usedPorts = new Set<number>()
    apps.forEach(a => usedPorts.add(a.port))
    databases.filter(d => d.enabled && d.port > 0).forEach(d => usedPorts.add(d.port))

    let candidate = basePort
    while (usedPorts.has(candidate)) {
      candidate++
    }
    return candidate
  }

  // Add app from catalog
  const handleAddTech = (tech: TechItem) => {
    let baseName = tech.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    let folderName = baseName
    let counter = 1
    while (apps.some(a => a.folderName === folderName)) {
      folderName = `${baseName}-${counter++}`
    }

    const assignedPort = findNextAvailablePort(tech.defaultPort)

    const newApp: CartApp = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      folderName,
      role: tech.role,
      techId: tech.id,
      port: assignedPort,
      runMode: 'docker',
      routePrefix: tech.role === 'frontend' ? '/' : `/${folderName}`,
      flavor: tech.supportsFlavor ? selectedFlavor : undefined
    }

    setApps([...apps, newApp])
    setIsAddModalOpen(false)
  }

  // Duplicate an app in stack
  const handleDuplicate = (app: CartApp) => {
    let copyName = `${app.folderName}-copy`
    let counter = 1
    while (apps.some(a => a.folderName === copyName)) {
      copyName = `${app.folderName}-copy-${counter++}`
    }

    const newPort = findNextAvailablePort(app.port + 1)

    const duplicated: CartApp = {
      ...app,
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      folderName: copyName,
      port: newPort,
      routePrefix: `/${copyName}`
    }

    const index = apps.findIndex(a => a.id === app.id)
    const updated = [...apps]
    updated.splice(index + 1, 0, duplicated)
    setApps(updated)
  }

  const handleDelete = (id: string) => {
    setApps(apps.filter(a => a.id !== id))
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= apps.length) return
    const updated = [...apps]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setApps(updated)
  }

  const handleUpdate = (id: string, updates: Partial<CartApp>) => {
    setApps(apps.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  // Filter catalog items
  const filteredCatalog = TECH_CATALOG.filter(tech => {
    const matchesSearch = tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tech.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tech.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || tech.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Check port collisions
  const getPortCollision = (port: number, currentAppId: string) => {
    if (port <= 0) return null
    const collidingApp = apps.find(a => a.id !== currentAppId && a.port === port)
    if (collidingApp) return `Collides with app '${collidingApp.folderName}'`
    const collidingDb = databases.find(d => d.enabled && d.port === port)
    if (collidingDb) return `Collides with ${collidingDb.type.toUpperCase()} database`
    return null
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
      {/* Action Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-surface-700 bg-surface-900">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Application Services</h2>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-medium border border-zinc-700">
              {apps.length} in stack
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Add multiple frontends, backends, or workers. LazyStack checks prerequisites (npm, bun, composer, etc.) per framework.
          </p>
        </div>

        <button
          onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setIsAddModalOpen(true); }}
          className="px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-2 transition active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 text-zinc-950" />
          Add Service / Framework
        </button>
      </div>

      {/* 1-Click Popular Stack Presets */}
      {onApplyPreset && (
        <div className="px-6 py-2.5 bg-surface-950 border-b border-surface-700/60 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" /> Presets:
          </span>
          {STACK_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className="px-2.5 py-1 rounded-lg border border-surface-700 hover:border-zinc-500 bg-surface-900 hover:bg-surface-850 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              title={preset.tagline}
            >
              <span>{preset.icon}</span>
              <span className="font-semibold">{preset.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Prerequisite Install Toast / Notification */}
      {installNotification && (
        <div className={`mx-6 mt-3 p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
          installNotification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : 'bg-amber-950/80 border-amber-700 text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {installNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>{installNotification.text}</span>
          </div>
          <button
            onClick={() => setInstallNotification(null)}
            className="text-zinc-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stack Services List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {apps.length === 0 ? (
          <div className="h-64 border border-dashed border-surface-700 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-surface-900">
            <div className="w-10 h-10 rounded-lg bg-surface-850 flex items-center justify-center text-zinc-300 mb-3 border border-surface-700 shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 dark:text-zinc-200">Stack is empty</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
              Select languages and frameworks to begin scaffolding your custom monorepo.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-surface-850 hover:bg-surface-800 text-zinc-100 text-xs font-bold transition border border-surface-700 cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-100" />
              Browse Technologies
            </button>
          </div>
        ) : (
          apps.map((app, index) => {
            const tech = TECH_CATALOG.find(t => t.id === app.techId)
            const portError = getPortCollision(app.port, app.id)
            const duplicateFolder = apps.filter(a => a.folderName === app.folderName).length > 1
            const requirements = tech?.requires || []

            return (
              <div 
                key={app.id} 
                className="bg-surface-900 border border-surface-700 rounded-xl p-4 transition hover:border-zinc-500 relative flex flex-col gap-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Reorder and Identity */}
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="flex flex-col gap-1 text-zinc-500">
                      <button 
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="hover:text-white disabled:opacity-20 transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === apps.length - 1}
                        className="hover:text-white disabled:opacity-20 transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${tech?.badgeColor || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                          {tech?.language || 'Custom'}
                        </span>
                        {app.role === 'fullstack' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/40 uppercase font-bold">
                            Fullstack
                          </span>
                        )}
                        <span className="text-xs font-bold text-zinc-200 truncate">
                          {tech?.name || app.techId}
                        </span>

                        {/* TypeScript vs JavaScript Flavor Toggle */}
                        {tech?.supportsFlavor && (
                          <div className="flex bg-surface-950 p-0.5 rounded border border-surface-700 text-[10px] font-mono">
                            <button
                              onClick={() => handleUpdate(app.id, { flavor: 'typescript' })}
                              className={`px-1.5 py-0.2 rounded transition ${
                                (app.flavor || 'typescript') === 'typescript'
                                  ? 'bg-zinc-200 text-zinc-950 font-bold'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              TS
                            </button>
                            <button
                              onClick={() => handleUpdate(app.id, { flavor: 'javascript' })}
                              className={`px-1.5 py-0.2 rounded transition ${
                                app.flavor === 'javascript'
                                  ? 'bg-zinc-200 text-zinc-950 font-bold'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              JS
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Folder Name input with validation */}
                      {(() => {
                        const folderValidation = validateFolderName(app.folderName, 'app')
                        const hasFolderError = !folderValidation.valid || duplicateFolder
                        const folderErrorText = !folderValidation.valid ? folderValidation.error : 'Duplicate folder name'

                        return (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono text-zinc-500">apps/</span>
                              <input
                                type="text"
                                value={app.folderName}
                                onChange={(e) => handleUpdate(app.id, { folderName: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                                className={`bg-surface-950 border text-xs font-mono px-2.5 py-1 rounded w-44 text-white focus:outline-none transition ${
                                  hasFolderError ? 'border-rose-500/80 focus:border-rose-400 bg-rose-950/10' : 'border-surface-650 focus:border-zinc-400'
                                }`}
                                placeholder="subfolder-name"
                              />
                            </div>
                            {hasFolderError && (
                              <p className="text-[10px] text-rose-400 mt-0.5 flex items-center gap-1 truncate max-w-[200px]" title={folderErrorText}>
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {folderErrorText}
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Role and Run Mode */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    {/* Role Picker */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">Role</label>
                      <select
                        value={app.role}
                        onChange={(e) => handleUpdate(app.id, { role: e.target.value as AppRole })}
                        className="w-full bg-surface-950 border border-surface-650 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 font-mono"
                      >
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                        <option value="fullstack">Fullstack</option>
                        <option value="worker">Worker</option>
                        <option value="desktop-mobile">Client</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Run Mode toggle */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">Run Mode</label>
                      <div className="flex bg-surface-950 p-0.5 rounded border border-surface-650">
                        <button
                          onClick={() => handleUpdate(app.id, { runMode: 'docker' })}
                          className={`flex-1 py-0.5 text-[11px] font-medium rounded transition flex items-center justify-center gap-1 ${
                            app.runMode === 'docker' ? 'bg-zinc-200 text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Server className="w-2.5 h-2.5" /> Docker
                        </button>
                        <button
                          onClick={() => handleUpdate(app.id, { runMode: 'host' })}
                          className={`flex-1 py-0.5 text-[11px] font-medium rounded transition flex items-center justify-center gap-1 ${
                            app.runMode === 'host' ? 'bg-zinc-200 text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Monitor className="w-2.5 h-2.5" /> Host
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Port Selector */}
                  <div className="md:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase">
                        Port {app.port === 0 && <span className="lowercase font-normal">(no port)</span>}
                      </label>
                      {portError ? (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                          <AlertTriangle className="w-3 h-3 text-zinc-400" /> Collision
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                          <Check className="w-3 h-3 text-zinc-400" /> OK
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="65535"
                        value={app.port}
                        onChange={(e) => handleUpdate(app.id, { port: parseInt(e.target.value) || 0 })}
                        className={`bg-surface-950 border text-xs font-mono px-2.5 py-1 rounded w-24 text-white focus:outline-none ${
                          portError ? 'border-zinc-500' : 'border-surface-650 focus:border-zinc-300'
                        }`}
                      />
                      <button
                        onClick={() => handleUpdate(app.id, { port: findNextAvailablePort(app.port || 3000) })}
                        title="Auto-assign next free port"
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded border border-zinc-700 flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-400" /> Auto
                      </button>
                    </div>
                    {portError && (
                      <p className="text-[10px] text-zinc-400 mt-1 truncate font-mono">{portError}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleDuplicate(app)}
                      className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prerequisite Runtime & Package Manager Check Section */}
                {requirements.length > 0 && (
                  <div className="pt-2 border-t border-surface-750/70 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] text-zinc-400 font-medium">Prerequisites:</span>
                    {requirements.map((req, rIdx) => {
                      const isInstalled = auditStatus[req.binary]?.installed
                      const isCurrentInstalling = installingBinary === req.binary

                      return (
                        <div key={rIdx} className="flex items-center gap-1">
                          {isInstalled ? (
                            <span 
                              className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 text-[11px] font-mono flex items-center gap-1"
                              title={`${req.label} is installed and available in PATH`}
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{req.label}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-800/80 rounded px-2 py-0.5 text-[11px] font-mono text-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{req.label} missing</span>
                              <button
                                onClick={() => handleQuickInstall(req.binary, req.label)}
                                disabled={isCurrentInstalling}
                                className="ml-1 px-1.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded text-[10px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                                title={`Quick install ${req.label} and automatically configure PATH`}
                              >
                                {isCurrentInstalling ? (
                                  <>
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    Installing...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-2.5 h-2.5" />
                                    Quick Install & PATH
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Framework Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface-900 border border-surface-700 w-full max-w-4xl max-h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-surface-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-zinc-300" />
                  Select Technology / Framework
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Choose from available technologies. Prerequisites (npm, bun, composer, cargo, etc.) are validated in real-time.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-semibold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search, Filter, and TS/JS Option */}
            <div className="p-4 border-b border-surface-700 bg-surface-950 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Echo, Chi, Nuxt, SvelteKit, Bun..."
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-300 font-mono"
                  autoFocus
                />
              </div>

              {/* Language Flavor Selector (TypeScript vs JavaScript) */}
              <div className="flex items-center gap-2 bg-surface-900 px-3 py-1 rounded-lg border border-surface-700 text-xs">
                <span className="text-zinc-400 font-mono text-[11px]">Dialect:</span>
                <div className="flex bg-surface-950 p-0.5 rounded border border-surface-700 font-mono">
                  <button
                    onClick={() => setSelectedFlavor('typescript')}
                    className={`px-2.5 py-0.5 text-xs rounded transition font-medium cursor-pointer ${
                      selectedFlavor === 'typescript'
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setSelectedFlavor('javascript')}
                    className={`px-2.5 py-0.5 text-xs rounded transition font-medium cursor-pointer ${
                      selectedFlavor === 'javascript'
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    JavaScript
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'systems', label: 'Systems & ASM' },
                  { id: 'frontend', label: 'Frontend' },
                  { id: 'backend', label: 'Backend' },
                  { id: 'fullstack', label: 'Fullstack' },
                  { id: 'mobile-desktop', label: 'Client' },
                  { id: 'scripting', label: 'Scripting' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'bg-surface-850 hover:bg-surface-800 text-zinc-400 hover:text-zinc-200 border border-surface-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-surface-950">
              {filteredCatalog.map(tech => {
                const reqs = tech.requires || []
                return (
                  <div
                    key={tech.id}
                    onClick={() => handleAddTech(tech)}
                    className="p-3.5 rounded-xl border border-surface-700 bg-surface-900 hover:border-zinc-400 cursor-pointer transition text-left flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${tech.badgeColor}`}>
                          {tech.supportsFlavor ? (selectedFlavor === 'typescript' ? 'TypeScript' : 'JavaScript') : tech.language}
                        </span>
                        {tech.defaultPort > 0 ? (
                          <span className="text-[10px] font-mono text-zinc-400 bg-surface-950 px-1.5 py-0.5 rounded border border-surface-750">
                            :{tech.defaultPort}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-500">
                            Worker
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-zinc-200 transition">
                        {tech.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                        {tech.description}
                      </p>

                      {/* Prerequisites indicators in modal */}
                      {reqs.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {reqs.map((r, i) => {
                            const isInst = auditStatus[r.binary]?.installed
                            return (
                              <span
                                key={i}
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                                  isInst
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {isInst ? '✓' : '•'} {r.binary}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-surface-800 flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="capitalize">{tech.role}</span>
                      <span className="text-white opacity-0 group-hover:opacity-100 transition font-bold">
                        Add to stack +
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-surface-700 bg-surface-900 flex items-center justify-between text-xs text-zinc-400">
              <span>Showing {filteredCatalog.length} technologies</span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
