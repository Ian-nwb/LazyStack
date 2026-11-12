import net from 'net'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface PortProbe {
  port: number
  inUse: boolean
  /** Owning process, when the platform tool could find it (`name (pid 123)`). */
  process?: string
}

/** True when something already listens on the port, on either loopback or all interfaces. */
function isPortBusy(port: number): Promise<boolean> {
  const tryBind = (host: string) => new Promise<boolean>(resolve => {
    const server = net.createServer()
    server.once('error', (error: NodeJS.ErrnoException) => resolve(error.code === 'EADDRINUSE' || error.code === 'EACCES'))
    server.once('listening', () => server.close(() => resolve(false)))
    server.listen({ port, host, exclusive: true })
  })
  // Sequential on purpose: loopback and wildcard binds of the same port would collide with each other.
  return tryBind('127.0.0.1').then(busy => busy || tryBind('0.0.0.0'))
}

/** Best effort lookup of the process listening on a port; undefined when no tool can tell. */
async function findOwner(port: number): Promise<string | undefined> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('netstat -ano -p tcp', { timeout: 4000 })
      const line = stdout.split(/\r?\n/).find(row => /LISTENING/.test(row) && new RegExp(`[:.]${port}\\s`).test(row))
      const pid = line?.trim().split(/\s+/).pop()
      return pid ? `pid ${pid}` : undefined
    }
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -Fpc`, { timeout: 4000 })
      const pid = stdout.match(/^p(\d+)/m)?.[1]
      const name = stdout.match(/^c(.+)$/m)?.[1]
      return pid ? `${name || 'process'} (pid ${pid})` : undefined
    }
    const { stdout } = await execAsync('ss -ltnpH', { timeout: 4000 })
    const line = stdout.split('\n').find(row => new RegExp(`[:.]${port}\\s`).test(row))
    const match = line?.match(/users:\(\("([^"]+)",pid=(\d+)/)
    return match ? `${match[1]} (pid ${match[2]})` : undefined
  } catch {
    return undefined
  }
}

/** Probes each port on the local machine. Ports are checked in parallel; the owner lookup runs only for busy ports. */
export async function probePorts(ports: number[]): Promise<PortProbe[]> {
  const unique = [...new Set(ports.filter(port => Number.isInteger(port) && port > 0 && port < 65536))]
  return Promise.all(unique.map(async port => {
    const inUse = await isPortBusy(port)
    return inUse ? { port, inUse, process: await findOwner(port) } : { port, inUse }
  }))
}
