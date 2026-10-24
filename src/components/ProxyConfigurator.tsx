import React from 'react'
import { Globe, ArrowRight, Check, Server, Monitor } from 'lucide-react'
import { ProxyConfig, ProxyType, CartApp } from '../types'

interface ProxyConfiguratorProps {
  proxy: ProxyConfig
  setProxy: React.Dispatch<React.SetStateAction<ProxyConfig>>
  apps: CartApp[]
  setApps: React.Dispatch<React.SetStateAction<CartApp[]>>
}

export const ProxyConfigurator: React.FC<ProxyConfiguratorProps> = ({
  proxy,
  setProxy,
  apps,
  setApps
}) => {
  const updateRoutePrefix = (appId: string, prefix: string) => {
    setApps(apps.map(a => a.id === appId ? { ...a, routePrefix: prefix } : a))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-700 bg-surface-900 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Reverse Proxy & Gateway Routing</h2>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-medium border border-zinc-700 uppercase">
              {proxy.type}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure unified reverse proxy entrypoints in <code className="text-zinc-300 font-mono">infra/nginx/</code> or <code className="text-zinc-300 font-mono">infra/apache/</code>.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Proxy Type Selection Cards */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Select Gateway Server
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'nginx',
                name: 'Nginx (Recommended)',
                tag: 'High Performance & WebSockets',
                desc: 'Generates upstream blocks, reverse proxy passes, and automatic WebSocket connection upgrades.'
              },
              {
                id: 'apache',
                name: 'Apache HTTP Server',
                tag: 'mod_proxy & mod_proxy_wstunnel',
                desc: 'Generates httpd.conf with ProxyPass, ProxyPassReverse, and mod_proxy_wstunnel enabled.'
              },
              {
                id: 'none',
                name: 'None (Direct Ports)',
                tag: 'Direct Host Mapping',
                desc: 'No gateway container. Each application service is reached directly via its assigned host port.'
              }
            ].map(item => {
              const isSelected = proxy.type === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => setProxy({ ...proxy, type: item.id as ProxyType })}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-surface-900 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-500/20'
                      : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                        <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-white bg-white' : 'border-zinc-700'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-zinc-950" />}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300 bg-surface-950 px-1.5 py-0.5 rounded border border-surface-750">
                      {item.tag}
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Proxy Port */}
        {proxy.type !== 'none' && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Proxy Gateway Port</h4>
              <p className="text-[11px] text-zinc-400">Host port where the proxy listens (e.g. http://localhost:80)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">Port:</span>
              <input
                type="number"
                value={proxy.httpPort}
                onChange={(e) => setProxy({ ...proxy, httpPort: parseInt(e.target.value) || 80 })}
                className="w-24 bg-surface-950 border border-surface-650 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-zinc-300"
              />
            </div>
          </div>
        )}

        {/* Route Mapping Table */}
        {proxy.type !== 'none' && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 bg-surface-950 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Application Route Mappings</h4>
                <p className="text-[11px] text-zinc-400">Define path prefixes routing to each application</p>
              </div>
            </div>

            <div className="divide-y divide-surface-750">
              {apps.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                  No applications added to stack.
                </div>
              ) : (
                apps.map(app => {
                  const targetHost = app.runMode === 'docker' ? app.folderName : 'host.docker.internal'
                  const upstreamUrl = `http://${targetHost}:${app.port}`

                  return (
                    <div key={app.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-zinc-200 font-semibold w-40 truncate">
                          apps/{app.folderName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-950 border border-surface-700 text-zinc-400 flex items-center gap-1">
                          {app.runMode === 'docker' ? <Server className="w-2.5 h-2.5 text-zinc-300" /> : <Monitor className="w-2.5 h-2.5 text-zinc-400" />}
                          {app.runMode}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-400 text-[11px]">Path:</span>
                          <input
                            type="text"
                            value={app.routePrefix}
                            onChange={(e) => updateRoutePrefix(app.id, e.target.value)}
                            className="bg-surface-950 border border-surface-650 rounded px-2.5 py-1 text-xs font-mono text-white w-32 focus:outline-none focus:border-zinc-300"
                            placeholder="/api"
                          />
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

                        <div className="font-mono text-xs text-zinc-300 bg-surface-950 px-2.5 py-1 rounded border border-surface-700">
                          {upstreamUrl}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
