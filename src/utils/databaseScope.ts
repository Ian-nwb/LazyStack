import { CartApp, ProjectSettings, SelectedDatabase } from '../types'
import { DATABASE_CATALOG } from '../data/databases'
import { resolveStructurePaths } from '../data/structurePresets'

/** Caches and message brokers are shared infrastructure even when data stores are per service. */
export function isSharedInfrastructure(db: SelectedDatabase): boolean {
  const category = DATABASE_CATALOG.find(item => item.id === db.type)?.category
  return category === 'key-value' || category === 'cache' || category === 'message-broker'
}

/** True when the database is unassigned, global, or assigned to this app. */
export function isScopedToApp(app: CartApp, db: SelectedDatabase): boolean {
  return !db.assignedAppId || db.assignedAppId === 'global' || db.assignedAppId === app.id
}

/**
 * Whether `app` is wired to `db` under the project's database isolation mode:
 * - `centralized`: every app sees every database.
 * - `service-isolated`: an app sees only its own, global and unassigned databases.
 * - `hybrid`: data stores are per service, caches and brokers are shared by everyone.
 */
export function isDatabaseVisibleToApp(settings: ProjectSettings, app: CartApp, db: SelectedDatabase): boolean {
  const mode = resolveStructurePaths(settings).databaseIsolation
  if (mode === 'service-isolated') return isScopedToApp(app, db)
  if (mode === 'hybrid') return isSharedInfrastructure(db) || isScopedToApp(app, db)
  return true
}

export interface AppDatabaseOptions {
  /** Include managed cloud services (excluded by default; they have no container or connection URL). */
  includeCloud?: boolean
  /** Include SQLite (excluded by default; it is a file, not a service). */
  includeSqlite?: boolean
}

/** Enabled databases that `app` connects to. */
export function getAppDatabases(settings: ProjectSettings, app: CartApp, options: AppDatabaseOptions = {}): SelectedDatabase[] {
  return settings.databases.filter(db => {
    if (!db.enabled) return false
    if (!options.includeSqlite && db.type === 'sqlite') return false
    if (!options.includeCloud && DATABASE_CATALOG.find(item => item.id === db.type)?.isCloud) return false
    return isDatabaseVisibleToApp(settings, app, db)
  })
}

/** Databases that get a per-service `db/` folder (schema, migrations, seeds). */
export function getServiceOwnedDatabases(settings: ProjectSettings, app: CartApp): SelectedDatabase[] {
  const mode = resolveStructurePaths(settings).databaseIsolation
  if (mode === 'centralized') return []
  return settings.databases.filter(db => db.enabled && db.assignedAppId === app.id && (mode === 'service-isolated' || !isSharedInfrastructure(db)))
}
