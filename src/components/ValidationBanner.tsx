import React from 'react'
import { AlertCircle, CheckCircle2, Rocket } from 'lucide-react'
import { ProjectSettings } from '../types'

interface ValidationBannerProps {
  settings: ProjectSettings
  onGenerate: () => void
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({ settings, onGenerate }) => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate Project Name
  if (!settings.projectName.trim()) {
    errors.push('Project name cannot be empty')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(settings.projectName)) {
    errors.push('Project name contains invalid characters')
  }

  // Validate Apps
  if (settings.apps.length === 0) {
    warnings.push('No applications in cart. Add at least one app before generating.')
  }

  // Check duplicate folder names
  const folderNames = settings.apps.map(a => a.folderName)
  const duplicateFolders = folderNames.filter((item, index) => folderNames.indexOf(item) !== index)
  if (duplicateFolders.length > 0) {
    errors.push(`Duplicate app folder name: ${Array.from(new Set(duplicateFolders)).join(', ')}`)
  }

  // Check port collisions
  const usedPorts: { [port: number]: string[] } = {}
  settings.apps.forEach(a => {
    if (a.port > 0) {
      usedPorts[a.port] = usedPorts[a.port] || []
      usedPorts[a.port].push(`app '${a.folderName}'`)
    }
  })
  settings.databases.filter(d => d.enabled && d.port > 0).forEach(d => {
    usedPorts[d.port] = usedPorts[d.port] || []
    usedPorts[d.port].push(`database '${d.type}'`)
  })
  if (settings.proxy.type !== 'none' && settings.proxy.httpPort > 0) {
    usedPorts[settings.proxy.httpPort] = usedPorts[settings.proxy.httpPort] || []
    usedPorts[settings.proxy.httpPort].push(`proxy gateway`)
  }

  Object.entries(usedPorts).forEach(([port, names]) => {
    if (names.length > 1) {
      errors.push(`Port ${port} collision between ${names.join(' and ')}`)
    }
  })

  const isValid = errors.length === 0 && settings.apps.length > 0

  return (
    <div className="h-14 px-6 border-t border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {errors.length > 0 ? (
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-bold text-white">{errors.length} Issue{errors.length > 1 ? 's' : ''}:</span>
            <span className="truncate max-w-md text-zinc-400">{errors[0]}</span>
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
          <span>Scaffold Monorepo</span>
        </button>
      </div>
    </div>
  )
}
