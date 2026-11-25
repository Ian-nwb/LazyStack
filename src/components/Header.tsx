import React, { useEffect, useState } from 'react'
import { Terminal, Cpu, HardDrive, Trash2, Sun, Moon, FolderOpen, ArrowUpCircle } from 'lucide-react'
import { LazyStackMark } from './LazyStackMark'

interface HeaderProps {
  onClearAll: () => void
  onOpenExisting?: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

interface UpdateInfo { current: string; latest?: string; url?: string; updateAvailable: boolean }

/** Asks GitHub Releases (via the main process, or the dev server) whether a newer LazyStack exists. */
function useUpdateCheck(): UpdateInfo | null {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  useEffect(() => {
    let cancelled = false
    const check = window.electronAPI?.checkForUpdate
      ? window.electronAPI.checkForUpdate()
      : fetch('/api/check-update').then(res => (res.ok ? res.json() : null))
    check.then(result => { if (!cancelled && result) setInfo(result) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  return info
}

export const Header: React.FC<HeaderProps> = ({ onClearAll, onOpenExisting, theme, onToggleTheme }) => {
  const update = useUpdateCheck()
  const openRelease = () => {
    if (!update?.url) return
    if (window.electronAPI?.openReleasePage) window.electronAPI.openReleasePage(update.url)
    else window.open(update.url, '_blank', 'noopener')
  }
  return (
    <header className="min-h-14 px-3 sm:px-6 py-2 gap-2 border-b border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold shadow-sm dark:bg-white dark:text-zinc-950">
          <LazyStackMark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">LazyStack</h1>
        </div>
        {update?.updateAvailable && (
          <button
            onClick={openRelease}
            title={`You have ${update.current}. Open the v${update.latest} release page to download it.`}
            className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowUpCircle className="w-3 h-3" />
            v{update.latest} available
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onOpenExisting && (
          <button
            onClick={onOpenExisting}
            title="Open an existing project folder to view its diagram and add to it"
            className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 hover:text-white transition font-medium text-xs flex items-center gap-1.5 cursor-pointer border border-surface-700"
          >
            <FolderOpen className="w-3 h-3" />
            Open Existing Project
          </button>
        )}

        {/* Clear All */}
        <button 
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 hover:text-white transition font-medium text-xs flex items-center gap-1.5 cursor-pointer border border-surface-700"
        >
          <Trash2 className="w-3 h-3" />
          Clear All
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-surface-700"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  )
}
