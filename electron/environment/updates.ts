/**
 * "New version available" check against GitHub Releases. No auto-install: the UI shows a banner
 * that opens the release page. Results are cached for six hours; failures are silent.
 */
export const RELEASES_URL = 'https://github.com/Ian-nwb/LazyStack/releases'
const LATEST_API = 'https://api.github.com/repos/Ian-nwb/LazyStack/releases/latest'
const CACHE_MS = 6 * 60 * 60 * 1000

export interface UpdateInfo {
  current: string
  latest?: string
  url?: string
  updateAvailable: boolean
}

let cache: { at: number; info: UpdateInfo } | null = null

/** Compares dotted numeric versions (a leading `v` and any `-prerelease` suffix are ignored). */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parts = (v: string) => v.replace(/^v/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0)
  const a = parts(candidate)
  const b = parts(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0)
  }
  return false
}

export async function checkForUpdate(current: string): Promise<UpdateInfo> {
  if (cache && Date.now() - cache.at < CACHE_MS && cache.info.current === current) return cache.info
  let info: UpdateInfo = { current, updateAvailable: false }
  try {
    const res = await fetch(LATEST_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'LazyStack-update-check' },
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const body = await res.json() as { tag_name?: string; html_url?: string; draft?: boolean; prerelease?: boolean }
      if (body.tag_name && !body.draft && !body.prerelease) {
        info = { current, latest: body.tag_name.replace(/^v/, ''), url: body.html_url, updateAvailable: isNewerVersion(body.tag_name, current) }
      }
    }
  } catch {
    // Offline or rate-limited: no banner.
  }
  cache = { at: Date.now(), info }
  return info
}

/** Only this project's release pages may be opened from the update banner. */
export const isReleaseUrl = (url: string) => typeof url === 'string' && url.startsWith(`${RELEASES_URL}/`)
