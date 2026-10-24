import path from 'path'
import fs from 'fs-extra'
import { scaffoldProject } from '../../electron/scaffolding/generator'
import { TECH_CATALOG } from '../data/frameworks'
import { DATABASE_CATALOG } from '../data/databases'
import { STACK_PRESETS, StackPreset } from '../data/presets'
import { ProjectSettings, CartApp } from '../types'

const VERSION = '1.0.0'

function printHelp() {
  console.log(`
LazyStack CLI v${VERSION}
Automated Polyglot Monorepo & Fullstack Architecture Scaffolder

USAGE:
  lazystack <command> [options]

COMMANDS:
  export     Export a complete lazystack.json blueprint configuration
  scaffold   Generate and scaffold a production-ready monorepo stack
  list       List all supported frameworks, languages, and databases
  presets    List all available 1-click production stack presets
  version    Show current version
  help       Show this help message

OPTIONS FOR 'export':
  --preset, -p <name>   Preset to export (t3-stack, fastapi-react, modern-mern, etc.)
  --out, -o <file>      Target output file (default: ./lazystack.json)
  --name, -n <name>     Project name (default: my-monorepo)
  --stdout              Print JSON directly to stdout

OPTIONS FOR 'scaffold':
  --config, -c <file>   Path to existing lazystack.json blueprint file
  --preset, -p <name>   Scaffold directly from a preset name
  --out, -o <dir>       Target parent directory (default: current working directory)
  --name, -n <name>     Override project name

EXAMPLES:
  # Export a T3 Stack blueprint to lazystack.json
  lazystack export --preset t3-stack --out lazystack.json

  # Scaffold a monorepo from an exported config
  lazystack scaffold -c lazystack.json -o ./projects

  # 1-Click scaffold directly from preset
  lazystack scaffold --preset fastapi-react --name my-api-stack

  # List all available technologies and experimental status
  lazystack list
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
    includeSharedPackage: true
  }
}

function getDefaultSettings(projectName: string, parentDir: string): ProjectSettings {
  const defaultPreset = STACK_PRESETS[0]
  return buildSettingsFromPreset(defaultPreset, projectName, parentDir)
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
      console.log(`  • ${db.name.padEnd(30)} Default Port: :${db.defaultPort}`)
    })

    console.log('\n--- 1-CLICK STACK PRESETS ---')
    STACK_PRESETS.forEach(p => {
      console.log(`  • ${p.id.padEnd(20)} ${p.name}: ${p.tagline}`)
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

  if (command === 'export') {
    let presetName: string | undefined
    let outFile = './lazystack.json'
    let projectName = 'my-monorepo'
    let stdout = false

    for (let i = 1; i < args.length; i++) {
      if ((args[i] === '--preset' || args[i] === '-p') && args[i + 1]) {
        presetName = args[++i]
      } else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
        outFile = args[++i]
      } else if ((args[i] === '--name' || args[i] === '-n') && args[i + 1]) {
        projectName = args[++i]
      } else if (args[i] === '--stdout') {
        stdout = true
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

    for (let i = 1; i < args.length; i++) {
      if ((args[i] === '--config' || args[i] === '-c') && args[i + 1]) {
        configFile = args[++i]
      } else if ((args[i] === '--preset' || args[i] === '-p') && args[i + 1]) {
        presetName = args[++i]
      } else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
        outDir = args[++i]
      } else if ((args[i] === '--name' || args[i] === '-n') && args[i + 1]) {
        projectName = args[++i]
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

    console.log(`Scaffolding '${settings.projectName}' into ${settings.parentDir}...`)
    const result = await scaffoldProject(settings)

    if (result.success) {
      console.log(`\nSuccessfully scaffolded monorepo:`)
      console.log(`  Target Directory: ${result.targetDir}`)
      console.log(`  Files Created:    ${result.filesCreated}`)
      console.log(`\nNext Steps:`)
      console.log(`  1. cd ${result.targetDir}`)
      console.log(`  2. docker compose up -d`)
      console.log(`  3. View running services on configured gateway ports.`)
    } else {
      console.error(`\nScaffolding failed: ${result.error}`)
      process.exit(1)
    }
    return
  }

  console.error(`Unknown command: '${command}'. Run 'lazystack help' for usage.`)
  process.exit(1)
}
