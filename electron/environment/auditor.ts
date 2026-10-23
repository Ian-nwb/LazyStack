import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import path from 'path'

const execAsync = promisify(exec)

export interface BinaryAudit {
  id: string
  name: string
  binary: string
  category: 'core' | 'compiler' | 'runtime' | 'package-manager'
  installed: boolean
  version?: string
  installCommand?: {
    linuxApt?: string
    linuxPacman?: string
    linuxDnf?: string
    macosBrew?: string
    windowsWinget?: string
  }
}

// Ensure common user directories are in process.env.PATH
export function ensureUserPathsInEnv(): void {
  const home = os.homedir()
  const userPaths = [
    path.join(home, '.bun', 'bin'),
    path.join(home, '.cargo', 'bin'),
    path.join(home, '.deno', 'bin'),
    path.join(home, '.local', 'bin'),
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin'
  ]

  const currentPath = process.env.PATH || ''
  const currentSegments = currentPath.split(path.delimiter)

  for (const p of userPaths) {
    if (!currentSegments.includes(p)) {
      currentSegments.unshift(p)
    }
  }

  process.env.PATH = currentSegments.join(path.delimiter)
}

export const MONITORED_BINARIES: Array<{
  id: string
  name: string
  binary: string
  category: BinaryAudit['category']
  versionFlag: string
  installCommand: BinaryAudit['installCommand']
}> = [
  {
    id: 'docker',
    name: 'Docker Engine',
    binary: 'docker',
    category: 'core',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y docker.io docker-compose-plugin',
      linuxPacman: 'pacman -S --noconfirm docker docker-compose',
      linuxDnf: 'dnf install -y docker docker-compose',
      macosBrew: 'brew install --cask docker',
      windowsWinget: 'winget install Docker.DockerDesktop'
    }
  },
  {
    id: 'node',
    name: 'Node.js Runtime',
    binary: 'node',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y nodejs npm',
      linuxPacman: 'pacman -S --noconfirm nodejs npm',
      linuxDnf: 'dnf install -y nodejs npm',
      macosBrew: 'brew install node',
      windowsWinget: 'winget install OpenJS.NodeJS.LTS'
    }
  },
  {
    id: 'npm',
    name: 'npm (Node Package Manager)',
    binary: 'npm',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y npm',
      linuxPacman: 'pacman -S --noconfirm npm',
      linuxDnf: 'dnf install -y npm',
      macosBrew: 'brew install npm',
      windowsWinget: 'winget install OpenJS.NodeJS.LTS'
    }
  },
  {
    id: 'bun',
    name: 'Bun Runtime & Package Manager',
    binary: 'bun',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'curl -fsSL https://bun.sh/install | bash',
      linuxPacman: 'pacman -S --noconfirm bun',
      linuxDnf: 'curl -fsSL https://bun.sh/install | bash',
      macosBrew: 'brew install oven-sh/bun/bun',
      windowsWinget: 'winget install Oven-sh.Bun'
    }
  },
  {
    id: 'deno',
    name: 'Deno Runtime',
    binary: 'deno',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'curl -fsSL https://deno.land/install.sh | sh',
      linuxPacman: 'pacman -S --noconfirm deno',
      linuxDnf: 'curl -fsSL https://deno.land/install.sh | sh',
      macosBrew: 'brew install deno',
      windowsWinget: 'winget install DenoLand.Deno'
    }
  },
  {
    id: 'dotnet',
    name: '.NET SDK / ASP.NET Core',
    binary: 'dotnet',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y dotnet-sdk-8.0',
      linuxPacman: 'pacman -S --noconfirm dotnet-sdk',
      linuxDnf: 'dnf install -y dotnet-sdk-8.0',
      macosBrew: 'brew install dotnet',
      windowsWinget: 'winget install Microsoft.DotNet.SDK.8'
    }
  },
  {
    id: 'nasm',
    name: 'NASM (Assembly Compiler)',
    binary: 'nasm',
    category: 'compiler',
    versionFlag: '-v',
    installCommand: {
      linuxApt: 'apt-get install -y nasm',
      linuxPacman: 'pacman -S --noconfirm nasm',
      linuxDnf: 'dnf install -y nasm',
      macosBrew: 'brew install nasm',
      windowsWinget: 'winget install NASM.NASM'
    }
  },
  {
    id: 'gcc',
    name: 'GCC (C / C++ Compiler)',
    binary: 'gcc',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y build-essential',
      linuxPacman: 'pacman -S --noconfirm base-devel',
      linuxDnf: 'dnf groupinstall -y "Development Tools"',
      macosBrew: 'brew install gcc',
      windowsWinget: 'winget install MSYS2.MSYS2'
    }
  },
  {
    id: 'go',
    name: 'Go Toolchain',
    binary: 'go',
    category: 'runtime',
    versionFlag: 'version',
    installCommand: {
      linuxApt: 'apt-get install -y golang',
      linuxPacman: 'pacman -S --noconfirm go',
      linuxDnf: 'dnf install -y golang',
      macosBrew: 'brew install go',
      windowsWinget: 'winget install GoLang.Go'
    }
  },
  {
    id: 'cargo',
    name: 'Rust (Cargo / rustc)',
    binary: 'cargo',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
      linuxPacman: 'pacman -S --noconfirm rust',
      linuxDnf: 'dnf install -y cargo rust',
      macosBrew: 'brew install rust',
      windowsWinget: 'winget install Rustlang.Rustup'
    }
  },
  {
    id: 'python3',
    name: 'Python 3',
    binary: 'python3',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y python3 python3-pip',
      linuxPacman: 'pacman -S --noconfirm python python-pip',
      linuxDnf: 'dnf install -y python3 python3-pip',
      macosBrew: 'brew install python@3.11',
      windowsWinget: 'winget install Python.Python.3.11'
    }
  },
  {
    id: 'pip3',
    name: 'pip (Python Package Manager)',
    binary: 'pip3',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y python3-pip',
      linuxPacman: 'pacman -S --noconfirm python-pip',
      linuxDnf: 'dnf install -y python3-pip',
      macosBrew: 'brew install python@3.11',
      windowsWinget: 'winget install Python.Python.3.11'
    }
  },
  {
    id: 'php',
    name: 'PHP CLI',
    binary: 'php',
    category: 'runtime',
    versionFlag: '-v',
    installCommand: {
      linuxApt: 'apt-get install -y php-cli php-mbstring',
      linuxPacman: 'pacman -S --noconfirm php',
      linuxDnf: 'dnf install -y php-cli',
      macosBrew: 'brew install php',
      windowsWinget: 'winget install PHP.PHP'
    }
  },
  {
    id: 'composer',
    name: 'PHP Composer',
    binary: 'composer',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y composer',
      linuxPacman: 'pacman -S --noconfirm composer',
      linuxDnf: 'dnf install -y composer',
      macosBrew: 'brew install composer',
      windowsWinget: 'winget install Composer.Composer'
    }
  },
  {
    id: 'java',
    name: 'Java JDK 17+',
    binary: 'java',
    category: 'runtime',
    versionFlag: '-version',
    installCommand: {
      linuxApt: 'apt-get install -y openjdk-17-jdk',
      linuxPacman: 'pacman -S --noconfirm jdk17-openjdk',
      linuxDnf: 'dnf install -y java-17-openjdk-devel',
      macosBrew: 'brew install openjdk@17',
      windowsWinget: 'winget install Oracle.JDK.17'
    }
  },
  {
    id: 'mvn',
    name: 'Maven (Java Build Tool)',
    binary: 'mvn',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y maven',
      linuxPacman: 'pacman -S --noconfirm maven',
      linuxDnf: 'dnf install -y maven',
      macosBrew: 'brew install maven',
      windowsWinget: 'winget install Apache.Maven'
    }
  },
  {
    id: 'mix',
    name: 'Mix (Elixir Build Tool)',
    binary: 'mix',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y elixir',
      linuxPacman: 'pacman -S --noconfirm elixir',
      linuxDnf: 'dnf install -y elixir',
      macosBrew: 'brew install elixir',
      windowsWinget: 'winget install Elixir.Elixir'
    }
  },
  {
    id: 'ghc',
    name: 'Haskell GHC & Cabal',
    binary: 'ghc',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y ghc cabal-install',
      linuxPacman: 'pacman -S --noconfirm ghc cabal-install',
      linuxDnf: 'dnf install -y ghc cabal-install',
      macosBrew: 'brew install ghc cabal-install',
      windowsWinget: 'winget install Haskell.GHC'
    }
  },
  {
    id: 'zig',
    name: 'Zig Toolchain',
    binary: 'zig',
    category: 'compiler',
    versionFlag: 'version',
    installCommand: {
      linuxApt: 'snap install zig --classic',
      linuxPacman: 'pacman -S --noconfirm zig',
      linuxDnf: 'dnf install -y zig',
      macosBrew: 'brew install zig',
      windowsWinget: 'winget install zig.zig'
    }
  },
  {
    id: 'flutter',
    name: 'Flutter SDK',
    binary: 'flutter',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'snap install flutter --classic',
      linuxPacman: 'pacman -S --noconfirm flutter',
      macosBrew: 'brew install --cask flutter',
      windowsWinget: 'winget install Google.Flutter'
    }
  }
]

export async function auditEnvironment(): Promise<BinaryAudit[]> {
  ensureUserPathsInEnv()
  const results: BinaryAudit[] = []

  for (const item of MONITORED_BINARIES) {
    try {
      const { stdout, stderr } = await execAsync(`${item.binary} ${item.versionFlag}`, { 
        timeout: 3000,
        env: process.env
      })
      const output = (stdout || stderr || '').trim().split('\n')[0]
      results.push({
        id: item.id,
        name: item.name,
        binary: item.binary,
        category: item.category,
        installed: true,
        version: output,
        installCommand: item.installCommand
      })
    } catch {
      results.push({
        id: item.id,
        name: item.name,
        binary: item.binary,
        category: item.category,
        installed: false,
        installCommand: item.installCommand
      })
    }
  }

  return results
}
