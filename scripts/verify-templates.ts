/**
 * Guards against drift between the framework catalog, starter templates and Dockerfiles.
 * Run with `npm run verify:templates` (also run in CI).
 */
import { getStarterFilesForTech } from '../electron/scaffolding/templates/appTemplates'
import { getDockerfileForTech } from '../electron/scaffolding/templates/docker'
import { TECH_CATALOG, isHostOnlyTech } from '../src/data/frameworks'

const GENERIC_NODE_MARKER = "dialect: 'TypeScript'"
const GENERIC_NODE_TECHS = new Set(['vanilla-node'])

const failures: string[] = []
const fail = (techId: string, message: string) => failures.push(`${techId}: ${message}`)

const globToRegExp = (glob: string) =>
  new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '(/.*)?$')

for (const tech of TECH_CATALOG) {
  const folderName = 'verify-app'
  const port = tech.defaultPort || 8080
  for (const flavor of tech.supportsFlavor ? (['typescript', 'javascript'] as const) : ([undefined] as const)) {
    const files = getStarterFilesForTech(tech.id, folderName, port, flavor)
    const paths = Object.keys(files)
    const label = flavor ? `${tech.id} [${flavor}]` : tech.id

    if (paths.length === 0) fail(label, 'starter generated no files')
    if (!paths.includes('README.md')) fail(label, 'missing README.md')
    if (!paths.includes('.gitignore')) fail(label, 'missing .gitignore')
    if (!GENERIC_NODE_TECHS.has(tech.id) && Object.values(files).some(content => content.includes(GENERIC_NODE_MARKER))) {
      fail(label, 'fell through to the generic Node.js fallback template')
    }
    for (const [file, content] of Object.entries(files)) {
      if (file.endsWith('.json')) {
        try { JSON.parse(content) } catch (error) { fail(label, `${file} is not valid JSON (${(error as Error).message})`) }
      }
    }

    if (isHostOnlyTech(tech.id)) continue
    const { dockerfile } = getDockerfileForTech(tech.id, port, folderName)
    if (!dockerfile.trim()) {
      fail(label, 'Docker-capable tech has an empty Dockerfile')
      continue
    }
    for (const line of dockerfile.split('\n')) {
      const match = line.match(/^COPY\s+(?!--from)(.+)$/)
      if (!match) continue
      const sources = match[1].trim().split(/\s+/).slice(0, -1)
      for (const source of sources) {
        if (source === '.' || source.endsWith('*')) continue // whole context or optional lockfile
        const pattern = globToRegExp(source.replace(/^\.\//, '').replace(/\/$/, ''))
        if (!paths.some(file => pattern.test(file))) fail(label, `Dockerfile copies "${source}" but the starter does not create it`)
      }
    }
    if (/CMD \["npm", "start"\]/.test(dockerfile)) {
      try {
        const pkg = JSON.parse(files['package.json'] || '{}')
        if (!pkg.scripts?.start) fail(label, 'Node Dockerfile runs `npm start` but package.json has no start script')
      } catch {
        // Invalid JSON is reported above.
      }
    }
  }
}

if (failures.length) {
  console.error(`Template verification failed (${failures.length}):\n` + failures.map(item => `  - ${item}`).join('\n'))
  process.exit(1)
}
console.log(`Template verification passed for ${TECH_CATALOG.length} frameworks.`)
