import appPackage from '../../package.json'

/** Version of LazyStack that is running, recorded in every generated `lazystack.json` as `$generator`. */
export const GENERATOR_VERSION: string = appPackage.version

/** Metadata keys in an embedded `lazystack.json` that are not part of `ProjectSettings`. */
export interface BlueprintMeta {
  /** Blueprint format version. */
  $lazystack?: number
  /** LazyStack version that generated the project (added in 2.1.0). */
  $generator?: string
}

/** Splits an embedded blueprint into its metadata and the plain settings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function splitBlueprint(raw: any): { meta: BlueprintMeta; settings: any } {
  const { $lazystack, $generator, ...settings } = raw || {}
  return { meta: { $lazystack, $generator }, settings }
}
