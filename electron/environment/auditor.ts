import { exec, execFileSync } from 'child_process'
import fs from 'fs'
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

let loginShellPath: string[] | null = null

/**
 * GUI launches (desktop entry, AppImage) don't source the user's shell profile, so SDKs added to
 * PATH in /etc/profile.d or ~/.zshrc (Flutter, Dart, Go, ...) are invisible. Ask the login shell once.
 */
function readLoginShellPath(): string[] {
  if (loginShellPath) return loginShellPath
  loginShellPath = []
  if (process.platform === 'win32') return loginShellPath
  const shell = process.env.SHELL || '/bin/sh'
  try {
    const out = execFileSync(shell, ['-ilc', 'printf "__LS_PATH__%s__LS_PATH__" "$PATH"'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const match = out.match(/__LS_PATH__(.*?)__LS_PATH__/s)
    if (match) loginShellPath = match[1].split(path.delimiter).filter(Boolean)
  } catch {
    // A broken or slow profile must not break the audit; fall back to the static list.
  }
  return loginShellPath
}

// Ensure common user directories are in process.env.PATH
export function ensureUserPathsInEnv(): void {
  const home = os.homedir()
  const userPaths: string[] = []

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    userPaths.push(
      path.join(home, '.cargo', 'bin'),
      path.join(home, '.bun', 'bin'),
      path.join(localAppData, 'Pub', 'Cache', 'bin'),
      'C:\\src\\flutter\\bin',
      path.join(home, 'flutter', 'bin'),
      path.join(home, 'dev', 'flutter', 'bin'),
      path.join(home, '.deno', 'bin'),
      path.join(home, 'scoop', 'shims'),
      path.join(localAppData, 'Microsoft', 'WinGet', 'Links'),
      path.join(localAppData, 'Programs'),
      path.join(localAppData, 'Programs', 'Git', 'bin'),
      path.join(localAppData, 'Programs', 'Git', 'cmd'),
      path.join(appData, 'npm'),
      path.join(programFiles, 'nodejs'),
      path.join(programFiles, 'Git', 'cmd'),
      path.join(programFiles, 'Git', 'bin'),
      path.join(programFiles, 'Docker', 'Docker', 'resources', 'bin'),
      path.join(programFiles, 'dotnet'),
      path.join(programFilesX86, 'dotnet')
    )
  } else {
    userPaths.push(
      path.join(home, '.bun', 'bin'),
      path.join(home, '.cargo', 'bin'),
      path.join(home, '.deno', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, 'go', 'bin'),
      '/usr/local/go/bin',
      // Flutter / Dart SDK locations (manual installs, snap, fvm, apt dart package)
      '/opt/flutter/bin',
      path.join(home, 'flutter', 'bin'),
      path.join(home, 'development', 'flutter', 'bin'),
      path.join(home, 'snap', 'flutter', 'common', 'flutter', 'bin'),
      path.join(home, 'fvm', 'default', 'bin'),
      path.join(home, '.pub-cache', 'bin'),
      path.join(home, '.ghcup', 'bin'),
      path.join(home, '.opam', 'default', 'bin'),
      path.join(home, '.local', 'share', 'coursier', 'bin'),
      path.join(home, '.config', 'composer', 'vendor', 'bin'),
      path.join(home, '.dotnet', 'tools'),
      path.join(home, '.meteor'),
      path.join(home, '.nimble', 'bin'),
      path.join(home, '.juliaup', 'bin'),
      path.join(home, 'v'),
      path.join(home, 'goose'),
      '/opt/goose',
      '/usr/lib/dart/bin',
      '/snap/bin',
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    )
  }

  const currentPath = process.env.PATH || ''
  const currentSegments = currentPath.split(path.delimiter)

  for (const p of userPaths) {
    if (!currentSegments.includes(p)) {
      currentSegments.unshift(p)
    }
  }

  for (const p of readLoginShellPath()) {
    if (!currentSegments.includes(p) && fs.existsSync(p)) currentSegments.push(p)
  }

  process.env.PATH = currentSegments.join(path.delimiter)
}

export const MONITORED_BINARIES: Array<{
  id: string
  name: string
  binary: string
  category: BinaryAudit['category']
  versionFlag: string
  /** Version probe timeout in ms (default 4000). Flutter's first `--version` can take several seconds. */
  timeoutMs?: number
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
    timeoutMs: 30000,
    installCommand: {
      linuxApt: 'snap install flutter --classic',
      linuxPacman: 'pacman -S --noconfirm flutter',
      macosBrew: 'brew install --cask flutter',
      windowsWinget: 'winget install Google.Flutter'
    }
  },
  {
    id: 'dart',
    name: 'Dart SDK',
    binary: 'dart',
    category: 'runtime',
    versionFlag: '--version',
    timeoutMs: 10000,
    installCommand: {
      linuxApt: 'apt-get install -y dart',
      linuxPacman: 'pacman -S --noconfirm dart',
      macosBrew: 'brew install dart-sdk',
      windowsWinget: 'winget install Google.DartSDK'
    }
  },
  {
    id: 'jaspr',
    name: 'Jaspr CLI (optional)',
    binary: 'jaspr',
    category: 'package-manager',
    versionFlag: '--version',
    timeoutMs: 15000,
    installCommand: {
      linuxApt: 'dart pub global activate jaspr_cli',
      linuxPacman: 'dart pub global activate jaspr_cli',
      linuxDnf: 'dart pub global activate jaspr_cli',
      macosBrew: 'dart pub global activate jaspr_cli',
      windowsWinget: 'dart pub global activate jaspr_cli'
    }
  },
  {
    id: 'serverpod',
    name: 'Serverpod CLI',
    binary: 'serverpod',
    category: 'package-manager',
    versionFlag: 'version',
    timeoutMs: 15000,
    installCommand: {
      linuxApt: 'dart pub global activate serverpod_cli',
      linuxPacman: 'dart pub global activate serverpod_cli',
      linuxDnf: 'dart pub global activate serverpod_cli',
      macosBrew: 'dart pub global activate serverpod_cli',
      windowsWinget: 'dart pub global activate serverpod_cli'
    }
  },
  {
    id: 'goose',
    name: 'Goose Compiler',
    binary: 'goose',
    category: 'compiler',
    versionFlag: 'version',
    installCommand: {
      macosBrew: 'brew install goose-lang'
    }
  },
  {
    id: 'gpp',
    name: 'G++ Compiler',
    binary: 'g++',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y g++',
      linuxPacman: 'pacman -S --noconfirm gcc',
      linuxDnf: 'dnf install -y gcc-c++',
      macosBrew: 'xcode-select --install',
      windowsWinget: 'winget install MSYS2.MSYS2'
    }
  },
  {
    id: 'cmake',
    name: 'CMake',
    binary: 'cmake',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y cmake',
      linuxPacman: 'pacman -S --noconfirm cmake',
      linuxDnf: 'dnf install -y cmake',
      macosBrew: 'brew install cmake',
      windowsWinget: 'winget install Kitware.CMake'
    }
  },
  {
    id: 'bash',
    name: 'Bash Shell',
    binary: 'bash',
    category: 'core',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y bash',
      linuxPacman: 'pacman -S --noconfirm bash',
      linuxDnf: 'dnf install -y bash',
      macosBrew: 'brew install bash',
      windowsWinget: 'winget install Git.Git'
    }
  },
  {
    id: 'rustc',
    name: 'Rust Compiler',
    binary: 'rustc',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      linuxPacman: 'pacman -S --noconfirm rustup',
      linuxDnf: 'dnf install -y rust cargo',
      macosBrew: 'brew install rustup',
      windowsWinget: 'winget install Rustlang.Rustup'
    }
  },
  {
    id: 'trunk',
    name: 'Trunk (Rust WASM bundler)',
    binary: 'trunk',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'cargo install --locked trunk',
      linuxPacman: 'pacman -S --noconfirm trunk',
      linuxDnf: 'cargo install --locked trunk',
      macosBrew: 'brew install trunk',
      windowsWinget: 'cargo install --locked trunk'
    }
  },
  {
    id: 'dx',
    name: 'Dioxus CLI',
    binary: 'dx',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'cargo install dioxus-cli',
      linuxPacman: 'cargo install dioxus-cli',
      linuxDnf: 'cargo install dioxus-cli',
      macosBrew: 'cargo install dioxus-cli',
      windowsWinget: 'cargo install dioxus-cli'
    }
  },
  {
    id: 'ruby',
    name: 'Ruby Runtime',
    binary: 'ruby',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y ruby-full',
      linuxPacman: 'pacman -S --noconfirm ruby',
      linuxDnf: 'dnf install -y ruby ruby-devel',
      macosBrew: 'brew install ruby',
      windowsWinget: 'winget install RubyInstallerTeam.RubyWithDevKit.3.3'
    }
  },
  {
    id: 'gem',
    name: 'RubyGems',
    binary: 'gem',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y ruby-full',
      linuxPacman: 'pacman -S --noconfirm rubygems',
      linuxDnf: 'dnf install -y rubygems',
      macosBrew: 'brew install ruby',
      windowsWinget: 'winget install RubyInstallerTeam.RubyWithDevKit.3.3'
    }
  },
  {
    id: 'bundle',
    name: 'Bundler',
    binary: 'bundle',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'gem install bundler',
      linuxPacman: 'gem install bundler',
      linuxDnf: 'gem install bundler',
      macosBrew: 'gem install bundler',
      windowsWinget: 'gem install bundler'
    }
  },
  {
    id: 'erl',
    name: 'Erlang/OTP',
    binary: 'erl',
    category: 'runtime',
    versionFlag: '-noshell -eval \'io:fwrite("OTP ~s~n", [erlang:system_info(otp_release)]), halt().\'',
    timeoutMs: 10000,
    installCommand: {
      linuxApt: 'apt-get install -y erlang',
      linuxPacman: 'pacman -S --noconfirm erlang',
      linuxDnf: 'dnf install -y erlang',
      macosBrew: 'brew install erlang',
      windowsWinget: 'winget install Erlang.ErlangOTP'
    }
  },
  {
    id: 'elixir',
    name: 'Elixir',
    binary: 'elixir',
    category: 'runtime',
    versionFlag: '--version',
    timeoutMs: 10000,
    installCommand: {
      linuxApt: 'apt-get install -y elixir',
      linuxPacman: 'pacman -S --noconfirm elixir',
      linuxDnf: 'dnf install -y elixir',
      macosBrew: 'brew install elixir',
      windowsWinget: 'winget install ElixirLang.Elixir'
    }
  },
  {
    id: 'gleam',
    name: 'Gleam',
    binary: 'gleam',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'snap install gleam --classic',
      linuxPacman: 'pacman -S --noconfirm gleam',
      linuxDnf: 'dnf install -y gleam',
      macosBrew: 'brew install gleam',
      windowsWinget: 'winget install Gleam.Gleam'
    }
  },
  {
    id: 'cabal',
    name: 'Cabal (Haskell)',
    binary: 'cabal',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y cabal-install',
      linuxPacman: 'pacman -S --noconfirm cabal-install',
      linuxDnf: 'dnf install -y cabal-install',
      macosBrew: 'brew install cabal-install',
      windowsWinget: 'winget install Haskell.GHCup'
    }
  },
  {
    id: 'stack',
    name: 'Stack (Haskell)',
    binary: 'stack',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y haskell-stack',
      linuxPacman: 'pacman -S --noconfirm stack',
      linuxDnf: 'dnf install -y stack',
      macosBrew: 'brew install haskell-stack',
      windowsWinget: 'winget install commercialhaskell.stack'
    }
  },
  {
    id: 'opam',
    name: 'OPAM (OCaml)',
    binary: 'opam',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y opam',
      linuxPacman: 'pacman -S --noconfirm opam',
      linuxDnf: 'dnf install -y opam',
      macosBrew: 'brew install opam',
      windowsWinget: 'winget install OCaml.opam'
    }
  },
  {
    id: 'gradle',
    name: 'Gradle',
    binary: 'gradle',
    category: 'package-manager',
    versionFlag: '--version',
    timeoutMs: 30000,
    installCommand: {
      linuxApt: 'apt-get install -y gradle',
      linuxPacman: 'pacman -S --noconfirm gradle',
      linuxDnf: 'sdk install gradle',
      macosBrew: 'brew install gradle',
      windowsWinget: 'winget install Gradle.Gradle'
    }
  },
  {
    id: 'r',
    name: 'R Runtime',
    binary: 'R',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y r-base',
      linuxPacman: 'pacman -S --noconfirm r',
      linuxDnf: 'dnf install -y R',
      macosBrew: 'brew install r',
      windowsWinget: 'winget install RProject.R'
    }
  },
  {
    id: 'luajit',
    name: 'LuaJIT',
    binary: 'luajit',
    category: 'runtime',
    versionFlag: '-v',
    installCommand: {
      linuxApt: 'apt-get install -y luajit',
      linuxPacman: 'pacman -S --noconfirm luajit',
      linuxDnf: 'dnf install -y luajit',
      macosBrew: 'brew install luajit',
      windowsWinget: 'winget install DEVCOM.LuaJIT'
    }
  },
  {
    id: 'v',
    name: 'V Compiler',
    binary: 'v',
    category: 'compiler',
    versionFlag: 'version',
    installCommand: {
      linuxApt: 'git clone --depth=1 https://github.com/vlang/v ~/v && make -C ~/v && ~/v/v symlink',
      linuxPacman: 'pacman -S --noconfirm vlang',
      linuxDnf: 'git clone --depth=1 https://github.com/vlang/v ~/v && make -C ~/v && ~/v/v symlink',
      macosBrew: 'brew install vlang',
      windowsWinget: 'winget install vlang.vlang'
    }
  },
  {
    id: 'hugo',
    name: 'Hugo',
    binary: 'hugo',
    category: 'compiler',
    versionFlag: 'version',
    installCommand: {
      linuxApt: 'apt-get install -y hugo',
      linuxPacman: 'pacman -S --noconfirm hugo',
      linuxDnf: 'dnf install -y hugo',
      macosBrew: 'brew install hugo',
      windowsWinget: 'winget install Hugo.Hugo.Extended'
    }
  },
  {
    id: 'meteor',
    name: 'Meteor',
    binary: 'meteor',
    category: 'runtime',
    versionFlag: '--version',
    timeoutMs: 20000,
    installCommand: {
      linuxApt: 'npx meteor',
      linuxPacman: 'npx meteor',
      linuxDnf: 'npx meteor',
      macosBrew: 'npx meteor',
      windowsWinget: 'npx meteor'
    }
  },
  {
    id: 'clasp',
    name: 'Google clasp CLI',
    binary: 'clasp',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'npm install -g @google/clasp',
      linuxPacman: 'npm install -g @google/clasp',
      linuxDnf: 'npm install -g @google/clasp',
      macosBrew: 'npm install -g @google/clasp',
      windowsWinget: 'npm install -g @google/clasp'
    }
  },
  {
    id: 'swift',
    name: 'Swift Toolchain',
    binary: 'swift',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y swift',
      macosBrew: 'xcode-select --install',
      windowsWinget: 'winget install Swift.Swift'
    }
  },
  {
    id: 'sbt',
    name: 'sbt (Scala Build Tool)',
    binary: 'sbt',
    category: 'package-manager',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y sbt',
      linuxPacman: 'pacman -S --noconfirm sbt',
      macosBrew: 'brew install sbt'
    }
  },
  {
    id: 'clojure',
    name: 'Clojure CLI',
    binary: 'clojure',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y clojure',
      macosBrew: 'brew install clojure/tools/clojure'
    }
  },
  {
    id: 'julia',
    name: 'Julia Runtime',
    binary: 'julia',
    category: 'runtime',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y julia',
      linuxPacman: 'pacman -S --noconfirm julia',
      macosBrew: 'brew install --cask julia',
      windowsWinget: 'winget install JuliaComputing.Julia'
    }
  },
  {
    id: 'nim',
    name: 'Nim Compiler',
    binary: 'nim',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y nim',
      linuxPacman: 'pacman -S --noconfirm nim',
      macosBrew: 'brew install nim',
      windowsWinget: 'winget install Nim.Nim'
    }
  },
  {
    id: 'crystal',
    name: 'Crystal Compiler',
    binary: 'crystal',
    category: 'compiler',
    versionFlag: '--version',
    installCommand: {
      linuxApt: 'apt-get install -y crystal',
      linuxPacman: 'pacman -S --noconfirm crystal',
      macosBrew: 'brew install crystal'
    }
  }
]

/** Finds an executable on PATH without spawning a process (PATHEXT-aware on Windows). */
export function findOnPath(binary: string): string | null {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const exts = process.platform === 'win32'
    ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').map(ext => ext.toLowerCase())]
    : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, binary + ext)
      try {
        if (!fs.statSync(candidate).isFile()) continue
        if (process.platform !== 'win32') fs.accessSync(candidate, fs.constants.X_OK)
        return candidate
      } catch {
        // not here
      }
    }
  }
  return null
}

const AUDIT_CONCURRENCY = 8
let auditInFlight: Promise<BinaryAudit[]> | null = null

async function auditOne(item: (typeof MONITORED_BINARIES)[number]): Promise<BinaryAudit> {
  const base = { id: item.id, name: item.name, binary: item.binary, category: item.category, installCommand: item.installCommand }
  const location = findOnPath(item.binary)
  try {
    const { stdout, stderr } = await execAsync(`${item.binary} ${item.versionFlag}`, {
      timeout: item.timeoutMs ?? 10000,
      env: process.env
    })
    return { ...base, installed: true, version: (stdout || stderr || '').trim().split('\n')[0] }
  } catch (err: any) {
    // A slow first run (cold JVM/BEAM/Flutter caches, many probes at once) is not a missing tool:
    // if the binary is on PATH and the probe only timed out, it is installed.
    const timedOut = err?.killed === true || err?.signal === 'SIGTERM'
    if (location && timedOut) return { ...base, installed: true, version: `${location} (version check timed out)` }
    return { ...base, installed: false }
  }
}

/**
 * Audits every monitored binary. Concurrent callers (the App Stack and Host Auditor tabs both
 * audit on load) share one run, and at most AUDIT_CONCURRENCY version probes run at a time so
 * a cold start doesn't push fast tools past their timeout.
 */
export function auditEnvironment(): Promise<BinaryAudit[]> {
  if (auditInFlight) return auditInFlight
  auditInFlight = (async () => {
    ensureUserPathsInEnv()
    const results: BinaryAudit[] = new Array(MONITORED_BINARIES.length)
    let next = 0
    const worker = async () => {
      while (next < MONITORED_BINARIES.length) {
        const index = next++
        results[index] = await auditOne(MONITORED_BINARIES[index])
      }
    }
    await Promise.all(Array.from({ length: AUDIT_CONCURRENCY }, worker))
    return results
  })().finally(() => {
    auditInFlight = null
  })
  return auditInFlight
}
