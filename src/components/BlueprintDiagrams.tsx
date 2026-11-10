import React, { useMemo, useRef } from 'react'
import { ProjectSettings } from '../types'
import { buildStackTopology } from '../utils/stackTopology'
import { renderArchitectureMarkdown } from '../utils/architectureDoc'
import { DiagramSvg } from './diagram/DiagramSvg'
import { networkNodeLines, networkViewColumns, networkViewEdges, serviceNodeLines, serviceViewColumns, serviceViewEdges } from './diagram/views'


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

const EmptyBlueprint = () => <p className="text-xs text-zinc-500 border border-surface-700 p-5">Add apps or databases to preview this blueprint.</p>

export const ServiceDiagram: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const topology = useMemo(() => buildStackTopology(settings), [settings])
  const isEmpty = settings.apps.length === 0 && !settings.databases.some(db => db.enabled)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white">Service diagram</h2>
        <p className="text-[11px] text-zinc-400 mt-1">Who calls whom, through which gateway route, and which data each service uses. Hover a connection for its resolved URL.</p>
      </div>
      <ExportButton onClick={() => downloadSvg(svgRef.current, `${settings.projectName || 'blueprint'}-services.svg`)}>Export SVG</ExportButton>
      {isEmpty ? <EmptyBlueprint /> : (
        <div className="overflow-auto border border-surface-700 bg-surface-950 p-3">
          <DiagramSvg
            svgRef={svgRef}
            topology={topology}
            columns={serviceViewColumns(topology, settings)}
            edges={serviceViewEdges(topology)}
            nodeLines={serviceNodeLines(topology, settings)}
            ariaLabel="Service dependency diagram"
          />
        </div>
      )}
    </section>
  )
}

export const NetworkTopologyDiagram: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const topology = useMemo(() => buildStackTopology(settings), [settings])
  const isEmpty = settings.apps.length === 0 && !settings.databases.some(db => db.enabled)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white">Network topology</h2>
        <p className="text-[11px] text-zinc-400 mt-1">Where each service runs, the ports it listens on and publishes, and how traffic reaches it from the browser and from other services.</p>
      </div>
      <ExportButton onClick={() => downloadSvg(svgRef.current, `${settings.projectName || 'blueprint'}-network.svg`)}>Export SVG</ExportButton>
      {isEmpty ? <EmptyBlueprint /> : (
        <div className="overflow-auto border border-surface-700 bg-surface-950 p-3">
          <DiagramSvg
            svgRef={svgRef}
            topology={topology}
            columns={networkViewColumns(topology)}
            edges={networkViewEdges(topology)}
            nodeLines={networkNodeLines(settings)}
            zoneTitles={{ host: 'HOST MACHINE', docker: `DOCKER NETWORK · ${topology.networkName}`, external: 'MANAGED EXTERNAL SERVICES' }}
            ariaLabel="Network topology diagram"
          />
        </div>
      )}
      <p className="text-[10px] text-zinc-500">Containers reach each other by service name on the bridge network. Host processes are reached through <code>host.docker.internal</code>; published ports are how the browser and host processes reach containers.</p>
    </section>
  )
}

export const BlueprintMarkdownExport: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const exportMarkdown = () => downloadFile(`${settings.projectName || 'blueprint'}-architecture.md`, renderArchitectureMarkdown(settings), 'text/markdown;charset=utf-8')
  return <ExportButton onClick={exportMarkdown}>Export blueprint Markdown</ExportButton>
}
