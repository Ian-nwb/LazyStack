import React, { useRef } from 'react'
import { CartApp, ProjectSettings, SelectedDatabase } from '../types'
import { DATABASE_CATALOG } from '../data/databases'
import { resolveStructurePaths } from '../data/structurePresets'

const serviceLabel = (app: CartApp) => `${app.folderName} · ${app.techId}`
const databaseLabel = (db: SelectedDatabase) => db.customName || DATABASE_CATALOG.find(item => item.id === db.type)?.name || db.type

function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadSvg(svg: SVGSVGElement | null, filename: string) {
  if (!svg) return
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  copy.setAttribute('width', copy.getAttribute('width') || '1120')
  downloadFile(filename, new XMLSerializer().serializeToString(copy), 'image/svg+xml;charset=utf-8')
}

const ExportButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="border border-surface-700 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:border-zinc-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
    {children}
  </button>
)

export const ServiceDiagram: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const apps = settings.apps
  const databases = settings.databases.filter(db => db.enabled)
  const paths = resolveStructurePaths(settings)
  const count = Math.max(apps.length, databases.length, 1)
  const height = Math.max(300, 100 + count * 112)
  const appY = (index: number) => 70 + index * 112
  const dbY = (index: number) => 70 + index * 112
  const relevant = (app: CartApp, db: SelectedDatabase) => {
    return paths.databaseIsolation !== 'service-isolated' || db.assignedAppId === app.id || db.assignedAppId === 'global' || !db.assignedAppId
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white">Service diagram</h2>
        <p className="text-[11px] text-zinc-400 mt-1">Applications, service connections, and their configured data dependencies.</p>
      </div>
      <ExportButton onClick={() => downloadSvg(svgRef.current, `${settings.projectName || 'blueprint'}-services.svg`)}>Export SVG</ExportButton>
      {apps.length === 0 && databases.length === 0 ? <p className="text-xs text-zinc-500 border border-surface-700 p-5">Add apps or databases to preview this blueprint.</p> : (
        <div className="overflow-auto border border-surface-700 bg-surface-950 p-3">
          <svg ref={svgRef} viewBox={`0 0 920 ${height}`} className="w-full min-w-[720px]" role="img" aria-label="Service dependency diagram">
            <defs><marker id="service-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" /></marker></defs>
            {apps.flatMap((app, appIndex) => {
              const targetEdges = (app.connections || []).map(connection => {
                const targetIndex = apps.findIndex(target => target.id === connection.targetAppId)
                if (targetIndex < 0) return null
                const sourceY = appY(appIndex) + 38
                const targetY = appY(targetIndex) + 38
                return <g key={`${app.id}-${connection.targetAppId}`}><path d={`M 385 ${sourceY} C 500 ${sourceY}, 500 ${targetY}, 385 ${targetY}`} fill="none" stroke="#a1a1aa" strokeWidth="1.5" markerEnd="url(#service-arrow)" /><text x="485" y={(sourceY + targetY) / 2 - 5} fill="#a1a1aa" fontSize="10" textAnchor="middle">{connection.protocol}</text></g>
              })
              const dbEdges = databases.map((db, dbIndex) => relevant(app, db) ? <path key={`${app.id}-${db.id || db.type}`} d={`M 370 ${appY(appIndex) + 38} C 470 ${appY(appIndex) + 38}, 500 ${dbY(dbIndex) + 38}, 570 ${dbY(dbIndex) + 38}`} fill="none" stroke="#71717a" strokeDasharray="5 4" strokeWidth="1.5" markerEnd="url(#service-arrow)" /> : null)
              return [...targetEdges, ...dbEdges]
            })}
            <text x="75" y="28" fill="#a1a1aa" fontSize="11" letterSpacing="1.5">APPLICATIONS</text>
            <text x="570" y="28" fill="#a1a1aa" fontSize="11" letterSpacing="1.5">DATA SERVICES</text>
            {apps.map((app, index) => <g key={app.id}>
              <rect x="75" y={appY(index)} width="310" height="76" fill="#18181b" stroke="#71717a" />
              <text x="91" y={appY(index) + 25} fill="#fafafa" fontSize="13" fontWeight="600">{serviceLabel(app)}</text>
              <text x="91" y={appY(index) + 47} fill="#a1a1aa" fontSize="11">{app.role} · {app.runMode} · :{app.port}</text>
              <text x="91" y={appY(index) + 64} fill="#71717a" fontSize="10">{settings.apps.filter(candidate => (app.connections || []).some(edge => edge.targetAppId === candidate.id)).map(candidate => candidate.folderName).join(', ') || 'no service dependencies'}</text>
            </g>)}
            {databases.map((db, index) => <g key={db.id || `${db.type}-${index}`}>
              <rect x="570" y={dbY(index)} width="260" height="76" fill="#18181b" stroke="#71717a" />
              <text x="586" y={dbY(index) + 25} fill="#fafafa" fontSize="13" fontWeight="600">{databaseLabel(db)}</text>
              <text x="586" y={dbY(index) + 47} fill="#a1a1aa" fontSize="11">{db.type} · {db.assignedAppId === 'global' || !db.assignedAppId ? 'shared' : 'service-scoped'} · :{db.port || 'managed'}</text>
              <text x="586" y={dbY(index) + 64} fill="#71717a" fontSize="10">{DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud ? 'managed external service' : db.type === 'sqlite' ? 'local file database' : 'container service'}</text>
            </g>)}
            {apps.length === 0 && <text x="90" y="100" fill="#71717a" fontSize="12">No application services selected.</text>}
            {databases.length === 0 && <text x="570" y="100" fill="#71717a" fontSize="12">No databases selected.</text>}
          </svg>
        </div>
      )}
    </section>
  )
}

export const NetworkTopologyDiagram: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const apps = settings.apps
  const databases = settings.databases.filter(db => db.enabled)
  const localDbs = databases.filter(db => {
    const definition = DATABASE_CATALOG.find(item => item.id === db.type)
    return db.type !== 'sqlite' && (!definition?.isCloud || db.type === 'pocketbase')
  })
  const cloudDbs = databases.filter(db => DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud && db.type !== 'pocketbase')
  const sqliteDbs = databases.filter(db => db.type === 'sqlite')
  const dockerApps = apps.filter(app => app.runMode === 'docker')
  const hostApps = apps.filter(app => app.runMode === 'host')
  const rowCount = Math.max(dockerApps.length, localDbs.length, hostApps.length + sqliteDbs.length + 2, cloudDbs.length + 1, 1)
  const height = Math.max(430, 130 + rowCount * 112)
  const appY = (index: number) => 120 + index * 112
  const dbY = (index: number) => 120 + index * 112

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white">Network topology</h2>
        <p className="text-[11px] text-zinc-400 mt-1">Shows network boundaries, host-published ports, host-run apps, and external services.</p>
      </div>
      <ExportButton onClick={() => downloadSvg(svgRef.current, `${settings.projectName || 'blueprint'}-network.svg`)}>Export SVG</ExportButton>
      {apps.length === 0 && databases.length === 0 ? <p className="text-xs text-zinc-500 border border-surface-700 p-5">Add apps or databases to preview this blueprint.</p> : (
        <div className="overflow-auto border border-surface-700 bg-surface-950 p-3">
          <svg ref={svgRef} viewBox={`0 0 1120 ${height}`} className="w-full min-w-[900px]" role="img" aria-label="Network topology diagram">
            <defs><marker id="network-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" /></marker></defs>
            <rect x="175" y="65" width="700" height={height - 100} fill="#09090b" stroke="#71717a" strokeDasharray="6 5" />
            <text x="195" y="52" fill="#a1a1aa" fontSize="11" letterSpacing="1.5">DOCKER NETWORK · lazystack_net</text>
            <g><rect x="20" y="220" width="112" height="58" fill="#18181b" stroke="#52525b" /><text x="76" y="245" fill="#fafafa" fontSize="12" textAnchor="middle">HOST</text><text x="76" y="263" fill="#a1a1aa" fontSize="10" textAnchor="middle">published ports</text></g>
            {settings.proxy.type !== 'none' && <g>
              <path d="M 132 249 L 220 249" stroke="#a1a1aa" strokeWidth="1.5" markerEnd="url(#network-arrow)" />
              <rect x="220" y="220" width="145" height="58" fill="#18181b" stroke="#a1a1aa" />
              <text x="292" y="245" fill="#fafafa" fontSize="12" textAnchor="middle">{settings.proxy.type.toUpperCase()} GATEWAY</text>
              <text x="292" y="263" fill="#a1a1aa" fontSize="10" textAnchor="middle">host :{settings.proxy.httpPort}</text>
            </g>}
            {dockerApps.map((app, index) => {
              const x = settings.proxy.type === 'none' ? 225 : 405
              return <g key={app.id}>
                {settings.proxy.type !== 'none' && <path d={`M 365 249 C 385 249, 385 ${appY(index) + 31}, ${x} ${appY(index) + 31}`} stroke="#71717a" fill="none" markerEnd="url(#network-arrow)" />}
                {settings.proxy.type === 'none' && <path d={`M 132 249 C 175 249, 175 ${appY(index) + 31}, ${x} ${appY(index) + 31}`} stroke="#71717a" fill="none" markerEnd="url(#network-arrow)" />}
                <rect x={x} y={appY(index)} width="220" height="64" fill="#18181b" stroke="#71717a" />
                <text x={x + 12} y={appY(index) + 24} fill="#fafafa" fontSize="12">{app.folderName}</text>
                <text x={x + 12} y={appY(index) + 44} fill="#a1a1aa" fontSize="10">container · host :{app.port}</text>
              </g>
            })}
            {localDbs.map((db, index) => <g key={db.id || `${db.type}-${index}`}>
              <rect x="650" y={dbY(index)} width="190" height="64" fill="#18181b" stroke="#71717a" />
              <text x="662" y={dbY(index) + 24} fill="#fafafa" fontSize="12">{databaseLabel(db)}</text>
              <text x="662" y={dbY(index) + 44} fill="#a1a1aa" fontSize="10">container · host :{db.port || 'local file'}</text>
            </g>)}
            {hostApps.map((app, index) => <g key={app.id}>
              <path d={`M 132 ${300 + index * 86} L 175 ${300 + index * 86}`} stroke="#71717a" strokeDasharray="4 3" />
              <rect x="20" y={286 + index * 86} width="112" height="58" fill="#18181b" stroke="#71717a" />
              <text x="76" y={308 + index * 86} fill="#fafafa" fontSize="10" textAnchor="middle">{app.folderName}</text>
              <text x="76" y={326 + index * 86} fill="#a1a1aa" fontSize="9" textAnchor="middle">host :{app.port}</text>
            </g>)}
            {sqliteDbs.map((db, index) => <g key={db.id || `sqlite-${index}`}>
              <rect x="20" y={286 + (hostApps.length + index) * 86} width="112" height="58" fill="#18181b" stroke="#71717a" />
              <text x="76" y={308 + (hostApps.length + index) * 86} fill="#fafafa" fontSize="10" textAnchor="middle">{databaseLabel(db)}</text>
              <text x="76" y={326 + (hostApps.length + index) * 86} fill="#a1a1aa" fontSize="9" textAnchor="middle">local file</text>
            </g>)}
            {cloudDbs.map((db, index) => <g key={db.id || `${db.type}-${index}`}>
              <path d={`M 875 ${150 + index * 84} L 915 ${150 + index * 84}`} stroke="#a1a1aa" strokeDasharray="5 4" markerEnd="url(#network-arrow)" />
              <rect x="915" y={122 + index * 84} width="180" height="58" fill="#18181b" stroke="#a1a1aa" />
              <text x="1005" y={146 + index * 84} fill="#fafafa" fontSize="11" textAnchor="middle">{databaseLabel(db)}</text>
              <text x="1005" y={164 + index * 84} fill="#a1a1aa" fontSize="9" textAnchor="middle">managed external service</text>
            </g>)}
            {localDbs.length === 0 && <text x="650" y="120" fill="#71717a" fontSize="11">No container databases selected.</text>}
            {dockerApps.length === 0 && <text x="225" y="120" fill="#71717a" fontSize="11">No containerized applications selected.</text>}
          </svg>
        </div>
      )}
      <p className="text-[10px] text-zinc-500">Container services share the configured bridge network. Host services and managed databases are shown outside its boundary.</p>
    </section>
  )
}

export const BlueprintMarkdownExport: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const exportMarkdown = () => {
    const apps = settings.apps.map(app => `### ${app.folderName}\n\n- Role: ${app.role}\n- Technology: ${app.techId}\n- Runtime: ${app.runMode}\n- Port: ${app.port}\n- Health check: ${app.healthCheck?.enabled ? `${app.healthCheck.type}${app.healthCheck.path ? ` ${app.healthCheck.path}` : ''}` : 'not configured'}\n- Depends on: ${(app.connections || []).map(connection => {
      const target = settings.apps.find(candidate => candidate.id === connection.targetAppId)
      return target ? `${target.folderName} (${connection.protocol}; ${connection.envVar})` : null
    }).filter(Boolean).join(', ') || 'none'}\n`)
    const databases = settings.databases.filter(db => db.enabled).map(db => `- ${databaseLabel(db)} (${db.type}; ${db.assignedAppId || 'shared'}; port ${db.port || 'managed'})`)
    const markdown = `# ${settings.projectName || 'Blueprint'} architecture\n\n## Services\n\n${apps.join('\n')}\n## Databases\n\n${databases.join('\n') || '- None configured'}\n\n## Network topology\n\n- Docker network: lazystack_net (container services)\n- Gateway: ${settings.proxy.type === 'none' ? 'none' : `${settings.proxy.type} on host port ${settings.proxy.httpPort}`}\n- Host-run services: ${settings.apps.filter(app => app.runMode === 'host').map(app => `${app.folderName}:${app.port}`).join(', ') || 'none'}\n- Published application ports: ${settings.apps.filter(app => app.runMode === 'docker').map(app => `${app.folderName}:${app.port}`).join(', ') || 'none'}\n`
    downloadFile(`${settings.projectName || 'blueprint'}-architecture.md`, markdown, 'text/markdown;charset=utf-8')
  }
  return <ExportButton onClick={exportMarkdown}>Export blueprint Markdown</ExportButton>
}
