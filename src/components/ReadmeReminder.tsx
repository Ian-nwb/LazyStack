import React, { useState } from 'react'
import { BookOpen, ExternalLink, AlertTriangle } from 'lucide-react'
import { ProjectSettings } from '../types'
import { TECH_CATALOG } from '../data/frameworks'
import { resolveStructurePaths } from '../data/structurePresets'
import { joinPaths } from '../utils/pathValidation'

const DISMISS_KEY = 'lazystack.readmeReminder.dismissed'

export function isReadmeReminderDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Frameworks that need a manual step before their first run, beyond installing packages. */
function setupNote(techId: string, folderName: string): string | null {
  const snake = folderName.split(/[^a-zA-Z0-9]+/).filter(Boolean).join('_').toLowerCase() || 'app'
  switch (techId) {
    case 'dart-flutter': return `Run \`flutter create --project-name ${snake} .\` in the app folder to add the android/, ios/, web/ and desktop platform folders.`
    case 'rust-dioxus': return 'Install the Dioxus CLI (`cargo install dioxus-cli`), then start it with `dx serve`.'
    case 'rust-yew':
    case 'rust-leptos': return 'Install Trunk and the WebAssembly target: `cargo install --locked trunk` and `rustup target add wasm32-unknown-unknown`.'
    case 'rust-bevy': return 'On Linux, install the ALSA, udev, Wayland and xkbcommon development packages before `cargo run`.'
    case 'rust-slint': return 'On Linux, install fontconfig and xkbcommon development packages before `cargo run`.'
    case 'ocaml-dream': return 'Install `pkg-config`, `libev` and OpenSSL headers before `opam install . --deps-only`.'
    case 'python-anvil': return 'Add your Anvil Uplink key to the app\'s .env before connecting.'
    case 'swiftui-client': return 'Open the package in Xcode on macOS to run it.'
    default: return null
  }
}

export const ReadmeReminderModal: React.FC<{
  settings: ProjectSettings
  targetDir: string
  onClose: () => void
}> = ({ settings, targetDir, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const paths = resolveStructurePaths(settings)
  const canOpen = Boolean(window.electronAPI?.openFolder)
  const open = (file: string) => window.electronAPI?.openFolder?.(file)

  const apps = settings.apps.map(app => {
    const rel = paths.getAppRelativePath(app.folderName, app.id, app.role)
    const readme = joinPaths(joinPaths(targetDir, rel), 'README.md')
    const tech = TECH_CATALOG.find(item => item.id === app.techId)
    return { app, rel, readme, techName: tech?.name || app.techId, note: setupNote(app.techId, app.folderName), tools: (tech?.requires || []).map(req => req.label) }
  })

  const close = () => {
    if (dontShowAgain) {
      try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* storage unavailable */ }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="readme-reminder-title">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-xl rounded-xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-surface-950 border border-surface-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 id="readme-reminder-title" className="text-sm font-bold text-white uppercase tracking-wider">Read the READMEs before running</h3>
            <p className="text-xs text-zinc-400">Each app has its own README with the exact setup, run, test and build commands for its framework.</p>
          </div>
        </div>

        <div className="overflow-auto space-y-2 text-xs flex-1">
          <div className="flex items-center gap-2 bg-surface-950 border border-surface-700 rounded-lg px-3 py-2">
            <span className="font-semibold text-zinc-100">Project overview</span>
            <span className="font-mono text-zinc-500 truncate">README.md</span>
            {canOpen && <button onClick={() => open(joinPaths(targetDir, 'README.md'))} className="ml-auto text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"><ExternalLink className="w-3 h-3" />Open</button>}
          </div>
          {apps.map(({ app, rel, readme, techName, note, tools }) => (
            <div key={app.id} className="bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100">{app.folderName}</span>
                <span className="text-zinc-500">{techName}</span>
                {canOpen && <button onClick={() => open(readme)} className="ml-auto text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"><ExternalLink className="w-3 h-3" />Open</button>}
              </div>
              <div className="font-mono text-zinc-500 truncate">{rel}/README.md</div>
              {tools.length > 0 && <div className="text-zinc-400">Needs: {tools.join(', ')}</div>}
              {note && (
                <div className="flex gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input type="checkbox" checked={dontShowAgain} onChange={event => setDontShowAgain(event.target.checked)} />
            Don't show this again
          </label>
          <button onClick={close} autoFocus className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer">Got it</button>
        </div>
      </div>
    </div>
  )
}
