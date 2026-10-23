import React, { useEffect, useState, useRef } from 'react'
import { Folder, FolderCheck, AlertCircle, HardDriveDownload } from 'lucide-react'

interface ProjectConfigBarProps {
  projectName: string
  setProjectName: (name: string) => void
  parentDir: string
  setParentDir: (dir: string) => void
  onValidityChange?: (isValid: boolean, errorMsg?: string) => void
}

export const ProjectConfigBar: React.FC<ProjectConfigBarProps> = ({
  projectName,
  setProjectName,
  parentDir,
  setParentDir,
}) => {
  const [dirStatus, setDirStatus] = useState<{
    exists: boolean
    empty: boolean
    fileCount?: number
    writable: boolean
    error?: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const sanitizedName = projectName.trim()
  const targetPath = parentDir ? `${parentDir.replace(/\/+$/, '')}/${sanitizedName}` : ''

  // Project name validation
  const isValidName = /^[a-zA-Z0-9_-]+$/.test(sanitizedName)
  const isReserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'].includes(sanitizedName.toUpperCase())

  useEffect(() => {
    // Initialize default parent path dynamically from host OS
    if (!parentDir) {
      if (window.electronAPI?.getDefaultPath) {
        window.electronAPI.getDefaultPath().then((defaultPath) => {
          if (defaultPath) setParentDir(defaultPath)
        }).catch(() => {
          setParentDir('')
        })
      } else {
        setParentDir('')
      }
    }
  }, [parentDir, setParentDir])

  useEffect(() => {
    if (targetPath && window.electronAPI?.checkDirectory && isValidName && !isReserved) {
      window.electronAPI.checkDirectory(targetPath).then(setDirStatus).catch(console.error)
    }
  }, [targetPath, isValidName, isReserved])

  const handleBrowse = async () => {
    try {
      if (window.electronAPI?.selectDirectory) {
        const selected = await window.electronAPI.selectDirectory(parentDir)
        if (selected) {
          setParentDir(selected)
          return
        }
      }
      // Browser fallback
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    } catch (err) {
      console.warn('Native picker failed, falling back to input:', err)
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // In Chromium webkitRelativePath starts with folder name
      const file = e.target.files[0]
      const pathWithFolder = (file as any).path
      if (pathWithFolder) {
        // Electron / local file path
        const parent = pathWithFolder.substring(0, pathWithFolder.lastIndexOf('/'))
        setParentDir(parent)
      } else {
        // Fallback relative
        const folderName = file.webkitRelativePath.split('/')[0]
        setParentDir(folderName)
      }
    }
  }

  const hasNameError = !isValidName || isReserved
  const nameErrorText = isReserved
    ? 'Reserved Windows system name'
    : !isValidName
    ? 'Only alphanumeric characters, dashes, and underscores allowed'
    : ''

  return (
    <div className="bg-surface-900 p-4 border-b border-surface-700">
      {/* Hidden directory picker input fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Project Name */}
        <div className="md:col-span-4">
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Project Name</span>
            {hasNameError && (
              <span className="text-zinc-400 text-[10px] font-normal lowercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-zinc-400" /> {nameErrorText}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. my-monorepo or enterprise-platform"
              className={`w-full bg-surface-950 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none transition ${
                hasNameError
                  ? 'border-zinc-500'
                  : 'border-surface-650 focus:border-zinc-300'
              }`}
            />
          </div>
        </div>

        {/* Parent Directory */}
        <div className="md:col-span-5">
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Parent Directory</span>
            <span className="text-zinc-500 text-[10px] font-normal font-mono">Location</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={parentDir}
              onChange={(e) => setParentDir(e.target.value)}
              placeholder="/home/user/Projects"
              className="flex-1 bg-surface-950 border border-surface-650 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-300 transition"
            />
            <button
              onClick={handleBrowse}
              type="button"
              className="px-3.5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg border border-zinc-200 transition flex items-center gap-1.5 text-xs shrink-0 cursor-pointer shadow-sm active:scale-95"
            >
              <Folder className="w-3.5 h-3.5 text-zinc-950" />
              Browse
            </button>
          </div>
        </div>

        {/* Resolved Path Preview */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Destination Contract
          </label>
          <div className="bg-surface-950 border border-surface-700 rounded-lg px-3 py-2 flex items-center justify-between overflow-hidden">
            <span className="font-mono text-xs text-zinc-300 truncate" title={targetPath}>
              {targetPath || 'Path preview...'}
            </span>
            {dirStatus && (
              <span className="shrink-0 ml-2">
                {dirStatus.exists ? (
                  dirStatus.empty ? (
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <FolderCheck className="w-3 h-3 text-zinc-400" /> Empty
                    </span>
                  ) : (
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-zinc-400" /> {dirStatus.fileCount} items
                    </span>
                  )
                ) : (
                  <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <HardDriveDownload className="w-3 h-3 text-zinc-300" /> New
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
