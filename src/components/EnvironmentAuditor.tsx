import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, Download, ShieldAlert } from 'lucide-react'
import { BinaryAudit } from '../../electron/environment/auditor'

export const EnvironmentAuditor: React.FC = () => {
  const [audits, setAudits] = useState<BinaryAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  const runAudit = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      if (window.electronAPI?.auditEnvironment) {
        const results = await window.electronAPI.auditEnvironment()
        setAudits(results)
      } else {
        // Query real host environment audit from Vite dev server API
        const response = await fetch('/api/audit')
        const results = await response.json()
        if (Array.isArray(results)) {
          setAudits(results)
        }
      }
    } catch (err: any) {
      console.error('Audit error:', err)
      setStatusMessage({ text: `Host audit failed: ${err.message || 'Unable to scan host environment'}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runAudit()
  }, [])

  const handleInstall = async (id: string) => {
    setInstallingId(id)
    setStatusMessage(null)

    try {
      let res: any
      if (window.electronAPI?.installBinary) {
        res = await window.electronAPI.installBinary(id)
      } else {
        const response = await fetch('/api/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ binaryId: id })
        })
        res = await response.json()
      }

      if (res?.success) {
        setStatusMessage({ text: res.message, type: 'success' })
        await runAudit()
      } else {
        setStatusMessage({ text: res?.message || 'Installation failed', type: 'error' })
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' })
    } finally {
      setInstallingId(null)
    }
  }

  const installedCount = audits.filter(a => a.installed).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
      {/* Action Header */}
      <div className="px-6 py-4 border-b border-surface-700 bg-surface-900 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Host Environment Diagnostics</h2>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-medium border border-zinc-700">
              {installedCount} of {audits.length} Available
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit installed compilers (NASM, GCC, Zig), runtimes, and Docker availability on host machine.
          </p>
        </div>

        <button
          onClick={runAudit}
          disabled={loading}
          className="px-3.5 py-2 bg-surface-850 hover:bg-surface-800 text-zinc-200 rounded-lg border border-surface-700 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          Re-Audit Host
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
          statusMessage.type === 'success'
            ? 'bg-zinc-900 border-zinc-600 text-zinc-200'
            : 'bg-zinc-900 border-zinc-500 text-zinc-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-zinc-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Auditor Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {audits.map(item => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition flex items-center justify-between ${
              item.installed
                ? 'bg-surface-900 border-surface-700'
                : 'bg-surface-900/50 border-surface-750'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                item.installed ? 'bg-zinc-950 text-white border-zinc-700' : 'bg-surface-950 text-zinc-600 border-surface-800'
              }`}>
                {item.installed ? <CheckCircle2 className="w-5 h-5 text-white" /> : <ShieldAlert className="w-5 h-5 text-zinc-500" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-950 text-zinc-400 border border-surface-700 capitalize">
                    {item.category}
                  </span>
                </div>
                {item.installed ? (
                  <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5" title={item.version}>
                    {item.version}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Binary <code className="font-mono text-zinc-400">{item.binary}</code> not in PATH
                  </p>
                )}
              </div>
            </div>

            {!item.installed && (
              <button
                onClick={() => handleInstall(item.id)}
                disabled={installingId === item.id}
                className="px-3 py-1.5 bg-zinc-200 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0 ml-3 cursor-pointer shadow-sm"
              >
                {installingId === item.id ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-zinc-950" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 text-zinc-950" />
                    Auto-Install
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
