import path from 'path'
import fs from 'fs-extra'
import { CartApp, DatabaseType, FolderStructureConfig, ProjectSettings, ProxyType, SelectedDatabase } from '../../src/types'
import { TECH_CATALOG, isHostOnlyTech } from '../../src/data/frameworks'
import { DATABASE_CATALOG } from '../../src/data/databases'
import { getDefaultStructureConfig } from '../../src/data/structurePresets'

export interface DetectedApp {
  /** Project-relative directory of the app. */
  path: string
  techId: string
  confidence: 'high' | 'medium' | 'low'
  /** Why this framework was chosen (manifest + dependency that matched). */
  evidence: string
}

export interface ImportResult {
  success: boolean
  error?: string
  /** `blueprint` when lazystack.json was found, `detected` when the stack was inferred from files. */
  source?: 'blueprint' | 'detected'
  settings?: ProjectSettings
  detected?: DetectedApp[]
  /** Directories with a manifest LazyStack could not map to a catalog framework. */
  unrecognized?: string[]
  warnings?: string[]
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'target', 'vendor', '.venv', 'venv', '__pycache__',
  '_build', 'deps', '.next', '.nuxt', '.output', '.svelte-kit', '.angular', '.gradle', '.idea', '.vscode', 'bin', 'obj',
  '.dart_tool', '.build', '.lazystack', 'coverage', 'tmp', 'log', 'logs', '.cache', '.turbo', 'zig-out', '.zig-cache'
])
const MAX_DEPTH = 4

type Rule = [RegExp, string]
const firstMatch = (text: string, rules: Rule[]) => rules.find(([pattern]) => pattern.test(text))

const NPM_RULES: Rule[] = [
  [/"@tanstack\/(react-)?start"/, 'tanstack-start'],
  [/"@solidjs\/start"/, 'solid-start'],
  [/"next"/, 'fullstack-nextjs'],
  [/"nuxt"/, 'fullstack-nuxt'],
  [/"@remix-run\//, 'fullstack-remix'],
  [/"@sveltejs\/kit"/, 'fullstack-sveltekit'],
  [/"astro"/, 'fullstack-astro'],
  [/"@builder\.io\/qwik-city"/, 'qwik-city'],
  [/"@angular\/core"/, 'angular-cli'],
  [/"@ionic\/(react|angular|vue)"/, 'ionic-framework'],
  [/"@tauri-apps\//, 'tauri-app'],
  [/"expo"/, 'react-native-expo'],
  [/"electron"/, 'electron-app'],
  [/"@nestjs\/core"/, 'ts-nestjs'],
  [/"elysia"/, 'ts-elysia'],
  [/"hono"/, 'ts-hono'],
  [/"fastify"/, 'ts-fastify'],
  [/"express"/, 'ts-express'],
  [/"@mui\/material"/, 'react-mui'],
  [/"inferno"/, 'inferno-js'],
  [/"lit"/, 'lit-element'],
  [/"solid-js"/, 'solidjs-vite'],
  [/"vue"/, 'vue-vite'],
  [/"react"/, 'react-vite'],
  [/"htmx\.org"/, 'html-htmx'],
  [/"assemblyscript"/, 'assemblyscript'],
  [/"@google\/clasp"/, 'google-apps-script']
]
const CARGO_RULES: Rule[] = [
  [/^\s*dioxus\s*=/m, 'rust-dioxus'],
  [/^\s*slint\s*=/m, 'rust-slint'],
  [/^\s*bevy\s*=/m, 'rust-bevy'],
  [/^\s*gpui(-ce)?\s*=|package\s*=\s*"gpui/m, 'rust-gpui'],
  [/^\s*yew\s*=/m, 'rust-yew'],
  [/^\s*leptos\s*=/m, 'rust-leptos'],
  [/^\s*axum\s*=/m, 'rust-axum'],
  [/^\s*actix-web\s*=/m, 'rust-actix'],
  [/^\s*poem\s*=/m, 'rust-poem']
]
const GO_RULES: Rule[] = [
  [/goravel\/framework/, 'go-goravel'],
  [/gin-gonic\/gin/, 'go-gin'],
  [/gofiber\/fiber/, 'go-fiber'],
  [/labstack\/echo/, 'go-echo'],
  [/go-chi\/chi/, 'go-chi']
]
const PY_RULES: Rule[] = [
  [/^\s*django\b/im, 'python-django'],
  [/^\s*fastapi\b/im, 'python-fastapi'],
  [/^\s*flask\b/im, 'python-flask'],
  [/^\s*reflex\b/im, 'python-reflex'],
  [/^\s*nicegui\b/im, 'python-nicegui'],
  [/^\s*anvil-uplink\b/im, 'python-anvil']
]
const JVM_RULES: Rule[] = [
  [/spring-boot/, 'java-springboot'],
  [/org\.openjfx|javafx/, 'java-javafx'],
  [/io\.ktor/, 'kotlin-ktor'],
  [/kotlin\("js"\)|kotlin\("multiplatform"\)[\s\S]*js\s*\(/, 'kotlin-js']
]
const COMPOSE_IMAGES: Array<[RegExp, DatabaseType]> = [
  [/(^|\/)postgres(:|$)|postgis/, 'postgres'],
  [/(^|\/)mariadb(:|$)/, 'mariadb'],
  [/(^|\/)mysql(:|$)/, 'mysql'],
  [/(^|\/)mongo(:|$)/, 'mongodb'],
  [/(^|\/)valkey(:|$)/, 'valkey'],
  [/(^|\/)redis(:|$)/, 'redis'],
  [/clickhouse/, 'clickhouse'],
  [/surrealdb/, 'surrealdb'],
  [/neo4j/, 'neo4j'],
  [/qdrant/, 'qdrant'],
  [/meilisearch/, 'meilisearch'],
  [/minio/, 'minio'],
  [/scylla/, 'scylladb'],
  [/rabbitmq/, 'rabbitmq'],
  [/kafka/, 'kafka'],
  [/pocketbase/, 'pocketbase']
]

const read = async (file: string) => (await fs.pathExists(file)) ? fs.readFile(file, 'utf8') : ''

async function detectApp(dir: string, entries: string[]): Promise<{ techId: string; confidence: DetectedApp['confidence']; evidence: string } | null | 'workspace'> {
  const has = (name: string) => entries.includes(name)
  const file = (name: string) => read(path.join(dir, name))

  if (has('package.json')) {
    const pkgText = await file('package.json')
    let pkg: Record<string, any> = {}
    try { pkg = JSON.parse(pkgText) } catch { /* keep text matching */ }
    if (pkg.workspaces || has('pnpm-workspace.yaml') || has('turbo.json') || has('nx.json')) return 'workspace'
    const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies })
    if (has('src-tauri')) return { techId: 'tauri-app', confidence: 'high', evidence: 'src-tauri/ directory' }
    const rule = firstMatch(deps, NPM_RULES)
    if (rule) return { techId: rule[1], confidence: 'high', evidence: `package.json depends on ${rule[0].source.replace(/\\|"/g, '')}` }
    if (has('index.html') && !Object.keys(pkg.dependencies || {}).length) return { techId: 'vanilla-html-css-js', confidence: 'medium', evidence: 'static index.html with package.json' }
    return { techId: 'vanilla-node', confidence: 'medium', evidence: 'package.json without a known framework' }
  }
  if (has('Cargo.toml')) {
    const cargo = await file('Cargo.toml')
    if (/^\[workspace\]/m.test(cargo) && !/^\[package\]/m.test(cargo)) return 'workspace'
    const rule = firstMatch(cargo, CARGO_RULES)
    return rule ? { techId: rule[1], confidence: 'high', evidence: `Cargo.toml depends on ${rule[1].replace('rust-', '')}` } : null
  }
  if (has('go.mod')) {
    const rule = firstMatch(await file('go.mod'), GO_RULES)
    return rule ? { techId: rule[1], confidence: 'high', evidence: `go.mod requires ${rule[0].source.replace(/\\/g, '')}` } : { techId: 'vanilla-go', confidence: 'medium', evidence: 'go.mod without a known router' }
  }
  if (has('manage.py')) return { techId: 'python-django', confidence: 'high', evidence: 'manage.py' }
  if (has('rxconfig.py')) return { techId: 'python-reflex', confidence: 'high', evidence: 'rxconfig.py' }
  if (has('requirements.txt') || has('pyproject.toml')) {
    const text = `${await file('requirements.txt')}\n${(await file('pyproject.toml')).replace(/"/g, '\n')}`
    const rule = firstMatch(text, PY_RULES)
    return rule ? { techId: rule[1], confidence: 'high', evidence: `Python dependency ${rule[1].replace('python-', '')}` } : { techId: 'vanilla-python', confidence: 'medium', evidence: 'Python project without a known framework' }
  }
  if (has('pom.xml') || has('build.gradle') || has('build.gradle.kts')) {
    const text = `${await file('pom.xml')}\n${await file('build.gradle')}\n${await file('build.gradle.kts')}`
    const rule = firstMatch(text, JVM_RULES)
    if (rule) return { techId: rule[1], confidence: 'high', evidence: `build file references ${rule[1]}` }
    const usesSwing = await containsInTree(path.join(dir, 'src'), /import javax\.swing\./, 3)
    return usesSwing ? { techId: 'java-swing', confidence: 'medium', evidence: 'Java sources import javax.swing' } : { techId: 'vanilla-java', confidence: 'low', evidence: 'JVM build file without a known framework' }
  }
  if (has('Main.java')) return { techId: 'vanilla-java', confidence: 'medium', evidence: 'Main.java' }
  if (has('build.sbt')) return /playframework|PlayScala/.test(await file('build.sbt') + await file('project/plugins.sbt')) ? { techId: 'scala-play', confidence: 'high', evidence: 'sbt Play plugin' } : null
  if (has('deps.edn') || has('project.clj')) return /ring/.test(await file('deps.edn') + await file('project.clj')) ? { techId: 'clojure-ring', confidence: 'high', evidence: 'Ring dependency' } : null
  if (has('composer.json')) {
    const composer = await file('composer.json')
    if (/laravel\/framework/.test(composer)) return { techId: 'fullstack-laravel', confidence: 'high', evidence: 'composer requires laravel/framework' }
    if (/symfony\/framework-bundle/.test(composer)) return { techId: 'php-symfony', confidence: 'high', evidence: 'composer requires symfony/framework-bundle' }
    return { techId: 'vanilla-php', confidence: 'medium', evidence: 'composer.json without a known framework' }
  }
  if (has('Gemfile')) return /\brails\b/.test(await file('Gemfile')) ? { techId: 'ruby-rails', confidence: 'high', evidence: 'Gemfile requires rails' } : null
  if (has('mix.exs')) return /phoenix|plug/.test(await file('mix.exs')) ? { techId: 'elixir-phoenix', confidence: 'high', evidence: 'mix.exs requires Phoenix/Plug' } : null
  const csproj = entries.find(entry => entry.endsWith('.csproj'))
  if (csproj) {
    const text = await file(csproj)
    if (/BlazorWebAssembly/.test(text)) return { techId: 'csharp-blazor', confidence: 'high', evidence: `${csproj} uses the Blazor WebAssembly SDK` }
    if (/Sdk\.Web/.test(text)) return { techId: 'csharp-aspnet', confidence: 'high', evidence: `${csproj} uses the Web SDK` }
    return null
  }
  if (has('deno.json') || has('deno.jsonc')) return /\$fresh/.test(await file('deno.json') + await file('deno.jsonc')) ? { techId: 'deno-fresh', confidence: 'high', evidence: 'deno.json imports Fresh' } : { techId: 'deno-native', confidence: 'medium', evidence: 'deno.json' }
  if (has('pubspec.yaml')) return /sdk:\s*flutter/.test(await file('pubspec.yaml')) ? { techId: 'dart-flutter', confidence: 'high', evidence: 'pubspec.yaml depends on Flutter' } : null
  if (has('Package.swift')) return /vapor/.test(await file('Package.swift')) ? { techId: 'swift-vapor', confidence: 'high', evidence: 'Package.swift depends on Vapor' } : { techId: 'swiftui-client', confidence: 'low', evidence: 'Swift package' }
  if (has('dune-project')) return { techId: 'ocaml-dream', confidence: /dream/.test(await read(path.join(dir, 'bin', 'dune'))) ? 'high' : 'low', evidence: 'dune-project' }
  if (has('Project.toml')) return /Genie/.test(await file('Project.toml')) ? { techId: 'julia-genie', confidence: 'high', evidence: 'Project.toml depends on Genie' } : null
  if (has('rebar.config')) return /cowboy/.test(await file('rebar.config')) ? { techId: 'erlang-cowboy', confidence: 'high', evidence: 'rebar.config depends on Cowboy' } : null
  if (has('shard.yml')) return /kemal/.test(await file('shard.yml')) ? { techId: 'crystal-kemal', confidence: 'high', evidence: 'shard.yml depends on Kemal' } : null
  if (entries.some(entry => entry.endsWith('.nimble')) || has('main.nim')) return { techId: 'nim-happyx', confidence: 'low', evidence: 'Nim project' }
  if (entries.some(entry => entry.endsWith('.cabal'))) return { techId: 'haskell-scotty', confidence: 'low', evidence: 'Cabal project' }
  if (has('build.zig')) return { techId: 'zig-http', confidence: 'low', evidence: 'build.zig' }
  if (has('CMakeLists.txt')) return /Drogon/.test(await file('CMakeLists.txt')) ? { techId: 'cpp-drogon', confidence: 'high', evidence: 'CMake finds Drogon' } : null
  if (has('main.c') && /microhttpd/.test(await file('main.c'))) return { techId: 'c-microhttpd', confidence: 'high', evidence: 'main.c uses libmicrohttpd' }
  if (has('plumber.R')) return { techId: 'r-plumber', confidence: 'high', evidence: 'plumber.R' }
  if (has('app.lua') && has('config.lua')) return { techId: 'lua-lapis', confidence: 'medium', evidence: 'Lapis app.lua + config.lua' }
  if (has('appsscript.json') || has('.clasp.json')) return { techId: 'google-apps-script', confidence: 'high', evidence: 'Apps Script manifest' }
  return null
}

const MANIFESTS = /^(package\.json|Cargo\.toml|go\.mod|manage\.py|rxconfig\.py|requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle(\.kts)?|Main\.java|build\.sbt|deps\.edn|project\.clj|composer\.json|Gemfile|mix\.exs|.+\.csproj|deno\.jsonc?|pubspec\.yaml|Package\.swift|dune-project|Project\.toml|rebar\.config|shard\.yml|.+\.nimble|main\.nim|.+\.cabal|build\.zig|CMakeLists\.txt|plumber\.R|appsscript\.json)$/

async function containsInTree(dir: string, pattern: RegExp, depth: number): Promise<boolean> {
  if (depth < 0 || !(await fs.pathExists(dir))) return false
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (await containsInTree(full, pattern, depth - 1)) return true
    } else if (/\.(java|kt)$/.test(entry.name) && pattern.test(await fs.readFile(full, 'utf8'))) {
      return true
    }
  }
  return false
}

async function walk(root: string, visit: (dir: string, entries: string[], depth: number) => Promise<'stop' | 'continue'>) {
  async function recurse(dir: string, depth: number) {
    let dirents: fs.Dirent[]
    try { dirents = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    const entries = dirents.map(entry => entry.name)
    if ((await visit(dir, entries, depth)) === 'stop' || depth >= MAX_DEPTH) return
    for (const entry of dirents) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) await recurse(path.join(dir, entry.name), depth + 1)
    }
  }
  await recurse(root, 0)
}

const toPosix = (value: string) => value.split(path.sep).join('/')

async function readPortFromEnv(appDir: string): Promise<number | null> {
  const env = await read(path.join(appDir, '.env'))
  const match = env.match(/^\s*PORT\s*=\s*(\d+)/m)
  return match ? Number(match[1]) : null
}

async function findComposeFiles(root: string): Promise<string[]> {
  const found: string[] = []
  await walk(root, async (dir, entries, depth) => {
    for (const entry of entries) if (/^(docker-)?compose(\.[\w-]+)?\.ya?ml$/.test(entry) && !/\.dev\./.test(entry)) found.push(path.join(dir, entry))
    return depth >= 2 ? 'stop' : 'continue'
  })
  return found
}

/** Minimal docker-compose reader: service names, images and published host ports. */
function parseComposeServices(yaml: string) {
  const services: Array<{ name: string; image?: string; ports: number[]; build: boolean }> = []
  const lines = yaml.split(/\r?\n/)
  let inServices = false
  let current: (typeof services)[number] | null = null
  let serviceIndent = -1
  let inPorts = false
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()
    if (indent === 0) {
      inServices = line === 'services:'
      current = null
      continue
    }
    if (!inServices) continue
    if (serviceIndent === -1 || indent === serviceIndent) {
      const name = line.match(/^([\w.-]+):\s*$/)?.[1]
      if (name) {
        serviceIndent = indent
        current = { name, ports: [], build: false }
        services.push(current)
        inPorts = false
        continue
      }
    }
    if (!current || indent <= serviceIndent) continue
    if (/^image:/.test(line)) current.image = line.replace(/^image:\s*/, '').replace(/["']/g, '')
    if (/^build:/.test(line)) current.build = true
    if (/^ports:/.test(line)) { inPorts = true; continue }
    if (inPorts && line.startsWith('-')) {
      const mapping = line.replace(/^-\s*/, '').replace(/["']/g, '')
      const host = mapping.split(':').length >= 2 ? mapping.split(':').slice(-2)[0] : mapping
      const port = Number(host.replace(/\$\{[^:}]+:-?(\d+)\}/, '$1'))
      if (Number.isInteger(port) && port > 0) current.ports.push(port)
    } else if (!line.startsWith('-')) {
      inPorts = false
    }
  }
  return services
}

function detectProxy(fileNames: Set<string>): ProxyType {
  if (fileNames.has('traefik.yml') || fileNames.has('traefik.toml')) return 'traefik'
  if (fileNames.has('Caddyfile')) return 'caddy'
  if (fileNames.has('nginx.conf')) return 'nginx'
  if (fileNames.has('httpd.conf')) return 'apache'
  return 'none'
}

/**
 * Builds a LazyStack blueprint for an existing folder. Projects generated by LazyStack carry a
 * `lazystack.json` and round-trip exactly; anything else is inferred from manifests and Compose files.
 */
export async function importProject(projectDir: string): Promise<ImportResult> {
  const root = path.resolve(projectDir)
  if (!(await fs.pathExists(root)) || !(await fs.stat(root)).isDirectory()) {
    return { success: false, error: `"${projectDir}" is not a directory.` }
  }
  const projectName = path.basename(root)
  const parentDir = path.dirname(root)

  const blueprintPath = path.join(root, 'lazystack.json')
  if (await fs.pathExists(blueprintPath)) {
    try {
      const { $lazystack: _version, ...blueprint } = await fs.readJson(blueprintPath)
      const settings: ProjectSettings = { ...blueprint, projectName: blueprint.projectName || projectName, parentDir, targetDir: root }
      if (!Array.isArray(settings.apps) || !Array.isArray(settings.databases) || !settings.proxy) throw new Error('missing apps, databases or proxy')
      return { success: true, source: 'blueprint', settings, detected: [], unrecognized: [], warnings: [] }
    } catch (error) {
      return { success: false, error: `lazystack.json could not be read: ${(error as Error).message}` }
    }
  }

  const detected: DetectedApp[] = []
  const unrecognized: string[] = []
  const warnings: string[] = []
  const allFileNames = new Set<string>()

  await walk(root, async (dir, entries) => {
    entries.forEach(entry => allFileNames.add(entry))
    const result = await detectApp(dir, entries)
    if (result === 'workspace') return 'continue'
    const rel = toPosix(path.relative(root, dir))
    if (result && rel) {
      detected.push({ path: rel, ...result })
      return 'stop'
    }
    if (result && !rel) {
      // A single-app repository: the project root itself is the app.
      detected.push({ path: '.', ...result })
      return 'stop'
    }
    if (rel && entries.some(entry => MANIFESTS.test(entry))) unrecognized.push(rel)
    return 'continue'
  })

  if (detected.some(app => app.path === '.')) {
    warnings.push('The folder is a single application. Its own files are left untouched; new apps are added under apps/.')
  }

  const composeServices = (await Promise.all((await findComposeFiles(root)).map(async file => parseComposeServices(await read(file))))).flat()

  const usedNames = new Set<string>()
  const apps: CartApp[] = detected.map((item, index) => {
    const tech = TECH_CATALOG.find(entry => entry.id === item.techId)!
    let folderName = item.path === '.' ? projectName : path.posix.basename(item.path)
    while (usedNames.has(folderName)) folderName = `${folderName}-${index}`
    usedNames.add(folderName)
    const composeMatch = composeServices.find(service => service.name === folderName && service.build)
    return {
      id: `imported_${index}_${folderName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      folderName,
      role: tech.role,
      techId: tech.id,
      port: composeMatch?.ports[0] || tech.defaultPort,
      // Existing apps only run in Docker when the repository already builds them with Compose.
      runMode: composeMatch && !isHostOnlyTech(tech.id) ? 'docker' : 'host',
      routePrefix: tech.role === 'frontend' ? '/' : `/${folderName}`,
      flavor: tech.supportsFlavor ? 'typescript' : undefined
    }
  })
  for (const [index, item] of detected.entries()) {
    if (item.path === '.') continue
    const envPort = await readPortFromEnv(path.join(root, item.path))
    if (envPort) apps[index].port = envPort
  }

  const databases: SelectedDatabase[] = []
  for (const service of composeServices) {
    if (!service.image) continue
    const type = COMPOSE_IMAGES.find(([pattern]) => pattern.test(service.image!.toLowerCase()))?.[1]
    if (!type) continue
    const def = DATABASE_CATALOG.find(entry => entry.id === type)
    databases.push({ id: `imported-${service.name}`, type, enabled: true, port: service.ports[0] || def?.defaultPort || 0, customName: service.name, assignedAppId: 'global' })
  }

  const appRelPaths = detected.filter(item => item.path !== '.').map(item => item.path)
  const parents = appRelPaths.map(rel => path.posix.dirname(rel)).filter(dir => dir !== '.')
  const commonRoot = parents.length && parents.every(dir => dir === parents[0]) ? parents[0] : 'apps'
  const infraDir = ['infra', 'deploy', 'infrastructure', 'docker'].find(dir => allFileNames.has(dir)) || 'infra'
  const structureConfig: FolderStructureConfig = {
    ...getDefaultStructureConfig(),
    preset: 'custom',
    isCustom: true,
    appsDir: commonRoot,
    infraDir,
    customAppPaths: Object.fromEntries(apps.map((app, index) => [app.id, detected[index].path]))
  }

  if (!detected.length) warnings.push('No known framework manifests were found. You can still add apps and infrastructure to this folder.')
  if (unrecognized.length) warnings.push(`${unrecognized.length} folder(s) have a manifest LazyStack does not recognize; they are left untouched.`)

  const settings: ProjectSettings = {
    projectName,
    parentDir,
    targetDir: root,
    proxy: { type: detectProxy(allFileNames), httpPort: 80 },
    databases,
    apps,
    structureConfig,
    useUnifiedWorkspace: allFileNames.has('pnpm-workspace.yaml') || allFileNames.has('turbo.json')
  }
  return { success: true, source: 'detected', settings, detected, unrecognized, warnings }
}
