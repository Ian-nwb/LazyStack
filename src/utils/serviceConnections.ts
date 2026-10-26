import { CartApp, ProxyConfig, ServiceConnection } from '../types'

export function getDefaultConnectionEnvVar(source: CartApp, target: CartApp): string {
  const targetName = target.folderName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
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

export function resolveServiceConnectionUrl(
  source: CartApp,
  target: CartApp,
  proxy: ProxyConfig,
  connection: Pick<ServiceConnection, 'protocol' | 'customUrl'>
): string {
  if (connection.protocol === 'custom') return connection.customUrl || ''

  const scheme = connection.protocol
  if (source.role === 'frontend' || source.role === 'fullstack') {
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
