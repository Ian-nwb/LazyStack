/**
 * Path and folder name validation utilities for LazyStack
 * Cross-platform support for Windows, Linux, and macOS.
 */

// Windows reserved device names (case-insensitive)
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
])

// Illegal characters in Windows folder and file names: < > : " / \ | ? *
// Also control characters 0x00-0x1F
const ILLEGAL_FOLDER_CHARS = /[<>:"/\\|?*\x00-\x1F]/

// Illegal characters anywhere in a Windows path except the drive colon
const ILLEGAL_PATH_CHARS = /[<>"|?*\x00-\x1F]/

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Checks if a name is a Windows reserved system name (e.g. CON, PRN, AUX, NUL, COM1, etc.)
 */
export function isWindowsReservedName(name: string): boolean {
  if (!name) return false
  const clean = name.trim().toUpperCase()
  // Check exact match or basename before first extension (e.g. CON.txt or COM1.bak)
  const base = clean.split('.')[0]
  return WINDOWS_RESERVED_NAMES.has(clean) || WINDOWS_RESERVED_NAMES.has(base)
}

/**
 * Validates a single folder name (such as project name or app folder name)
 */
export function validateFolderName(
  name: string,
  context: 'project' | 'app' = 'project'
): ValidationResult {
  const trimmed = name?.trim() || ''

  if (!trimmed) {
    return {
      valid: false,
      error: `${context === 'project' ? 'Project name' : 'Folder name'} cannot be empty`
    }
  }

  if (trimmed === '.' || trimmed === '..') {
    return {
      valid: false,
      error: 'Folder name cannot be "." or ".."'
    }
  }

  if (trimmed.length > 255) {
    return {
      valid: false,
      error: 'Folder name cannot exceed 255 characters'
    }
  }

  if (isWindowsReservedName(trimmed)) {
    return {
      valid: false,
      error: `"${trimmed}" is a reserved system name on Windows`
    }
  }

  if (ILLEGAL_FOLDER_CHARS.test(trimmed)) {
    return {
      valid: false,
      error: 'Folder name cannot contain < > : " / \\ | ? * or control characters'
    }
  }

  // Windows prohibits trailing period or space
  if (/[. ]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Folder name cannot end with a period or space (Windows restriction)'
    }
  }

  // Windows prohibits starting with a space
  if (/^\s/.test(name)) {
    return {
      valid: false,
      error: 'Folder name cannot start with a space'
    }
  }

  // In containerized monorepos, spaces in app folder names break docker-compose context paths and CLI commands
  if (context === 'app' && /\s/.test(trimmed)) {
    return {
      valid: false,
      error: 'App folder names cannot contain spaces (use hyphens or underscores)'
    }
  }

  return { valid: true }
}

/**
 * Validates a directory path (such as parent directory or target project path)
 */
export function validatePath(pathStr: string): ValidationResult {
  const trimmed = pathStr?.trim() || ''

  if (!trimmed) {
    return {
      valid: false,
      error: 'Location path cannot be empty'
    }
  }

  // Check for illegal characters in the path
  if (ILLEGAL_PATH_CHARS.test(trimmed)) {
    return {
      valid: false,
      error: 'Path contains illegal characters: < > " | ? *'
    }
  }

  const isWindows = /^[a-zA-Z]:/.test(trimmed) || trimmed.includes('\\')

  if (isWindows) {
    // Check drive letter format: must start with letter followed by colon
    if (/^[a-zA-Z]:/.test(trimmed)) {
      // Colon is only valid right after the drive letter (index 1)
      const afterDrive = trimmed.substring(2)
      if (afterDrive.includes(':')) {
        return {
          valid: false,
          error: 'Drive path contains an invalid colon ":" after drive letter'
        }
      }

      // Check if drive has separator or is just "C:"
      if (trimmed.length === 2) {
        return {
          valid: false,
          error: 'Windows drive path must include a root slash (e.g. C:\\)'
        }
      }
    } else if (trimmed.startsWith('\\\\')) {
      // UNC network path (e.g. \\server\share) - valid Windows path
    } else if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
      // Relative to current drive root
    } else {
      return {
        valid: false,
        error: 'Please specify an absolute Windows path (e.g. C:\\Users\\...)'
      }
    }

    // Check each segment for trailing period or space on Windows
    const segments = trimmed.split(/[/\\]+/).filter(Boolean)
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      // Skip drive letter segment like "C:"
      if (/^[a-zA-Z]:$/.test(seg)) continue

      if (isWindowsReservedName(seg)) {
        return {
          valid: false,
          error: `Path segment "${seg}" is a reserved Windows system name`
        }
      }

      if (/[. ]+$/.test(seg)) {
        return {
          valid: false,
          error: `Path segment "${seg}" cannot end with a period or space`
        }
      }
    }
  } else {
    // POSIX path checks (Linux / macOS)
    if (!trimmed.startsWith('/') && !trimmed.startsWith('~')) {
      return {
        valid: false,
        error: 'Please specify an absolute path (e.g. /home/... or /Users/...)'
      }
    }

    if (trimmed.includes('\0')) {
      return {
        valid: false,
        error: 'Path contains invalid null byte'
      }
    }
  }

  return { valid: true }
}

/**
 * Normalizes a directory path by stripping redundant trailing slashes
 * while preserving drive roots (e.g. "C:\" or "/")
 */
export function normalizeDirectoryPath(p: string): string {
  if (!p) return ''
  const trimmed = p.trim()
  if (/^[a-zA-Z]:[/\\]$/.test(trimmed) || trimmed === '/') {
    return trimmed
  }
  return trimmed.replace(/[/\\]+$/, '')
}

/**
 * Intelligently joins a parent directory and a child folder name
 * using the proper path separator based on OS / path format.
 */
export function joinPaths(parent: string, child: string): string {
  if (!parent) return child?.trim() || ''
  if (!child) return parent?.trim() || ''

  const cleanParent = parent.trim()
  const cleanChild = child.trim().replace(/^[/\\]+/, '')
  const isWindows = /^[a-zA-Z]:/.test(cleanParent) || cleanParent.includes('\\')
  const sep = isWindows ? '\\' : '/'

  // If parent is just root like "C:\" or "/"
  if (/^[a-zA-Z]:[/\\]$/.test(cleanParent)) {
    return `${cleanParent}${cleanChild}`
  }
  if (cleanParent === '/') {
    return `/${cleanChild}`
  }

  const base = cleanParent.replace(/[/\\]+$/, '')
  return `${base}${sep}${cleanChild}`
}
