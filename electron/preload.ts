import { contextBridge, ipcRenderer } from 'electron'
import { ProjectSettings } from '../src/types'
import { BinaryAudit } from './environment/auditor'
import { InstallResult } from './environment/installer'

export interface IElectronAPI {
  getDefaultPath: () => Promise<string>
  selectDirectory: (defaultPath?: string) => Promise<string | null>
  checkDirectory: (targetPath: string) => Promise<{
    exists: boolean
    empty: boolean
    fileCount?: number
    writable: boolean
    error?: string
  }>
  checkPortAvailable: (port: number) => Promise<{
    port: number
    available: boolean
    suggested?: number
    error?: string
  }>
  getSystemInfo: () => Promise<{
    platform: string
    arch: string
    homedir: string
    cpus: number
    freeMemoryGB: number
    totalMemoryGB: number
  }>
  scaffoldProject: (settings: ProjectSettings) => Promise<{
    success: boolean
    targetDir: string
    filesCreated: number
    error?: string
  }>
  openFolder: (targetPath: string) => Promise<void>
  openVSCode: (targetPath: string) => Promise<void>
  openTerminal: (targetPath: string) => Promise<{ success: boolean, error?: string }>
  installDependencies: (targetPath: string) => Promise<{ success: boolean, output?: string, error?: string }>
  startStack: (targetPath: string) => Promise<{ success: boolean, output?: string, error?: string }>
  stopStack: (targetPath: string) => Promise<{ success: boolean, output?: string, error?: string }>
  auditEnvironment: () => Promise<BinaryAudit[]>
  installBinary: (binaryId: string) => Promise<InstallResult>
  addToPath: (dirPath: string) => Promise<boolean>
}

const api: IElectronAPI = {
  getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
  selectDirectory: (defaultPath?: string) => ipcRenderer.invoke('select-directory', defaultPath),
  checkDirectory: (targetPath: string) => ipcRenderer.invoke('check-directory', targetPath),
  checkPortAvailable: (port: number) => ipcRenderer.invoke('check-port-available', port),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  scaffoldProject: (settings: ProjectSettings) => ipcRenderer.invoke('scaffold-project', settings),
  openFolder: (targetPath: string) => ipcRenderer.invoke('open-folder', targetPath),
  openVSCode: (targetPath: string) => ipcRenderer.invoke('open-vscode', targetPath),
  openTerminal: (targetPath: string) => ipcRenderer.invoke('open-terminal', targetPath),
  installDependencies: (targetPath: string) => ipcRenderer.invoke('install-dependencies', targetPath),
  startStack: (targetPath: string) => ipcRenderer.invoke('start-stack', targetPath),
  stopStack: (targetPath: string) => ipcRenderer.invoke('stop-stack', targetPath),
  auditEnvironment: () => ipcRenderer.invoke('audit-environment'),
  installBinary: (binaryId: string) => ipcRenderer.invoke('install-binary', binaryId),
  addToPath: (dirPath: string) => ipcRenderer.invoke('add-to-path', dirPath),
}

contextBridge.exposeInMainWorld('electronAPI', api)
