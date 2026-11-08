import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CircleSlash, Loader2, X } from 'lucide-react'
import type { InstallProgressEvent, InstallResultSummary, InstallStep, InstallStepResult } from '../../electron/environment/dependencies'

export interface InstallState {
  running: boolean
  steps: InstallStep[]
  current?: { step: InstallStep; index: number; total: number }
  results: InstallStepResult[]
  lines: string[]
  startedAt: number
  summary?: InstallResultSummary
}

export const initialInstallState = (): InstallState => ({ running: true, steps: [], results: [], lines: [], startedAt: Date.now() })

const MAX_LINES = 200

/** Folds one streamed progress event into the UI state. */
export function reduceInstallEvent(state: InstallState, event: InstallProgressEvent): InstallState {
  switch (event.type) {
    case 'plan':
      return { ...state, steps: event.steps }
    case 'step-start':
      return { ...state, current: { step: event.step, index: event.index, total: event.total }, lines: [...state.lines, `$ ${event.step.command}   (${event.step.dir})`].slice(-MAX_LINES) }
    case 'output':
      return { ...state, lines: [...state.lines, event.line].slice(-MAX_LINES) }
    case 'step-end':
      return { ...state, results: [...state.results, event.result] }
    case 'done':
      return { ...state, running: false, current: undefined, summary: event.result, results: event.result.steps.length ? event.result.steps : state.results }
  }
}

const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

const StatusIcon: React.FC<{ status: InstallStepResult['status'] }> = ({ status }) =>
  status === 'ok' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    : status === 'skipped' ? <CircleSlash className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      : <X className="w-3.5 h-3.5 text-red-400 shrink-0" />

export const InstallProgressPanel: React.FC<{ state: InstallState; onDismiss: () => void }> = ({ state, onDismiss }) => {
  const [now, setNow] = useState(Date.now())
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!state.running) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [state.running])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [state.lines.length])

  const total = state.current?.total ?? state.steps.length
  const completed = state.results.length
  const percent = total ? Math.round((completed / total) * 100) : 0
  const failed = state.results.filter(result => result.status === 'failed')
  const skipped = state.results.filter(result => result.status === 'skipped')

  return (
    <div className="mt-4 bg-surface-950 border border-surface-700 rounded-lg p-3 text-xs space-y-3" aria-live="polite">
      {state.running ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-200">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
            <span className="font-semibold">
              {state.current
                ? `Installing ${state.current.index + 1} of ${state.current.total}: ${state.current.step.label}`
                : 'Scanning project for package manifests…'}
            </span>
            <span className="ml-auto font-mono text-zinc-500">{formatDuration(now - state.startedAt)}</span>
          </div>
          {state.current && <div className="font-mono text-zinc-500 truncate">{state.current.step.dir} · {state.current.step.command}</div>}
          <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${Math.max(percent, state.current ? 4 : 0)}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {state.summary?.success && !skipped.length ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
          <span className="font-semibold text-zinc-100">
            {state.summary?.error && !state.results.length
              ? state.summary.error
              : failed.length
                ? `${failed.length} step${failed.length === 1 ? '' : 's'} failed`
                : skipped.length
                  ? `Installed with ${skipped.length} step${skipped.length === 1 ? '' : 's'} skipped (missing tools)`
                  : 'All packages installed'}
          </span>
          <span className="ml-auto font-mono text-zinc-500">{formatDuration(now - state.startedAt)}</span>
          <button onClick={onDismiss} className="text-zinc-500 hover:text-white cursor-pointer" title="Hide"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {state.results.length > 0 && (
        <ul className="space-y-1">
          {state.results.map(result => (
            <li key={result.id}>
              <div className="flex items-center gap-2 text-zinc-300">
                <StatusIcon status={result.status} />
                <span>{result.label}</span>
                <span className="font-mono text-zinc-500 truncate">{result.dir}</span>
                {result.durationMs > 0 && <span className="ml-auto font-mono text-zinc-600">{formatDuration(result.durationMs)}</span>}
              </div>
              {result.message && <div className={`pl-5 ${result.status === 'failed' ? 'text-red-300' : 'text-amber-300'}`}>{result.message}</div>}
              {result.output && (
                <details className="pl-5">
                  <summary className="text-zinc-500 cursor-pointer">Show output</summary>
                  <pre className="mt-1 max-h-40 overflow-auto font-mono text-[10px] text-zinc-400 whitespace-pre-wrap">{result.output}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {state.running && state.lines.length > 0 && (
        <pre ref={logRef} className="max-h-32 overflow-auto font-mono text-[10px] text-zinc-500 whitespace-pre-wrap bg-black/30 rounded p-2">
          {state.lines.slice(-60).join('\n')}
        </pre>
      )}
    </div>
  )
}
