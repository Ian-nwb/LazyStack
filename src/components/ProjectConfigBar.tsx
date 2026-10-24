import React, { useEffect, useState, useRef } from 'react'
import { Folder, FolderCheck, AlertCircle, HardDriveDownload, ShieldAlert } from 'lucide-react'
import { validateFolderName, validatePath, joinPaths } from '../utils/pathValidation'

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

  // Validate Project Name
  const nameValidation = validateFolderName(projectName, 'project')
  const hasNameError = !nameValidation.valid
  const nameErrorText = nameValidation.error || ''

  // Validate Parent Directory Path
  const pathValidation = validatePath(parentDir)
  const hasPathError = Boolean(parentDir.trim() && !pathValidation.valid)
  const pathErrorText = pathValidation.error || ''

  // Intelligently compute destination path preserving OS separator
  const targetPath = parentDir.trim() && projectName.trim()
    ? joinPaths(parentDir, projectName)
    : (parentDir.trim() || projectName.trim())

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
        // Fallback for Vite web browser mode
        fetch('/api/get-default-path')
          .then((res) => res.json())
          .then((data) => {
            if (data?.defaultPath) setParentDir(data.defaultPath)
          })
          .catch(() => setParentDir(''))
      }
    }
  }, [parentDir, setParentDir])

  useEffect(() => {
    if (targetPath && window.electronAPI?.checkDirectory && !hasNameError && !hasPathError) {
      window.electronAPI.checkDirectory(targetPath).then(setDirStatus).catch(console.error)
    } else {
      setDirStatus(null)
    }
  }, [targetPath, hasNameError, hasPathError])

  const handleBrowse = async () => {
    try {
      // 1. Native Electron Dialog (Desktop)
      if (window.electronAPI?.selectDirectory) {
        const selected = await window.electronAPI.selectDirectory(parentDir)
        if (selected) {
          setParentDir(selected)
        }
        return
      }

      // 2. Server-side native dialog via Vite dev API (Works on all OSes)
      try {
        const response = await fetch('/api/select-directory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultPath: parentDir || '' })
        })
        if (response.ok) {
          const data = await response.json()
          if (data?.selected) {
            setParentDir(data.selected)
            return
          }
          // User cancelled the dialog
          return
        }
      } catch {
        // Endpoint not available, fall through to browser APIs
      }

      // 3. Modern Web File System Access API (Chrome / Edge)
      if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
          if (dirHandle && dirHandle.name) {
            setParentDir(dirHandle.name)
            return
          }
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') return // User canceled
          console.warn('showDirectoryPicker failed, falling back:', pickerErr)
        }
      }

      // 4. Browser fallback via hidden directory input
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    } catch (err) {
      console.warn('Directory selection failed, falling back to input:', err)
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const pathWithFolder = (file as any).path
      if (pathWithFolder && typeof pathWithFolder === 'string') {
        // Handle both Windows (\) and POSIX (/) path separators safely
        const lastSep = Math.max(pathWithFolder.lastIndexOf('/'), pathWithFolder.lastIndexOf('\\'))
        if (lastSep > 0) {
          setParentDir(pathWithFolder.substring(0, lastSep))
        } else {
          setParentDir(pathWithFolder)
        }
      } else if (file.webkitRelativePath) {
        const folderName = file.webkitRelativePath.split(/[/\\]/)[0]
        if (folderName) setParentDir(folderName)
      }
      // Reset input value so re-picking the same folder triggers onChange
      e.target.value = ''
    }
  }

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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Project Name */}
        <div className="md:col-span-4">
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Project Name</span>
            {hasNameError && (
              <span className="text-rose-400 text-[10px] font-normal lowercase flex items-center gap-1 truncate max-w-[220px]" title={nameErrorText}>
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" /> {nameErrorText}
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
                  ? 'border-rose-500/80 focus:border-rose-400 bg-rose-950/10'
                  : 'border-surface-650 focus:border-zinc-300'
              }`}
            />
          </div>
        </div>

        {/* Parent Directory */}
        <div className="md:col-span-5">
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Parent Directory</span>
            {hasPathError ? (
              <span className="text-rose-400 text-[10px] font-normal lowercase flex items-center gap-1 truncate max-w-[220px]" title={pathErrorText}>
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" /> {pathErrorText}
              </span>
            ) : (
              <span className="text-zinc-500 text-[10px] font-normal font-mono">Location</span>
            )}
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={parentDir}
              onChange={(e) => setParentDir(e.target.value)}
              placeholder="e.g. C:\Users\YourName\Projects or /home/user/Projects"
              className={`flex-1 bg-surface-950 border rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none transition ${
                hasPathError
                  ? 'border-rose-500/80 focus:border-rose-400 bg-rose-950/10'
                  : 'border-surface-650 focus:border-zinc-300'
              }`}
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

        {/* Resolved Path Destination Contract */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Destination Contract</span>
            {dirStatus?.writable === false && (
              <span className="text-rose-400 text-[10px] font-normal lowercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Read-only
              </span>
            )}
          </label>
          <div className={`bg-surface-950 border rounded-lg px-3 py-2 flex items-center justify-between overflow-hidden ${
            hasNameError || hasPathError || dirStatus?.writable === false
              ? 'border-rose-900/60'
              : 'border-surface-700'
          }`}>
            <span
              className={`font-mono text-xs truncate ${
                hasNameError || hasPathError
                  ? 'text-rose-400/80 line-through'
                  : 'text-zinc-300'
              }`}
              title={targetPath}
            >
              {targetPath || 'Path preview...'}
            </span>
            <span className="shrink-0 ml-2">
              {hasNameError || hasPathError ? (
                <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-400" /> Invalid Path
                </span>
              ) : dirStatus ? (
                dirStatus.writable === false ? (
                  <span
                    className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/80 px-1.5 py-0.5 rounded flex items-center gap-1"
                    title={dirStatus.error || 'Write permission denied'}
                  >
                    <ShieldAlert className="w-3 h-3 text-rose-400" /> Read-Only
                  </span>
                ) : dirStatus.exists ? (
                  dirStatus.empty ? (
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <FolderCheck className="w-3 h-3 text-zinc-400" /> Empty
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded flex items-center gap-1" title={`${dirStatus.fileCount} existing files will be overwritten or merged`}>
                      <AlertCircle className="w-3 h-3 text-amber-400" /> {dirStatus.fileCount} items
                    </span>
                  )
                ) : (
                  <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <HardDriveDownload className="w-3 h-3 text-zinc-300" /> New
                  </span>
                )
              ) : (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
                  Checking...
                </span>
              )}
            </span>
          </div>
          {dirStatus?.writable === false && (
            <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="w-2.5 h-2.5 shrink-0" /> {dirStatus.error || 'Permission denied: directory is write-protected'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
