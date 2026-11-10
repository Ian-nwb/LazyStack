import path from 'path'
import fs from 'fs-extra'
import { spawnSync } from 'child_process'
import { createInterface } from 'readline/promises'
import { scaffoldProject } from '../../electron/scaffolding/generator'
import { planScaffold } from '../../electron/scaffolding/plan'
import { createDatabaseCredentials } from '../../electron/scaffolding/templates/meta'
import { buildPlanTree, renderPlanTreeText } from '../utils/planTree'
import type { ScaffoldChanges } from '../../electron/scaffolding/writer'
import { importProject } from '../../electron/project/importer'
import { TECH_CATALOG } from '../data/frameworks'
import { DATABASE_CATALOG } from '../data/databases'
import { STACK_PRESETS, StackPreset } from '../data/presets'
import { ARCHITECTURE_PRESETS, normalizeStructureConfig } from '../data/structurePresets'
import { ProjectSettings, CartApp } from '../types'
import { TESTING_TOOLS } from '../data/testingTools'
import cliPackage from '../../packages/cli/package.json'
import { validateFolderName, validatePath, validateRelativeProjectPath } from '../utils/pathValidation'

const VERSION = cliPackage.version

function printHelp() {
  console.log(`
LazyStack CLI v${VERSION}
Automated Polyglot Monorepo & Fullstack Architecture Scaffolder

USAGE:
  lazystack <command> [options]

COMMANDS:
  init       Create a blueprint file from a preset
  export     Export a complete lazystack.json blueprint configuration
  scaffold   Generate and scaffold a production-ready monorepo stack
  dev        Start unified dev orchestrator (background databases + concurrent apps)
  search     Search frameworks, databases, presets, and testing tools
  list       List all supported frameworks, languages, and databases
  presets    List all available 1-click production stack presets
  doctor     Check local prerequisites for a blueprint
  validate   Check a blueprint without generating files
  plan       Preview the services and layout in a blueprint
  import     Inspect an existing project folder and export its blueprint
  add        Add a framework app to an existing project (never overwrites your code)
  apply      Apply an edited blueprint to an existing project
  version    Show current version
  help       Show this help message

OPTIONS FOR 'dev':
  --dir, -d <dir>       Target project directory (default: current working directory)
  --docker              Run full containerized stack via docker compose instead

OPTIONS FOR 'export':
  --preset, -p <name>   Preset to export (t3-stack, fastapi-react, modern-mern, etc.)
  --out, -o <file>      Target output file (default: ./lazystack.json)
  --name, -n <name>     Project name (default: my-monorepo)
  --native-only         Disable root workspace files (native project tooling only)
  --unified-workspace   Enable root JS workspace files (default)
  --stdout              Print JSON directly to stdout

OPTIONS FOR 'scaffold':
  --config, -c <file>   Path to existing lazystack.json blueprint file
  --preset, -p <name>   Scaffold directly from a preset name
  --out, -o <dir>       Target parent directory (default: current working directory)
  --name, -n <name>     Override project name
  --native-only         Disable root workspace files (native project tooling only)
  --unified-workspace   Enable root JS workspace files
  --dry-run             Preview the blueprint without writing files
  --force               Allow updating files in an existing target directory

OPTIONS FOR 'import':
  --dir, -d <dir>       Existing project folder (default: current working directory)
  --out, -o <file>      Write the detected blueprint to a file
  --json                Print the full import result as JSON

OPTIONS FOR 'add':
  --dir, -d <dir>       Existing project folder (default: current working directory)
  --tech, -t <id>       Framework ID to add (see 'lazystack list')
  --name, -n <folder>   App folder name (default: derived from the framework)
  --port <number>       App port (default: framework default)
  --dry-run             Show the planned changes without writing

OPTIONS FOR 'apply':
  --dir, -d <dir>       Existing project folder (default: current working directory)
  --config, -c <file>   Edited blueprint to apply (default: <dir>/lazystack.json)
  --dry-run             Show the planned changes without writing

OPTIONS FOR 'search':
  <query>               Search by name, language, description, or ID
  --json                Print matches as JSON

OPTIONS FOR 'init':
  --preset, -p <name>   Starting preset (default: first available preset)
  --name, -n <name>     Project name (default: my-monorepo)
  --out, -o <file>      Blueprint file (default: ./lazystack.json)
  --native-only         Disable root JavaScript workspace files
  --unified-workspace   Enable optional root JavaScript workspace files

EXAMPLES:
  # Export a T3 Stack blueprint to lazystack.json
  lazystack export --preset t3-stack --out lazystack.json

  # Scaffold a monorepo from an exported config
  lazystack scaffold -c lazystack.json -o ./projects

  # 1-Click scaffold directly from preset
  lazystack scaffold --preset fastapi-react --name my-api-stack

  # List all available technologies and experimental status
  lazystack list

  # Inspect an existing project, then add a Dioxus frontend to it
  lazystack import --dir ./my-project
  lazystack add --dir ./my-project --tech rust-dioxus --name dashboard --dry-run
`)
}

function getPresetByName(name: string): StackPreset | undefined {
  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return STACK_PRESETS.find(p => {
    const pNorm = p.id.toLowerCase().replace(/[^a-z0-9]/g, '')
    const nameNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    return pNorm.includes(norm) || norm.includes(pNorm) || nameNorm.includes(norm)
  })
}

function buildSettingsFromPreset(preset: StackPreset, projectName: string, parentDir: string): ProjectSettings {
  const resolvedParent = path.resolve(parentDir)
  const apps: CartApp[] = preset.apps.map((a, idx) => ({
    ...a,
    id: `app_${idx + 1}_${Date.now()}`
  }))

  return {
    projectName,
    parentDir: resolvedParent,
    targetDir: path.join(resolvedParent, projectName),
    apps,
    databases: preset.databases,
    proxy: preset.proxy,
    includeAdminGui: true,
    includeSharedPackage: true,
    useUnifiedWorkspace: true
  }
}

function getDefaultSettings(projectName: string, parentDir: string): ProjectSettings {
  const defaultPreset = STACK_PRESETS[0]
  return buildSettingsFromPreset(defaultPreset, projectName, parentDir)
}

async function readBlueprint(fileArg: string | undefined): Promise<{ settings?: ProjectSettings; file?: string }> {
  if (!fileArg) {
    console.error('Error: provide --config <file>.')
    process.exit(1)
  }
  const file = path.resolve(process.cwd(), fileArg!)
  try {
    return { settings: JSON.parse(await fs.readFile(file, 'utf8')) as ProjectSettings, file }
  } catch (error) {
    console.error(`Error reading blueprint ${file}: ${(error as Error).message}`)
    process.exit(1)
  }
}

function validateBlueprint(settings: ProjectSettings): string[] {
  const errors: string[] = []
  if (!settings || typeof settings !== 'object') return ['Blueprint must be a JSON object.']
  if (typeof settings.projectName !== 'string' || !validateFolderName(settings.projectName).valid) errors.push('projectName must be a valid folder name.')
  if (typeof settings.parentDir !== 'string' || !validatePath(settings.parentDir).valid) errors.push('parentDir must be a valid absolute path.')
  if (!Array.isArray(settings.apps) || settings.apps.length === 0) errors.push('apps must contain at least one service.')
  if (!Array.isArray(settings.databases)) errors.push('databases must be an array.')
  if (!settings.proxy || !['nginx', 'apache', 'caddy', 'traefik', 'none'].includes(settings.proxy.type)) errors.push('proxy.type must be nginx, apache, caddy, traefik, or none.')
  const apps = Array.isArray(settings.apps) ? settings.apps : []
  const ids = new Set(apps.map(app => app?.id).filter(Boolean))
  if (ids.size !== apps.length) errors.push('Every service must have a unique, non-empty id.')
  const ports = new Map<number, string>()
  const edges = new Map<string, string[]>()
  for (const app of apps) {
    if (!app || typeof app !== 'object') { errors.push('Every apps entry must be an object.'); continue }
    if (typeof app.folderName !== 'string' || !validateFolderName(app.folderName, 'app').valid) errors.push(`Invalid folderName for service '${app.folderName ?? '(unnamed)'}'.`)
    const tech = TECH_CATALOG.find(t => t.id === app.techId)
    if (!tech) errors.push(`Unknown technology '${app.techId}' on '${app.folderName}'.`)
    const allowsZeroPort = tech?.defaultPort === 0 || app.role === 'worker' || app.role === 'desktop-mobile'
    if (!Number.isInteger(app.port) || (app.port === 0 ? !allowsZeroPort : (app.port < 1 || app.port > 65535))) errors.push(`Invalid port on '${app.folderName}'.`)
    else if (app.port > 0) {
      if (ports.has(app.port)) errors.push(`Port ${app.port} is shared by '${ports.get(app.port)}' and '${app.folderName}'.`)
      else ports.set(app.port, app.folderName)
    }
    edges.set(app.id, [])
    for (const connection of Array.isArray(app.connections) ? app.connections : []) {
      if (!connection || !ids.has(connection.targetAppId) || connection.targetAppId === app.id || !['http', 'https', 'grpc', 'custom'].includes(connection.protocol)) errors.push(`Invalid service connection on '${app.folderName}'.`)
      else edges.get(app.id)?.push(connection.targetAppId)
    }
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const next of edges.get(id) || []) if (hasCycle(next)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  if ([...edges.keys()].some(hasCycle)) errors.push('Service connections contain a dependency cycle.')
  for (const db of Array.isArray(settings.databases) ? settings.databases : []) {
    if (!db || !DATABASE_CATALOG.some(item => item.id === db.type)) errors.push(`Unknown database type '${db?.type}'.`)
    else if (db.enabled) {
      const label = db.customName || db.type
      const def = DATABASE_CATALOG.find(item => item.id === db.type)
      // Managed cloud services and embedded SQLite have no local port.
      const needsPort = !def?.isCloud && db.type !== 'sqlite'
      if (needsPort && (!Number.isInteger(db.port) || db.port < 1 || db.port > 65535)) errors.push(`Invalid database port for '${label}'.`)
      else if (ports.has(db.port)) errors.push(`Port ${db.port} is shared by '${ports.get(db.port)}' and '${label}'.`)
      else ports.set(db.port, label)
      if (db.adminUi && (!Number.isInteger(db.adminUiPort) || (db.adminUiPort || 0) < 1 || (db.adminUiPort || 0) > 65535)) errors.push(`Invalid admin UI port for '${label}'.`)
      else if (db.adminUi && ports.has(db.adminUiPort!)) errors.push(`Port ${db.adminUiPort} is shared by '${ports.get(db.adminUiPort!)}' and '${label} admin UI'.`)
      else if (db.adminUi) ports.set(db.adminUiPort!, `${label} admin UI`)
    }
  }
  for (const folder of settings.structureConfig?.customFolders || []) {
    if (typeof folder !== 'string' || !validateRelativeProjectPath(folder).valid) errors.push(`Invalid custom folder path '${folder}'.`)
  }
  return [...new Set(errors)]
}

function printChanges(changes: ScaffoldChanges, dryRun: boolean) {
  const section = (title: string, items: string[]) => {
    if (!items.length) return
    console.log(`\n${title} (${items.length}):`)
    for (const item of items) console.log(`  ${item}`)
  }
  console.log(dryRun ? '\nPlanned changes (dry run, nothing written):' : '\nApplied changes:')
  section('New files', changes.created)
  section('Regenerated (original backed up)', changes.updated)
  section('Environment keys appended', changes.merged)
  if (changes.skipped.length) console.log(`\nLeft untouched: ${changes.skipped.length} existing file(s)`)
  if (changes.backupDir) console.log(`\nBackups: ${changes.backupDir}`)
  if (!changes.created.length && !changes.updated.length && !changes.merged.length) console.log('\nNothing to change.')
}

function parseConfigArg(args: string[]): string | undefined {
  const i = args.findIndex(arg => arg === '--config' || arg === '-c')
  return i >= 0 ? args[i + 1] : undefined
}

export async function runCli(args: string[] = process.argv.slice(2)) {
  const command = args[0] || 'help'

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(`LazyStack CLI v${VERSION}`)
    return
  }

  if (command === 'list') {
    console.log(`\nLazyStack Supported Frameworks & Ecosystem (${TECH_CATALOG.length} Frameworks):\n`)
    
    const categories = ['systems', 'frontend', 'backend', 'fullstack', 'mobile-desktop', 'scripting'] as const
    categories.forEach(cat => {
      const items = TECH_CATALOG.filter(t => t.category === cat)
      if (items.length === 0) return
      console.log(`--- ${cat.toUpperCase()} (${items.length}) ---`)
      items.forEach(item => {
        const expLabel = item.experimental ? ' [EXPERIMENTAL / RESEARCH]' : ''
        console.log(`  • ${item.name.padEnd(36)} [${item.language}]${expLabel}`)
      })
      console.log('')
    })

    console.log(`--- DATABASES & CACHES (${DATABASE_CATALOG.length}) ---`)
    DATABASE_CATALOG.forEach(db => {
      const portOrCloud = db.isCloud ? '[Cloud / BaaS API]' : `Default Port: :${db.defaultPort}`
      console.log(`  • ${db.name.padEnd(35)} ${portOrCloud}`)
    })

    console.log('\n--- 1-CLICK STACK PRESETS ---')
    STACK_PRESETS.forEach(p => {
      console.log(`  • ${p.id.padEnd(24)} ${p.name}: ${p.tagline}`)
    })

    console.log(`\n--- ARCHITECTURE & DIRECTORY LAYOUTS (${ARCHITECTURE_PRESETS.length}) ---`)
    ARCHITECTURE_PRESETS.forEach(a => {
      console.log(`  • ${a.id.padEnd(24)} ${a.name}: ${a.tagline}`)
    })
    console.log('')
    return
  }

  if (command === 'presets') {
    console.log('\nAvailable 1-Click Stack Presets:\n')
    STACK_PRESETS.forEach(p => {
      console.log(`ID:      ${p.id}`)
      console.log(`Name:    ${p.name}`)
      console.log(`Tagline: ${p.tagline}`)
      console.log(`Apps:    ${p.apps.map(a => `${a.folderName} (${a.techId}) on :${a.port}`).join(', ')}`)
      console.log(`Databases: ${p.databases.filter(d => d.enabled).map(d => `${d.type} (:${d.port})`).join(', ') || 'None'}`)
      console.log(`Proxy:   ${p.proxy.type} (:${p.proxy.httpPort})`)
      console.log('--------------------------------------------------')
    })
    return
  }

  if (command === 'search') {
    const jsonOutput = args.includes('--json')
    const query = args.slice(1).filter(arg => arg !== '--json').join(' ').trim().toLowerCase()
    if (!query) {
      console.error("Error: provide a search term, for example 'lazystack search postgres'.")
      process.exit(1)
    }
    const includes = (...values: Array<string | undefined>) => values.some(value => value?.toLowerCase().includes(query))
    const matches = {
      frameworks: TECH_CATALOG.filter(item => includes(item.id, item.name, item.language, item.description)),
      databases: DATABASE_CATALOG.filter(item => includes(item.id, item.name, item.category, item.description)),
      presets: STACK_PRESETS.filter(item => includes(item.id, item.name, item.tagline, ...item.apps.map(app => app.techId))),
      testingTools: TESTING_TOOLS.filter(item => includes(item.id, item.name, item.category, item.description))
    }
    const count = Object.values(matches).reduce((total, items) => total + items.length, 0)
    if (jsonOutput) {
      console.log(JSON.stringify({ query, count, matches }, null, 2))
      return
    }
    console.log(`\nSearch results for "${query}" (${count} matches)\n`)
    const sections: Array<[string, Array<{ id: string; name: string; detail: string }>]> = [
      ['FRAMEWORKS', matches.frameworks.map(item => ({ id: item.id, name: item.name, detail: item.language }))],
      ['DATABASES', matches.databases.map(item => ({ id: item.id, name: item.name, detail: item.category }))],
      ['PRESETS', matches.presets.map(item => ({ id: item.id, name: item.name, detail: item.tagline }))],
      ['TESTING TOOLS', matches.testingTools.map(item => ({ id: item.id, name: item.name, detail: item.category }))]
    ]
    for (const [label, items] of sections) {
      if (!items.length) continue
      console.log(`--- ${label} ---`)
      for (const item of items) console.log(`  ${item.id.padEnd(24)} ${item.name} — ${item.detail}`)
      console.log('')
    }
    if (!count) console.log('No catalog entries matched. Try a broader search term.')
    return
  }

  if (command === 'init') {
    let presetName: string | undefined
    let projectName = 'my-monorepo'
    let outFile = './lazystack.json'
    let useUnifiedWorkspace = true
    let presetProvided = false
    let nameProvided = false
    let outProvided = false
    for (let i = 1; i < args.length; i++) {
      if ((args[i] === '--preset' || args[i] === '-p') && args[i + 1]) { presetName = args[++i]; presetProvided = true }
      else if ((args[i] === '--name' || args[i] === '-n') && args[i + 1]) { projectName = args[++i]; nameProvided = true }
      else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) { outFile = args[++i]; outProvided = true }
      else if (args[i] === '--native-only') useUnifiedWorkspace = false
      else if (args[i] === '--unified-workspace') useUnifiedWorkspace = true
    }
    if (process.stdin.isTTY && process.stdout.isTTY && (!presetProvided || !nameProvided || !outProvided)) {
      const prompt = createInterface({ input: process.stdin, output: process.stdout })
      try {
        if (!presetProvided) {
          console.log('Available presets:')
          STACK_PRESETS.forEach((item, index) => console.log(`  ${index + 1}. ${item.name} (${item.id})`))
          const answer = (await prompt.question(`Choose a preset [1]: `)).trim()
          if (answer) {
            const byNumber = STACK_PRESETS[Number(answer) - 1]
            presetName = byNumber?.id || answer
          }
        }
        if (!nameProvided) projectName = (await prompt.question(`Project folder name [${projectName}]: `)).trim() || projectName
        if (!outProvided) outFile = (await prompt.question(`Blueprint output file [${outFile}]: `)).trim() || outFile
      } finally { prompt.close() }
    }
    const preset = presetName ? getPresetByName(presetName) : STACK_PRESETS[0]
    if (!preset) { console.error(`Error: Unknown preset '${presetName}'. Run 'lazystack presets'.`); process.exit(1) }
    const settings = buildSettingsFromPreset(preset!, projectName, process.cwd())
    settings.useUnifiedWorkspace = useUnifiedWorkspace
    const resolvedOut = path.resolve(process.cwd(), outFile)
    await fs.ensureDir(path.dirname(resolvedOut))
    await fs.writeFile(resolvedOut, JSON.stringify(settings, null, 2), { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'EEXIST') { console.error(`Error: ${resolvedOut} already exists. Choose another --out path.`); process.exit(1) }
      throw error
    })
    console.log(`Created ${resolvedOut} from preset '${preset!.id}'. Edit the blueprint, then run: lazystack validate --config ${outFile}`)
    return
  }

  if (command === 'validate' || command === 'plan' || command === 'doctor') {
    const { settings, file } = await readBlueprint(parseConfigArg(args))
    const errors = validateBlueprint(settings!)
    if (command === 'validate') {
      if (errors.length) { console.error(`Blueprint invalid (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n${errors.map(error => `  - ${error}`).join('\n')}`); process.exit(1) }
      console.log(`Blueprint is valid: ${file}`)
      return
    }
    if (errors.length) { console.error(`Cannot inspect invalid blueprint:\n${errors.map(error => `  - ${error}`).join('\n')}`); process.exit(1) }
    if (command === 'plan') {
      const s = settings!
      console.log(`\nGeneration plan: ${s.projectName}\n`)
      console.log(`Services (${s.apps.length}):`)
      for (const app of s.apps) {
        const tech = TECH_CATALOG.find(item => item.id === app.techId)
        console.log(`  ${app.folderName} — ${tech?.name || app.techId} (${app.role}, port ${app.port})`)
        for (const conn of app.connections || []) console.log(`    depends on ${s.apps.find(target => target.id === conn.targetAppId)?.folderName || conn.targetAppId} via ${conn.protocol}`)
      }
      console.log(`\nDatabases: ${(s.databases || []).filter(db => db.enabled).map(db => `${db.customName || db.type} (:${db.port})`).join(', ') || 'none'}`)
      console.log(`\nProject layout (${normalizeStructureConfig(s.structureConfig)?.preset || 'monorepo'}):\n`)
      console.log(renderPlanTreeText(buildPlanTree(planScaffold(s, createDatabaseCredentials(s)), s, { appDetail: 'summary' })))
      console.log()
      console.log(`Workspace: ${s.useUnifiedWorkspace === false ? 'native tooling only' : 'unified JavaScript/TypeScript workspace enabled'}`)
      console.log(`Proxy: ${s.proxy.type}`)
      console.log(`\nNo files were created. Run 'lazystack scaffold --config ${file}' to generate this project.`)
      return
    }
    const requirements = new Map<string, { label: string; hint?: string }>()
    for (const app of settings!.apps) {
      const tech = TECH_CATALOG.find(item => item.id === app.techId)
      for (const req of tech?.requires || []) requirements.set(req.binary, { label: req.label, hint: req.installHint })
    }
    if (settings!.apps.some(app => app.runMode === 'docker') || (settings!.databases || []).some(db => db.enabled && !DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud)) {
      requirements.set('docker', { label: 'Docker (Docker Compose)' })
    }
    let missing = 0
    console.log(`Prerequisite check for ${settings!.projectName}:`)
    for (const [binary, req] of requirements) {
      const result = spawnSync(binary, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' })
      const available = !result.error && result.status === 0
      console.log(`  ${available ? '✓' : '✗'} ${req.label}${available ? '' : req.hint ? ` — ${req.hint}` : ''}`)
      if (!available) missing++
    }
    if (missing) { console.error(`\n${missing} prerequisite${missing === 1 ? '' : 's'} missing. Install them before building or running the generated services.`); process.exitCode = 1 }
    else console.log('\nAll detected prerequisites are available.')
    return
  }

  if (command === 'export') {
    let presetName: string | undefined
    let outFile = './lazystack.json'
    let projectName = 'my-monorepo'
    let stdout = false
    let useUnifiedWorkspace = true

    for (let i = 1; i < args.length; i++) {
      if ((args[i] === '--preset' || args[i] === '-p') && args[i + 1]) {
        presetName = args[++i]
      } else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
        outFile = args[++i]
      } else if ((args[i] === '--name' || args[i] === '-n') && args[i + 1]) {
        projectName = args[++i]
      } else if (args[i] === '--stdout') {
        stdout = true
      } else if (args[i] === '--native-only') {
        useUnifiedWorkspace = false
      } else if (args[i] === '--unified-workspace') {
        useUnifiedWorkspace = true
      }
    }

    let settings: ProjectSettings
    if (presetName) {
      const preset = getPresetByName(presetName)
      if (!preset) {
        console.error(`Error: Unknown preset '${presetName}'. Run 'lazystack presets' to see available options.`)
        process.exit(1)
      }
      settings = buildSettingsFromPreset(preset, projectName, process.cwd())
    } else {
      settings = getDefaultSettings(projectName, process.cwd())
    }
    settings.useUnifiedWorkspace = useUnifiedWorkspace

    const jsonStr = JSON.stringify(settings, null, 2)

    if (stdout) {
      console.log(jsonStr)
      return
    }

    const resolvedOut = path.resolve(process.cwd(), outFile)
    await fs.ensureDir(path.dirname(resolvedOut))
    await fs.writeFile(resolvedOut, jsonStr, 'utf-8')
    console.log(`Exported LazyStack blueprint to: ${resolvedOut}`)
    console.log(`To scaffold this configuration, run:`)
    console.log(`  lazystack scaffold -c ${outFile}`)
    return
  }

  if (command === 'scaffold') {
    let configFile: string | undefined
    let presetName: string | undefined
    let outDir = process.cwd()
    let projectName = 'my-monorepo'
    let workspaceOverride: boolean | undefined
    let dryRun = false
    let force = false

    for (let i = 1; i < args.length; i++) {
      if ((args[i] === '--config' || args[i] === '-c') && args[i + 1]) {
        configFile = args[++i]
      } else if ((args[i] === '--preset' || args[i] === '-p') && args[i + 1]) {
        presetName = args[++i]
      } else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
        outDir = args[++i]
      } else if ((args[i] === '--name' || args[i] === '-n') && args[i + 1]) {
        projectName = args[++i]
      } else if (args[i] === '--native-only') {
        workspaceOverride = false
      } else if (args[i] === '--unified-workspace') {
        workspaceOverride = true
      } else if (args[i] === '--dry-run') {
        dryRun = true
      } else if (args[i] === '--force') {
        force = true
      }
    }

    let settings: ProjectSettings

    if (configFile) {
      const resolvedConfig = path.resolve(process.cwd(), configFile)
      if (!await fs.pathExists(resolvedConfig)) {
        console.error(`Error: Config file not found at ${resolvedConfig}`)
        process.exit(1)
      }
      try {
        const raw = await fs.readFile(resolvedConfig, 'utf-8')
        settings = JSON.parse(raw)
        if (projectName !== 'my-monorepo') {
          settings.projectName = projectName
        }
        if (outDir !== process.cwd()) {
          settings.parentDir = path.resolve(process.cwd(), outDir)
        }
        if (!settings.parentDir) settings.parentDir = path.resolve(process.cwd(), outDir)
        // Always recompute targetDir from parentDir and projectName
        settings.targetDir = path.join(settings.parentDir, settings.projectName)
      } catch (err: any) {
        console.error(`Error parsing config file ${resolvedConfig}: ${err.message}`)
        process.exit(1)
      }
    } else if (presetName) {
      const preset = getPresetByName(presetName)
      if (!preset) {
        console.error(`Error: Unknown preset '${presetName}'. Run 'lazystack presets' to see available options.`)
        process.exit(1)
      }
      settings = buildSettingsFromPreset(preset, projectName, outDir)
    } else {
      console.error(`Error: Please specify either --config <file> or --preset <name>.`)
      console.log(`Run 'lazystack --help' for usage examples.`)
      process.exit(1)
    }

    if (workspaceOverride !== undefined) settings.useUnifiedWorkspace = workspaceOverride

    const blueprintErrors = validateBlueprint(settings)
    if (blueprintErrors.length) {
      console.error(`Blueprint invalid:\n${blueprintErrors.map(error => `  - ${error}`).join('\n')}`)
      process.exit(1)
    }
    const targetDir = path.resolve(settings.parentDir, settings.projectName)
    if (dryRun) {
      console.log(`Dry run: would generate '${settings.projectName}' at ${targetDir}`)
      console.log(`  Services: ${settings.apps.map(app => `${app.folderName} (${app.techId})`).join(', ')}`)
      console.log(`  Databases: ${(settings.databases || []).filter(db => db.enabled).map(db => db.customName || db.type).join(', ') || 'none'}`)
      console.log('No files were created.')
      return
    }
    if (await fs.pathExists(targetDir) && (await fs.readdir(targetDir)).length > 0 && !force) {
      console.error(`Error: target directory already exists and is not empty: ${targetDir}\nUse --force to allow generated files to be updated there.`)
      process.exit(1)
    }

    console.log(`Scaffolding '${settings.projectName}' into ${settings.parentDir}...`)
    const result = await scaffoldProject(settings)

    if (result.success) {
      console.log(`\nSuccessfully scaffolded monorepo:`)
      console.log(`  Target Directory: ${result.targetDir}`)
      console.log(`  Files Created:    ${result.filesCreated}`)
      console.log(`\nNext Steps:`)
      console.log(`  1. cd ${result.targetDir}`)
      console.log(`  2. lazystack dev  (or 'npm run dev' to boot DBs & apps concurrently)`)
      console.log(`  3. View running services on configured gateway ports.`)
    } else {
      console.error(`\nScaffolding failed: ${result.error}`)
      process.exit(1)
    }
    return
  }

  if (command === 'import' || command === 'add' || command === 'apply') {
    const flag = (...names: string[]) => {
      const index = args.findIndex(arg => names.includes(arg))
      return index >= 0 ? args[index + 1] : undefined
    }
    const projectDir = path.resolve(process.cwd(), flag('--dir', '-d') || '.')
    const imported = await importProject(projectDir)
    if (!imported.success || !imported.settings) {
      console.error(`Error: ${imported.error || 'could not read project'}`)
      process.exit(1)
    }

    if (command === 'import') {
      if (args.includes('--json')) {
        console.log(JSON.stringify(imported, null, 2))
      } else {
        console.log(`\nProject: ${imported.settings.projectName} (${projectDir})`)
        console.log(`Source:  ${imported.source === 'blueprint' ? 'lazystack.json' : 'detected from project files'}`)
        console.log(`\nApps (${imported.settings.apps.length}):`)
        for (const app of imported.settings.apps) {
          const evidence = imported.detected?.find(item => item.techId === app.techId)
          console.log(`  - ${app.folderName.padEnd(20)} ${app.techId.padEnd(22)} port ${String(app.port).padEnd(6)} ${app.runMode}${evidence ? `  [${evidence.confidence}: ${evidence.evidence}]` : ''}`)
        }
        console.log(`\nDatabases: ${imported.settings.databases.map(db => `${db.customName || db.type} (${db.type}:${db.port})`).join(', ') || 'none'}`)
        console.log(`Proxy:     ${imported.settings.proxy.type}`)
        for (const warning of imported.warnings || []) console.log(`\n! ${warning}`)
        if (imported.unrecognized?.length) console.log(`! Unrecognized: ${imported.unrecognized.join(', ')}`)
      }
      const out = flag('--out', '-o')
      if (out) {
        await fs.writeFile(path.resolve(process.cwd(), out), JSON.stringify(imported.settings, null, 2) + '\n')
        console.log(`\nBlueprint written to ${out}. Edit it, then run: lazystack apply --dir ${path.relative(process.cwd(), projectDir) || '.'} --config ${out}`)
      }
      return
    }

    let settings = imported.settings
    if (command === 'add') {
      const techId = flag('--tech', '-t')
      const tech = TECH_CATALOG.find(item => item.id === techId)
      if (!tech) {
        console.error(`Error: unknown --tech '${techId ?? ''}'. Run 'lazystack list' or 'lazystack search <name>'.`)
        process.exit(1)
      }
      const folderName = flag('--name', '-n') || tech.id.replace(/^(ts|fullstack|vanilla)-/, '')
      if (settings.apps.some(app => app.folderName === folderName)) {
        console.error(`Error: an app named '${folderName}' already exists. Choose another --name.`)
        process.exit(1)
      }
      const usedPorts = new Set([...settings.apps.map(app => app.port), ...settings.databases.map(db => db.port)])
      let port = Number(flag('--port')) || tech.defaultPort
      while (port > 0 && usedPorts.has(port)) port++
      settings = {
        ...settings,
        apps: [...settings.apps, {
          id: `app_${Date.now()}`,
          folderName,
          role: tech.role,
          techId: tech.id,
          port,
          runMode: tech.hostOnly ? 'host' : 'docker',
          routePrefix: tech.role === 'frontend' ? '/' : `/${folderName}`,
          flavor: tech.supportsFlavor ? 'typescript' : undefined
        }]
      }
    } else {
      const configPath = path.resolve(process.cwd(), flag('--config', '-c') || path.join(projectDir, 'lazystack.json'))
      try {
        const { $lazystack: _version, ...blueprint } = JSON.parse(await fs.readFile(configPath, 'utf8'))
        settings = { ...blueprint, projectName: path.basename(projectDir), parentDir: path.dirname(projectDir), targetDir: projectDir }
      } catch (error) {
        console.error(`Error reading blueprint ${configPath}: ${(error as Error).message}`)
        process.exit(1)
      }
    }

    const errors = validateBlueprint(settings)
    if (errors.length) {
      console.error(`Blueprint invalid:\n${errors.map(error => `  - ${error}`).join('\n')}`)
      process.exit(1)
    }
    const dryRun = args.includes('--dry-run')
    const result = await scaffoldProject(settings, { mode: 'augment', dryRun })
    if (!result.success || !result.changes) {
      console.error(`Error: ${result.error || 'update failed'}`)
      process.exit(1)
    }
    printChanges(result.changes, dryRun)
    return
  }

  if (command === 'dev') {
    let targetDir = process.cwd()
    let useDocker = false
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--dir' || args[i] === '-d') {
        targetDir = path.resolve(process.cwd(), args[++i] || '')
      } else if (args[i] === '--docker') {
        useDocker = true
      }
    }

    const orchestratorPath = path.join(targetDir, 'scripts', 'dev-orchestrator.mjs')
    const devShPath = path.join(targetDir, 'scripts', 'dev.sh')

    if (useDocker) {
      if (await fs.pathExists(devShPath)) {
        console.log(`Starting containerized environment in ${targetDir}...`)
        const proc = spawnSync('bash', [devShPath, '--docker'], { cwd: targetDir, stdio: 'inherit' })
        process.exit(proc.status ?? 0)
      } else {
        console.error(`Error: scripts/dev.sh not found in ${targetDir}`)
        process.exit(1)
      }
    }

    if (await fs.pathExists(orchestratorPath)) {
      console.log(`Starting LazyStack Dev Orchestrator in ${targetDir}...`)
      const proc = spawnSync('node', [orchestratorPath], { cwd: targetDir, stdio: 'inherit' })
      process.exit(proc.status ?? 0)
    } else if (await fs.pathExists(devShPath)) {
      console.log(`Notice: scripts/dev-orchestrator.mjs not found. Invoking scripts/dev.sh in ${targetDir}...`)
      const proc = spawnSync('bash', [devShPath], { cwd: targetDir, stdio: 'inherit' })
      process.exit(proc.status ?? 0)
    } else {
      console.error(`Error: No LazyStack development launcher found in ${targetDir}.`)
      console.error(`Make sure you are in the root directory of a project scaffolded with LazyStack.`)
      process.exit(1)
    }
    return
  }

  console.error(`Unknown command: '${command}'. Run 'lazystack help' for usage.`)
  process.exit(1)
}
