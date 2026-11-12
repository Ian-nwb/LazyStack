import React, { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { ProjectSettings } from '../types'
import { validateFolderName, validatePath } from '../utils/pathValidation'
import { applyPortSuggestions, collectPortUses, describePortConflict, findPortConflicts, findReservedPortWarnings } from '../utils/portCheck'

interface ValidationBannerProps {
  settings: ProjectSettings
  onGenerate: () => void
  /** Overrides the action label (e.g. when applying changes to an existing project). */
  generateLabel?: string
  /** Receives the blueprint with each conflicting port moved to the suggested free port. */
  onApplyPortFixes?: (next: ProjectSettings) => void
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({ settings, onGenerate, generateLabel, onApplyPortFixes }) => {
  const [machineWarnings, setMachineWarnings] = useState<string[]>([])
  const [probing, setProbing] = useState(false)
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Validate Project Name
  const nameVal = validateFolderName(settings.projectName, 'project')
  if (!nameVal.valid) {
    errors.push(nameVal.error || 'Project name is invalid')
  }

  // 2. Validate Parent Directory Location
  const pathVal = validatePath(settings.parentDir)
  if (!pathVal.valid) {
    errors.push(`Parent location: ${pathVal.error}`)
  }

  // 3. Validate App Folder Names
  settings.apps.forEach(app => {
    const appVal = validateFolderName(app.folderName, 'app')
    if (!appVal.valid) {
      errors.push(`App folder '${app.folderName || 'unnamed'}': ${appVal.error}`)
    }
  })

  // 4. Validate Apps count
  if (settings.apps.length === 0) {
    warnings.push('No applications in stack. Add at least one service before generating.')
  }

  // 5. Check duplicate folder names
  const folderNames = settings.apps.map(a => a.folderName?.trim().toLowerCase()).filter(Boolean)
  const duplicateFolders = folderNames.filter((item, index) => folderNames.indexOf(item) !== index)
  if (duplicateFolders.length > 0) {
    errors.push(`Duplicate app folder name: ${Array.from(new Set(duplicateFolders)).join(', ')}`)
  }

  // 6. Port collisions across apps, databases (and their fixed extra ports), admin UIs and the proxy
  const portConflicts = findPortConflicts(settings)
  portConflicts.forEach(conflict => errors.push(describePortConflict(conflict)))
  findReservedPortWarnings(settings).forEach(warning => warnings.push(warning))
  if (machineWarnings.length > 0) warnings.push(...machineWarnings)

  const checkMachine = async () => {
    setProbing(true)
    try {
      const uses = collectPortUses(settings)
      const ports = uses.map(use => use.port)
      const probes: Array<{ port: number; inUse: boolean; process?: string }> = window.electronAPI?.checkPorts
        ? await window.electronAPI.checkPorts(ports)
        : await (await fetch('/api/ports', { method: 'POST', body: JSON.stringify(ports) })).json()
      const busy = probes.filter(probe => probe.inUse)
      setMachineWarnings(busy.map(probe => `Port ${probe.port} (${uses.filter(use => use.port === probe.port).map(use => use.owner).join(', ')}) is already in use on this machine${probe.process ? ` by ${probe.process}` : ''}.`))
      if (busy.length === 0) setMachineWarnings(['All blueprint ports are free on this machine.'])
    } catch {
      setMachineWarnings(['Could not check ports on this machine.'])
    } finally {
      setProbing(false)
    }
  }

  const isValid = errors.length === 0 && settings.apps.length > 0

  return (
    <div className="h-14 px-6 border-t border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {errors.length > 0 ? (
          <div className="flex items-center gap-2 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold text-rose-200">{errors.length} Issue{errors.length > 1 ? 's' : ''}:</span>
            <span className="truncate max-w-xl text-rose-300" title={errors.join(' | ')}>{errors[0]}</span>
          </div>
        ) : warnings.length > 0 ? (
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-bold text-white">Notice:</span>
            <span className="truncate max-w-md text-zinc-400">{warnings[0]}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span className="font-bold text-white">Blueprint Validated:</span>
            <span className="text-zinc-400">
              {settings.apps.length} apps, {settings.databases.filter(d => d.enabled).length} databases, {settings.proxy.type} gateway
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {portConflicts.length > 0 && onApplyPortFixes && (
          <button
            onClick={() => onApplyPortFixes(applyPortSuggestions(settings, portConflicts))}
            className="px-3 py-2 rounded-lg font-semibold text-xs border border-surface-600 text-zinc-200 hover:bg-surface-800 transition cursor-pointer"
          >
            Auto-fix ports
          </button>
        )}
        <button
          onClick={checkMachine}
          disabled={probing}
          className="px-3 py-2 rounded-lg font-semibold text-xs border border-surface-600 text-zinc-300 hover:bg-surface-800 transition cursor-pointer disabled:opacity-60"
          title="Check whether the ports in this blueprint are free on this machine"
        >
          {probing ? 'Checking...' : 'Check ports'}
        </button>
        <button
          onClick={onGenerate}
          disabled={!isValid}
          className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm ${
            isValid
              ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 active:scale-95'
              : 'bg-surface-850 text-zinc-500 border border-surface-700 cursor-not-allowed opacity-90'
          }`}
        >
          <span className="text-sm select-none shrink-0" role="img" aria-label="rocket">🚀</span>
          <span>{generateLabel || 'Scaffold Monorepo'}</span>
        </button>
      </div>
    </div>
  )
}
