import { getStarterFilesForTech } from '../../electron/scaffolding/templates/appTemplates'
import { LanguageFlavor } from '../types'
import { TECH_CATALOG } from './frameworks'

export interface NativeProjectLayout {
  summary: string
  paths: string[]
}

/** Directories whose immediate sub-folders are worth showing in the preview (e.g. `src/components/`). */
const EXPANDED_DIRS = new Set(['src', 'app', 'lib', 'Sources', 'internal', 'resources', 'routes'])
const MAX_ENTRIES = 14

const cache = new Map<string, NativeProjectLayout>()

/**
 * Blueprint preview of an app's framework-native layout. It is derived from the exact starter
 * files the generator writes, so the preview can never drift from the scaffolded project.
 */
export function getNativeProjectLayout(techId: string, folderName = 'app', port = 3000, flavor?: LanguageFlavor): NativeProjectLayout {
  const key = `${techId}|${folderName}|${port}|${flavor ?? ''}`
  const cached = cache.get(key)
  if (cached) return cached

  const files = Object.keys(getStarterFilesForTech(techId, folderName, port, flavor))
  const dirs = new Set<string>()
  const topFiles = new Set<string>()
  for (const file of files) {
    const parts = file.split('/')
    if (parts.length === 1) {
      if (!file.startsWith('.')) topFiles.add(file)
      continue
    }
    dirs.add(`${parts[0]}/`)
    if (parts.length > 2 && EXPANDED_DIRS.has(parts[0])) dirs.add(`${parts[0]}/${parts[1]}/`)
  }

  const paths = [...[...dirs].sort(), ...[...topFiles].sort()].slice(0, MAX_ENTRIES)
  const tech = TECH_CATALOG.find(item => item.id === techId)
  const layout = { summary: tech ? tech.name : 'Framework-native starter', paths: paths.length ? paths : ['README.md'] }
  cache.set(key, layout)
  return layout
}
