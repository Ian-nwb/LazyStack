/**
 * The OS the generated project will be started on. In Node (the generator, the CLI) it is the real
 * platform; in the browser (the Blueprint preview) there is no `process`, so it is read from the
 * user agent. Generated dev commands differ on Windows and macOS.
 */
export function getHostPlatform(): 'win32' | 'darwin' | 'linux' {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux'
  }
  const agent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/Windows/i.test(agent)) return 'win32'
  if (/Mac/i.test(agent)) return 'darwin'
  return 'linux'
}
