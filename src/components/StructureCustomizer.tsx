import React, { useState } from 'react'
import { FolderTree, Sliders, Check, Sparkles, Database, Layers, Plus, X } from 'lucide-react'
import { ArchitecturePreset, FolderStructureConfig, ProjectSettings } from '../types'
import { ARCHITECTURE_PRESETS, getDefaultStructureConfig } from '../data/structurePresets'
import { validateFolderName } from '../utils/pathValidation'

interface StructureCustomizerProps {
  settings: ProjectSettings
  onUpdateStructure: (config: FolderStructureConfig) => void
}

export const StructureCustomizer: React.FC<StructureCustomizerProps> = ({ settings, onUpdateStructure }) => {
  const currentConfig: FolderStructureConfig = settings.structureConfig || getDefaultStructureConfig()
  const [newFolderName, setNewFolderName] = useState('')
  const [folderError, setFolderError] = useState('')

  const handleAddFolder = () => {
    const name = newFolderName.trim()
    const validation = validateFolderName(name)
    if (!validation.valid) {
      setFolderError(validation.error || 'Enter a valid folder name.')
      return
    }
    const existing = [currentConfig.appsDir, currentConfig.infraDir, currentConfig.packagesDir,
      currentConfig.docsDir, currentConfig.scriptsDir, ...(currentConfig.customFolders || [])]
      .map(folder => folder.toLowerCase())
    if (existing.includes(name.toLowerCase())) {
      setFolderError('This folder is already part of the structure.')
      return
    }
    onUpdateStructure({
      ...currentConfig,
      isCustom: true,
      customFolders: [...(currentConfig.customFolders || []), name]
    })
    setNewFolderName('')
    setFolderError('')
  }

  const handleRemoveFolder = (name: string) => {
    onUpdateStructure({
      ...currentConfig,
      isCustom: true,
      customFolders: (currentConfig.customFolders || []).filter(folder => folder !== name)
    })
  }

  const handleSelectPreset = (presetId: ArchitecturePreset) => {
    const meta = ARCHITECTURE_PRESETS.find(p => p.id === presetId)
    if (!meta) return
    onUpdateStructure({
      ...meta.config,
      isCustom: presetId === 'custom',
      customAppPaths: presetId === 'custom' ? currentConfig.customAppPaths : undefined,
      customFolders: currentConfig.customFolders
    })
  }

  const handleUpdateField = (field: keyof FolderStructureConfig, value: any) => {
    onUpdateStructure({
      ...currentConfig,
      [field]: value,
      isCustom: true
    })
  }

  const handleAppPathOverride = (appId: string, customPath: string) => {
    const newPaths = { ...(currentConfig.customAppPaths || {}) }
    if (!customPath.trim()) {
      delete newPaths[appId]
    } else {
      newPaths[appId] = customPath.trim()
    }
    onUpdateStructure({
      ...currentConfig,
      customAppPaths: newPaths,
      isCustom: true
    })
  }

  return (
    <div className="space-y-6">
      {/* Preset Cards Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-zinc-300" />
              Architecture & Directory Structure Layout
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              {currentConfig.isCustom ? 'Custom Overrides Active' : 'Preset Enforced'}
            </span>
          </div>

          <button
            onClick={() => {
              if (currentConfig.isCustom) {
                const presetConfig = ARCHITECTURE_PRESETS.find(p => p.id === currentConfig.preset)?.config
                if (presetConfig) onUpdateStructure({ ...presetConfig, isCustom: false })
              } else {
                onUpdateStructure({ ...currentConfig, isCustom: true })
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
              currentConfig.isCustom
                ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                : 'bg-surface-900 text-zinc-400 hover:text-white border-surface-700 hover:border-surface-600'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {currentConfig.isCustom ? 'Custom Mode On' : 'Customize Paths'}
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          Choose a battle-tested folder contract (Monorepo, Microservices, DDD, Hexagonal) or customize every root path to your team's specifications.
        </p>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {ARCHITECTURE_PRESETS.map((preset) => {
          const isSelected = currentConfig.preset === preset.id
          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between text-left ${
                isSelected
                  ? 'bg-surface-900 border-zinc-400 ring-1 ring-zinc-400/40 shadow-lg'
                  : 'bg-surface-900/60 border-surface-750 hover:border-surface-650 hover:bg-surface-900'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{preset.icon}</span>
                    <h4 className="text-xs font-bold text-white">{preset.name}</h4>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                  {preset.tagline}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-surface-800 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{preset.config.appsDir}/</span>
                <span className={`px-1.5 py-0.2 rounded border ${preset.badgeColor}`}>
                  {preset.config.databaseIsolation}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Customization Details Panel */}
      {currentConfig.isCustom && (
        <div className="p-4 bg-surface-900 border border-surface-700 rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-800">
            <Sliders className="w-4 h-4 text-zinc-300" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Directory Path Customization
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Apps / Microservices Root:
              </label>
              <input
                type="text"
                value={currentConfig.appsDir}
                onChange={(e) => handleUpdateField('appsDir', e.target.value)}
                placeholder="apps or services"
                className="w-full bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500">e.g. apps, services, domains, backend/services</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Infrastructure / Deploy Root:
              </label>
              <input
                type="text"
                value={currentConfig.infraDir}
                onChange={(e) => handleUpdateField('infraDir', e.target.value)}
                placeholder="infra or deploy"
                className="w-full bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500">e.g. infra, deploy, k8s, docker</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Shared Libraries / Packages Root:
              </label>
              <input
                type="text"
                value={currentConfig.packagesDir}
                onChange={(e) => handleUpdateField('packagesDir', e.target.value)}
                placeholder="packages or shared"
                className="w-full bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500">e.g. packages, shared, libs, core</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Documentation Root:
              </label>
              <input
                type="text"
                value={currentConfig.docsDir}
                onChange={(e) => handleUpdateField('docsDir', e.target.value)}
                placeholder="docs"
                className="w-full bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Scripts & Automation Root:
              </label>
              <input
                type="text"
                value={currentConfig.scriptsDir}
                onChange={(e) => handleUpdateField('scriptsDir', e.target.value)}
                placeholder="scripts"
                className="w-full bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Database Isolation Pattern:
              </label>
              <select
                value={currentConfig.databaseIsolation}
                onChange={(e) => handleUpdateField('databaseIsolation', e.target.value as any)}
                className="w-full bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              >
                <option value="service-isolated">Database-per-Service (Isolated db/ folders)</option>
                <option value="centralized">Centralized (All in infra/docker-compose)</option>
                <option value="hybrid">Hybrid (Isolated relational + Shared cache/broker)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-800">
            <label className="block text-[11px] font-semibold text-zinc-300 mb-2">
              Additional Root Folders:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => { setNewFolderName(e.target.value); setFolderError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddFolder() }}
                placeholder="e.g. configs, data, tools"
                aria-label="Custom folder name"
                className="flex-1 bg-surface-950 border border-surface-700 focus:border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddFolder}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 hover:bg-white transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add folder
              </button>
            </div>
            {folderError && <p className="mt-1.5 text-[11px] text-red-400">{folderError}</p>}
            {(currentConfig.customFolders || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {currentConfig.customFolders?.map(folder => (
                  <span key={folder} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-950 border border-surface-700 text-xs text-zinc-200 font-mono">
                    {folder}/
                    <button type="button" onClick={() => handleRemoveFolder(folder)} aria-label={`Remove ${folder} folder`} className="text-zinc-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-zinc-500">Added folders are created at the project root.</p>
          </div>

          {/* Per-Service Custom Path Overrides */}
          {settings.apps.length > 0 && (
            <div className="pt-3 border-t border-surface-800">
              <label className="block text-[11px] font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                Per-Service Relative Path Overrides (Optional)
              </label>
              <div className="space-y-2">
                {settings.apps.map(app => {
                  const defaultPath = (currentConfig.customAppPaths?.[app.id] || (
                    currentConfig.appDirectories?.[app.role]
                      ? `${currentConfig.appDirectories[app.role]}/${app.folderName}`
                      : `${currentConfig.appsDir}/${app.folderName}`
                  ))
                  const currentPath = currentConfig.customAppPaths?.[app.id] || ''

                  return (
                    <div key={app.id} className="flex items-center gap-3 bg-surface-950 p-2 rounded-lg border border-surface-800 text-xs font-mono">
                      <span className="text-white font-bold w-40 truncate">📦 {app.folderName}</span>
                      <span className="text-zinc-500">→</span>
                      <input
                        type="text"
                        value={currentPath}
                        onChange={(e) => handleAppPathOverride(app.id, e.target.value)}
                        placeholder={defaultPath}
                        className="flex-1 bg-surface-900 border border-surface-700 focus:border-zinc-400 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                      />
                      {currentPath && (
                        <button
                          onClick={() => handleAppPathOverride(app.id, '')}
                          className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 bg-surface-850 rounded"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
