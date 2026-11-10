import { CartApp, ProxyConfig, ServiceConnection } from '../types'

export function getDefaultConnectionEnvVar(source: CartApp, target: CartApp): string {
  const targetName = target.folderName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  // Mobile clients only see variables with their bundler's public prefix.
  if (source.techId === 'react-native-expo') return `EXPO_PUBLIC_${targetName}_API_URL`
  if (source.techId === 'capacitor-app' || source.techId === 'ionic-framework') return `VITE_${targetName}_API_URL`
  if (source.role === 'frontend' || source.role === 'fullstack') {
    const publicPrefix = source.techId.includes('nextjs')
      ? 'NEXT_PUBLIC'
      : source.techId.includes('svelte') || source.techId.includes('astro')
        ? 'PUBLIC'
        : source.techId.includes('angular')
          ? 'NG_APP'
          : 'VITE'
    return `${publicPrefix}_${targetName}_API_URL`
  }
  return `${targetName}_API_URL`
}

/** Mobile apps whose code runs on the device/WebView rather than in a server process. */
const CLIENT_SIDE_APPS = new Set(['react-native-expo', 'capacitor-app', 'ionic-framework'])

export function resolveServiceConnectionUrl(
  source: CartApp,
  target: CartApp,
  proxy: ProxyConfig,
  connection: Pick<ServiceConnection, 'protocol' | 'customUrl'>
): string {
  if (connection.protocol === 'custom') return connection.customUrl || ''

  const scheme = connection.protocol
  // Browser and WebView clients call the API from the user's device, so they need a host-reachable URL.
  if (source.role === 'frontend' || source.role === 'fullstack' || CLIENT_SIDE_APPS.has(source.techId)) {
    const route = proxy.type !== 'none' && proxy.httpPort > 0
      ? (target.routePrefix && target.routePrefix !== '/' ? `/${target.routePrefix.replace(/^\/+|\/+$/g, '')}` : '')
      : ''
    const port = proxy.type !== 'none' && proxy.httpPort > 0 ? proxy.httpPort : target.port
    return `${scheme}://localhost:${port}${route}`
  }

  const targetHost = source.runMode === 'docker'
    ? target.runMode === 'docker' ? target.folderName : 'host.docker.internal'
    : 'localhost'
  return `${scheme}://${targetHost}:${target.port}`
}
