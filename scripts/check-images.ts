/**
 * Checks that every container image LazyStack can generate still exists in its registry:
 * Compose services and admin UIs for every catalog service, and every `FROM` in every
 * framework Dockerfile. Uses HEAD manifest requests (which Docker Hub does not count toward
 * pull limits). Run with `npm run check:images`; the weekly starters workflow runs it.
 */
import os from 'node:os'
import path from 'node:path'
import { generateDockerCompose, getDockerfileForTech } from '../electron/scaffolding/templates/docker'
import { DATABASE_CATALOG } from '../src/data/databases'
import { getDatabaseAdminUiOptions } from '../src/data/databaseAdminUis'
import { TECH_CATALOG, isHostOnlyTech } from '../src/data/frameworks'
import type { ProjectSettings } from '../src/types'

const images = new Map<string, string>() // image -> first place it was seen

function settingsFor(dbType: ProjectSettings['databases'][number]['type'], adminUi?: string): ProjectSettings {
  return {
    projectName: 'image-check', parentDir: os.tmpdir(), targetDir: path.join(os.tmpdir(), 'image-check'),
    proxy: { type: 'nginx', httpPort: 8080 }, useUnifiedWorkspace: false,
    apps: [{ id: 'a1', folderName: 'api', role: 'backend', techId: 'ts-express', port: 3000, runMode: 'docker', routePrefix: '/' }],
    databases: [{ type: dbType, enabled: true, port: DATABASE_CATALOG.find(d => d.id === dbType)?.defaultPort || 5432, assignedAppId: 'a1', adminUi: adminUi as never }]
  }
}

for (const db of DATABASE_CATALOG.filter(item => !item.isCloud)) {
  const uis = getDatabaseAdminUiOptions(db.id).filter(ui => !ui.hostProcess)
  for (const ui of [undefined, ...uis.map(item => item.id)]) {
    const yaml = generateDockerCompose(settingsFor(db.id, ui))
    for (const [, image] of yaml.matchAll(/^\s+image:\s*(\S+)\s*$/gm)) if (!images.has(image)) images.set(image, `compose:${db.id}${ui ? `+${ui}` : ''}`)
  }
}
for (const tech of TECH_CATALOG.filter(item => !isHostOnlyTech(item.id))) {
  const { dockerfile } = getDockerfileForTech(tech.id, tech.defaultPort || 8080, 'app')
  const stages = new Set<string>()
  for (const [, image, stage] of dockerfile.matchAll(/^FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/gim)) {
    if (stage) stages.add(stage.toLowerCase())
    if (image === 'scratch' || stages.has(image.toLowerCase()) || image.includes('$')) continue
    if (!images.has(image)) images.set(image, `dockerfile:${tech.id}`)
  }
}

interface Ref { registry: string; repo: string; tag: string }
function parse(image: string): Ref {
  let rest = image
  let registry = 'registry-1.docker.io'
  const first = rest.split('/')[0]
  if (rest.includes('/') && (first.includes('.') || first.includes(':') || first === 'localhost')) {
    registry = first
    rest = rest.slice(first.length + 1)
  } else if (!rest.includes('/')) {
    rest = `library/${rest}`
  }
  const at = rest.indexOf('@')
  const colon = rest.lastIndexOf(':')
  if (at >= 0) return { registry, repo: rest.slice(0, at), tag: rest.slice(at + 1) }
  if (colon > rest.lastIndexOf('/')) return { registry, repo: rest.slice(0, colon), tag: rest.slice(colon + 1) }
  return { registry, repo: rest, tag: 'latest' }
}

const ACCEPT = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json'
].join(', ')

async function exists({ registry, repo, tag }: Ref): Promise<{ ok: boolean; status: number }> {
  const url = `https://${registry}/v2/${repo}/manifests/${tag}`
  let res = await fetch(url, { method: 'HEAD', headers: { Accept: ACCEPT } })
  if (res.status === 401) {
    const challenge = res.headers.get('www-authenticate') || ''
    const params = Object.fromEntries([...challenge.matchAll(/(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))
    if (params.realm) {
      const tokenUrl = new URL(params.realm)
      if (params.service) tokenUrl.searchParams.set('service', params.service)
      tokenUrl.searchParams.set('scope', params.scope || `repository:${repo}:pull`)
      const tokenRes = await fetch(tokenUrl)
      const body = await tokenRes.json().catch(() => ({})) as { token?: string; access_token?: string }
      const token = body.token || body.access_token
      if (token) res = await fetch(url, { method: 'HEAD', headers: { Accept: ACCEPT, Authorization: `Bearer ${token}` } })
    }
  }
  return { ok: res.ok, status: res.status }
}

const sorted = [...images].sort(([a], [b]) => a.localeCompare(b))
const failures: string[] = []
const CONCURRENCY = 6
let next = 0
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < sorted.length) {
    const [image, source] = sorted[next++]
    let result = { ok: false, status: 0 }
    for (let attempt = 0; attempt < 3 && !result.ok; attempt++) {
      try { result = await exists(parse(image)) } catch { result = { ok: false, status: -1 } }
      if (!result.ok && result.status !== 429 && result.status > 0) break
      if (!result.ok) await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
    }
    if (!result.ok) failures.push(`${image} (HTTP ${result.status}, used by ${source})`)
  }
}))

console.log(`Checked ${sorted.length} images.`)
if (failures.length) {
  console.error(`Missing or unreachable images:\n${failures.map(f => `  - ${f}`).join('\n')}`)
  process.exit(1)
}
console.log('All images exist.')
