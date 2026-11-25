import React from 'react'
import { ExternalLink } from 'lucide-react'
import { CartApp, HostingType, ProjectSettings } from '../types'
import { BEFORE_YOU_PICK, HOSTING_CREDIT, HOSTING_OPTIONS, VPS_VS_CLOUD_VM_NOTE, isHostingType } from '../data/hosting'
import { generatedFileLabel, hostingLabel, planHosting, resolveGeneratedFiles } from '../utils/hostingPlanner'

interface HostingPlannerProps {
  settings: ProjectSettings
  onUpdateApp?: (id: string, updates: Partial<CartApp>) => void
}

const USE_SUGGESTION = '__suggested__'

/** Blueprint "Hosting" tab: where each app runs (local by default) and what the planner suggests. Advice only. */
export const HostingPlanner: React.FC<HostingPlannerProps> = ({ settings, onUpdateApp }) => {
  const plan = planHosting(settings)

  const choose = (app: CartApp, value: string, suggested: HostingType | null) => {
    if (!onUpdateApp) return
    // `local` is the default, so it is stored as "no hosting field" and old blueprints stay unchanged.
    const next = value === USE_SUGGESTION ? suggested ?? undefined : isHostingType(value) ? value : undefined
    onUpdateApp(app.id, { hosting: next === 'local' ? undefined : next })
  }

  return (
    <div className="space-y-6 font-sans">
      <p className="text-xs text-zinc-400 max-w-3xl">
        Every app is <span className="text-white font-semibold">local only</span> until you choose where it runs. The suggestion comes from
        each app&apos;s role, framework and connections. It&apos;s advice only: choosing a type saves it in the blueprint and in
        <span className="font-mono text-zinc-300"> docs/hosting.md</span>, and doesn&apos;t change the generated deploy files.
      </p>

      <div className="space-y-3">
        {plan.apps.map(item => {
          const onDevice = item.suggestion.type === null
          return (
            <section key={item.app.id} className="bg-surface-900 border border-surface-700 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white font-mono">{item.app.folderName}</h3>
                  <p className="text-[11px] text-zinc-500">{item.tech?.name || item.app.techId} · {item.app.role}</p>
                </div>
                {onDevice && !item.override ? (
                  <span className="text-[11px] text-zinc-400 border border-surface-700 rounded px-2 py-1">Runs on the user&apos;s device</span>
                ) : (
                  <label className="text-[11px] text-zinc-400 flex items-center gap-2">
                    Hosting
                    <select
                      value={item.override ?? 'local'}
                      onChange={event => choose(item.app, event.target.value, item.suggestion.type)}
                      disabled={!onUpdateApp}
                      className="rounded border border-surface-700 bg-surface-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                    >
                      {item.suggestion.type && item.suggestion.type !== (item.override ?? 'local') && (
                        <option value={USE_SUGGESTION}>Use suggestion ({hostingLabel(item.suggestion.type)})</option>
                      )}
                      {HOSTING_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>{option.label}{option.id === 'local' ? ' (default)' : ''}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Suggested</h4>
                  <p className="text-white font-semibold">{hostingLabel(item.suggestion.type)}</p>
                  <ul className="mt-1 space-y-0.5 text-zinc-400">
                    {item.suggestion.reasons.map(reason => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Alternatives</h4>
                  {item.suggestion.alternatives.length ? (
                    <ul className="space-y-1 text-zinc-400">
                      {item.suggestion.alternatives.map(alt => (
                        <li key={alt.type}><span className="text-zinc-200">{hostingLabel(alt.type)}</span>: {alt.why}</li>
                      ))}
                    </ul>
                  ) : <p className="text-zinc-500">None</p>}
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                    {item.effective ? `Files for ${hostingLabel(item.effective)}` : 'Files'}
                  </h4>
                  {item.files.length ? (
                    <ul className="space-y-0.5 text-zinc-400">
                      {item.files.map(file => (
                        <li key={file.kind}>{file.label}{file.path && <span className="font-mono text-zinc-300"> {file.path}</span>}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500">{item.effective ? 'Nothing generated for this type; follow the provider’s setup.' : 'Packaged by its own tooling (see the app README).'}</p>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 mb-2">Stack notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
          {plan.notes.map(note => <li key={note}>{note}</li>)}
        </ul>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 mb-2">Hosting types</h3>
        <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-950 text-zinc-400 text-[11px] uppercase">
                <th className="p-3">Type</th>
                <th className="p-3">Good for</th>
                <th className="p-3">Watch out for</th>
                <th className="p-3">Examples</th>
                <th className="p-3">Upkeep</th>
                <th className="p-3">LazyStack files</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700 text-zinc-400 align-top">
              {HOSTING_OPTIONS.map(option => {
                const files = resolveGeneratedFiles(option.id, settings)
                return (
                  <tr key={option.id} className="hover:bg-surface-850">
                    <td className="p-3">
                      <div className="font-semibold text-white">{option.label}</div>
                      <div className="text-[11px] text-zinc-500">{option.summary}</div>
                    </td>
                    <td className="p-3">{option.goodFor.join('; ')}</td>
                    <td className="p-3">{option.watchOutFor.join('; ')}</td>
                    <td className="p-3">{option.examples.join(', ')}</td>
                    <td className="p-3 capitalize">{option.upkeep}</td>
                    <td className="p-3">{files.length ? files.map(file => generatedFileLabel(file.kind)).join(', ') : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400"><span className="text-zinc-200 font-semibold">VPS vs cloud VM.</span> {VPS_VS_CLOUD_VM_NOTE}</p>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300 mb-2">Before you pick</h3>
        <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
          {BEFORE_YOU_PICK.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <p className="text-[11px] text-zinc-500">
        <a href={HOSTING_CREDIT.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-400 hover:text-white underline underline-offset-2">
          {HOSTING_CREDIT.text} <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  )
}
