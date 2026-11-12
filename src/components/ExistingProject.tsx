import React from 'react'
import { AlertTriangle, FilePlus2, FileCog, FileX2, FolderOpen, GitMerge, Loader2, X } from 'lucide-react'
import type { DetectedApp } from '../../electron/project/importer'
import type { ScaffoldChanges } from '../../electron/scaffolding/writer'
import { TECH_CATALOG } from '../data/frameworks'

export interface ExistingProjectInfo {
  dir: string
  source: 'blueprint' | 'detected'
  detected: DetectedApp[]
  unrecognized: string[]
  warnings: string[]
}

export const ExistingProjectBanner: React.FC<{ info: ExistingProjectInfo; onClose: () => void }> = ({ info, onClose }) => {
  const techName = (id: string) => TECH_CATALOG.find(tech => tech.id === id)?.name || id
  return (
    <div className="px-3 sm:px-6 py-2.5 border-b border-surface-700 bg-surface-950 text-xs flex items-start gap-3">
      <FolderOpen className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-zinc-200">
          <span className="font-bold text-white">Editing existing project</span>
          <span className="font-mono text-zinc-400 ml-2 break-all">{info.dir}</span>
          <span className="ml-2 text-zinc-500">
            {info.source === 'blueprint' ? '· loaded from lazystack.json' : `· ${info.detected.length} app${info.detected.length === 1 ? '' : 's'} detected`}
          </span>
        </div>
        {info.source === 'detected' && info.detected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {info.detected.map(app => (
              <span key={app.path} title={app.evidence} className="px-2 py-0.5 rounded border border-surface-700 text-zinc-300 font-mono">
                {app.path} → {techName(app.techId)}
                {app.confidence !== 'high' && <span className="text-amber-300 ml-1">({app.confidence})</span>}
              </span>
            ))}
          </div>
        )}
        {[...info.warnings, ...(info.unrecognized.length ? [`Not recognized: ${info.unrecognized.join(', ')}`] : [])].map(message => (
          <div key={message} className="flex items-center gap-1.5 text-amber-300">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{message}</span>
          </div>
        ))}
        <div className="text-zinc-500">
          Existing app folders are never modified. New apps, Compose services and configuration are added; regenerated infrastructure files are backed up to <code>.lazystack/backup/</code> first.
        </div>
      </div>
      <button onClick={onClose} title="Close project and start a new one" className="p-1 rounded hover:bg-surface-800 text-zinc-400 hover:text-white cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

const Section: React.FC<{ title: string; icon: React.ReactNode; items: string[]; tone: string }> = ({ title, icon, items, tone }) =>
  items.length === 0 ? null : (
    <div>
      <div className={`flex items-center gap-1.5 font-bold mb-1 ${tone}`}>
        {icon}
        {title} ({items.length})
      </div>
      <ul className="font-mono text-[11px] text-zinc-400 space-y-0.5 max-h-40 overflow-auto pl-5">
        {items.map(item => <li key={item} className="break-all">{item}</li>)}
      </ul>
    </div>
  )

export const ChangePlanModal: React.FC<{
  plan: ScaffoldChanges
  applying: boolean
  onConfirm: () => void
  onCancel: () => void
}> = ({ plan, applying, onConfirm, onCancel }) => {
  const total = plan.created.length + plan.updated.length + plan.merged.length
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-2xl rounded-xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Review changes</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-4">
          {total === 0 ? 'The project already matches this blueprint. Nothing will be written.' : `${total} file${total === 1 ? '' : 's'} will change. Files you wrote are not overwritten.`}
        </p>
        <div className="space-y-3 overflow-auto text-xs flex-1">
          <Section title="New files" icon={<FilePlus2 className="w-3.5 h-3.5" />} items={plan.created} tone="text-emerald-300" />
          <Section title="Regenerated (originals backed up)" icon={<FileCog className="w-3.5 h-3.5" />} items={plan.updated} tone="text-sky-300" />
          <Section title="Environment keys appended" icon={<GitMerge className="w-3.5 h-3.5" />} items={plan.merged} tone="text-violet-300" />
          <Section title="Left untouched" icon={<FileX2 className="w-3.5 h-3.5" />} items={plan.skipped} tone="text-zinc-400" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} disabled={applying} className="px-4 py-2 rounded-lg text-xs font-semibold border border-surface-700 text-zinc-300 hover:text-white cursor-pointer">Cancel</button>
          <button onClick={onConfirm} disabled={applying || total === 0} className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
            {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Apply changes
          </button>
        </div>
      </div>
    </div>
  )
}
