import React, { useState } from 'react'
import { AlertTriangle, BookOpen, ExternalLink, Wrench } from 'lucide-react'
import { ProjectSettings } from '../types'
import { TECH_CATALOG } from '../data/frameworks'
import { DATABASE_CATALOG } from '../data/databases'
import { resolveStructurePaths } from '../data/structurePresets'
import { getAppManualSetup, getDatabaseManualSetup, ManualSetup } from '../data/manualSetup'
import { joinPaths } from '../utils/pathValidation'

const DISMISS_KEY = 'lazystack.readmeReminder.dismissed'

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** True when the post-scaffold popup should open for this stack. Manual-setup stacks always show it. */
export function shouldShowReadmeReminder(settings: ProjectSettings): boolean {
  return hasManualSetup(settings) || !isDismissed()
}

export function hasManualSetup(settings: ProjectSettings): boolean {
  return settings.apps.some(app => getAppManualSetup(app)) || settings.databases.some(db => db.enabled && getDatabaseManualSetup(db))
}

/** Renders `code` spans for text wrapped in backticks. */
const StepText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(`[^`]+`)/g).map((part, index) =>
      part.startsWith('`') && part.endsWith('`')
        ? <code key={index} className="px-1 py-0.5 rounded bg-black/40 text-zinc-100 font-mono text-[11px] break-all select-all">{part.slice(1, -1)}</code>
        : <React.Fragment key={index}>{part}</React.Fragment>
    )}
  </>
)

const OpenButton: React.FC<{ path: string; label?: string }> = ({ path, label = 'README' }) =>
  window.electronAPI?.openFolder
    ? <button onClick={() => window.electronAPI?.openFolder?.(path)} className="ml-auto shrink-0 text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"><ExternalLink className="w-3 h-3" />{label}</button>
    : null

const SetupCard: React.FC<{ title: string; subtitle: string; location?: string; readme?: string; setup: ManualSetup }> = ({ title, subtitle, location, readme, setup }) => (
  <div className="bg-amber-950/20 border border-amber-700/40 rounded-lg px-3 py-2.5 space-y-1.5">
    <div className="flex items-center gap-2">
      <Wrench className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span className="font-semibold text-zinc-100">{title}</span>
      <span className="text-zinc-400 truncate">{subtitle}</span>
      {readme && <OpenButton path={readme} />}
    </div>
    {location && <div className="font-mono text-zinc-500 truncate pl-5">{location}</div>}
    <div className="text-zinc-400 pl-5">{setup.reason}</div>
    <ol className="list-decimal pl-10 space-y-1 text-zinc-200">
      {setup.steps.map(step => <li key={step}><StepText text={step} /></li>)}
    </ol>
    {setup.docs && <div className="pl-5 text-zinc-500 break-all">Docs: {setup.docs}</div>}
  </div>
)

export const ReadmeReminderModal: React.FC<{
  settings: ProjectSettings
  targetDir: string
  onClose: () => void
}> = ({ settings, targetDir, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const paths = resolveStructurePaths(settings)

  const apps = settings.apps.map(app => {
    const rel = paths.getAppRelativePath(app.folderName, app.id, app.role)
    const tech = TECH_CATALOG.find(item => item.id === app.techId)
    return {
      app,
      rel,
      readme: joinPaths(joinPaths(targetDir, rel), 'README.md'),
      techName: tech?.name || app.techId,
      tools: (tech?.requires || []).map(req => req.label),
      setup: getAppManualSetup(app)
    }
  })
  const cloudDbs = settings.databases
    .filter(db => db.enabled)
    .map(db => ({ db, setup: getDatabaseManualSetup(db), name: db.customName || DATABASE_CATALOG.find(item => item.id === db.type)?.name || db.type }))
    .filter(item => item.setup)
  const manualApps = apps.filter(item => item.setup)
  const otherApps = apps.filter(item => !item.setup)
  const manualCount = manualApps.length + cloudDbs.length
  const needsSetup = manualCount > 0

  const close = () => {
    if (dontShowAgain) {
      try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* storage unavailable */ }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="readme-reminder-title">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-2xl rounded-xl p-6 shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 shrink-0 rounded-lg border flex items-center justify-center ${needsSetup ? 'bg-amber-950/40 border-amber-700/50' : 'bg-surface-950 border-surface-700'}`}>
            {needsSetup ? <AlertTriangle className="w-5 h-5 text-amber-300" /> : <BookOpen className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h3 id="readme-reminder-title" className="text-sm font-bold text-white uppercase tracking-wider">
              {needsSetup ? `${manualCount} of your choices need${manualCount === 1 ? 's' : ''} manual setup` : 'Read the READMEs before running'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {needsSetup
                ? 'LazyStack generated these, but they need a step it cannot do for you: a platform tool, a system library, an account or a secret. Do these before the first run; each README has the details.'
                : 'Each app has its own README with the exact setup, run, test and build commands for its framework.'}
            </p>
          </div>
        </div>

        <div className="overflow-auto space-y-2 text-xs flex-1 pr-1">
          {manualApps.map(({ app, rel, readme, techName, setup }) => (
            <SetupCard key={app.id} title={app.folderName} subtitle={techName} location={`${rel}/`} readme={readme} setup={setup!} />
          ))}
          {cloudDbs.map(({ db, name, setup }) => (
            <SetupCard key={db.id || db.type} title={name} subtitle="Cloud database" location=".env" setup={setup!} />
          ))}

          {needsSetup && otherApps.length > 0 && (
            <div className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Ready to run (see their READMEs)</div>
          )}
          <div className="flex items-center gap-2 bg-surface-950 border border-surface-700 rounded-lg px-3 py-2">
            <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-semibold text-zinc-100">Project overview</span>
            <span className="font-mono text-zinc-500 truncate">README.md</span>
            <OpenButton path={joinPaths(targetDir, 'README.md')} />
          </div>
          {otherApps.map(({ app, rel, readme, techName, tools }) => (
            <div key={app.id} className="bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100">{app.folderName}</span>
                <span className="text-zinc-500 truncate">{techName}</span>
                <OpenButton path={readme} />
              </div>
              <div className="font-mono text-zinc-500 truncate">{rel}/README.md</div>
              {tools.length > 0 && <div className="text-zinc-400">Needs: {tools.join(', ')}</div>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 gap-4">
          {needsSetup ? (
            <span className="text-[11px] text-zinc-500">Shown whenever a stack includes frameworks that need manual setup.</span>
          ) : (
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input type="checkbox" checked={dontShowAgain} onChange={event => setDontShowAgain(event.target.checked)} />
              Don't show this again
            </label>
          )}
          <button onClick={close} autoFocus className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer shrink-0">
            {needsSetup ? 'I\'ll do these' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}
