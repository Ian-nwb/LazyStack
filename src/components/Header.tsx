import React from 'react'
import { Layers, Terminal, Cpu, HardDrive, Trash2, Sun, Moon } from 'lucide-react'

interface HeaderProps {
  onClearAll: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export const Header: React.FC<HeaderProps> = ({ onClearAll, theme, onToggleTheme }) => {
  return (
    <header className="h-14 px-6 border-b border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold shadow-sm dark:bg-white dark:text-zinc-950">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">LazyStack</h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
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
