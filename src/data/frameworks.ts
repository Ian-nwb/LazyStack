import { TechItem } from '../types'

export const TECH_CATALOG: TechItem[] = [
  // --- SYSTEMS & LOW-LEVEL ---
  {
    id: 'assembly-nasm',
    name: 'Assembly (x86_64 NASM)',
    language: 'Assembly',
    category: 'systems',
    role: 'backend',
    defaultPort: 8080,
    description: '[Experimental / Research] Bare-metal Linux TCP socket server via direct kernel syscalls in pure Assembly. Containerized into <5MB scratch image. Provided for educational low-level experimentation.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    isHighlighted: false,
    experimental: true,
    requires: [
      { binary: 'nasm', label: 'NASM Assembler', installHint: 'apt install nasm / brew install nasm' },
      { binary: 'docker', label: 'Docker Engine', installHint: 'https://docs.docker.com/get-docker/' }
    ]
  },
  {
    id: 'haskell-scotty',
    name: 'Haskell (Scotty / Servant)',
    language: 'Haskell',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Purely functional, statically-typed, robust web service powered by GHC and Warp.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [
      { binary: 'ghc', label: 'GHC (Haskell)', installHint: 'https://www.haskell.org/ghcup/' },
      { binary: 'cabal', label: 'Cabal', installHint: 'ghcup install cabal' },
      { binary: 'stack', label: 'Stack (optional)', installHint: 'ghcup install stack' }
    ]
  },
  {
    id: 'c-microhttpd',
    name: 'C (libmicrohttpd / POSIX)',
    language: 'C',
    category: 'systems',
    role: 'backend',
    defaultPort: 8080,
    description: 'Ultra low-latency C server with CMake & GCC toolchain.',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    requires: [
      { binary: 'gcc', label: 'GCC Compiler', installHint: 'apt install build-essential / brew install gcc' },
      { binary: 'cmake', label: 'CMake', installHint: 'apt install cmake / brew install cmake' }
    ]
  },
  {
    id: 'cpp-drogon',
    name: 'C++ (Drogon Framework)',
    language: 'C++',
    category: 'systems',
    role: 'backend',
    defaultPort: 8848,
    description: 'Ultra high-performance non-blocking asynchronous C++ web application framework.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    requires: [
      { binary: 'g++', label: 'G++ Compiler', installHint: 'apt install build-essential / brew install gcc' },
      { binary: 'cmake', label: 'CMake', installHint: 'apt install cmake / brew install cmake' }
    ]
  },
  {
    id: 'zig-http',
    name: 'Zig (HTTP / Zap)',
    language: 'Zig',
    category: 'systems',
    role: 'backend',
    defaultPort: 3000,
    description: 'Blazing fast, memory-safe systems backend with Zig build toolchain.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [
      { binary: 'zig', label: 'Zig Toolchain', installHint: 'https://ziglang.org/download/' }
    ]
  },
  {
    id: 'rust-actix',
    name: 'Rust (Actix-Web)',
    language: 'Rust',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Extremely fast, robust actor-based web framework for Rust.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'rustc', label: 'Rust Compiler', installHint: 'https://rustup.rs' },
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'Installed with rustup' }
    ]
  },
  {
    id: 'rust-axum',
    name: 'Rust (Axum)',
    language: 'Rust',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Ergonomic, modular web framework built with the Tokio ecosystem.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'rustc', label: 'Rust Compiler', installHint: 'https://rustup.rs' },
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'Installed with rustup' }
    ]
  },
  {
    id: 'rust-gpui',
    hostOnly: true,
    name: 'Rust (GPUI Desktop)',
    language: 'Rust',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    description: 'GPU-accelerated native desktop UI framework from the creators of Zed; uses the GPUI Community Edition crates for standalone apps.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'rustc', label: 'Rust Compiler', installHint: 'https://rustup.rs/' },
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'Installed with rustup' }
    ]
  },
  {
    id: 'rust-dioxus',
    name: 'Rust (Dioxus)',
    language: 'Rust',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 8080,
    hostOnly: true,
    description: 'Cross-platform Rust UI (web, desktop and mobile from one codebase) with signals, RSX and a built-in router; served by the dx CLI.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'https://rustup.rs/' },
      { binary: 'dx', label: 'Dioxus CLI', installHint: 'cargo install dioxus-cli' }
    ]
  },
  {
    id: 'rust-slint',
    name: 'Rust (Slint Desktop)',
    language: 'Rust',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    hostOnly: true,
    description: 'Declarative native GUI toolkit: .slint markup compiled at build time with Rust business logic, for desktop and embedded.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'https://rustup.rs/' }
    ]
  },
  {
    id: 'rust-bevy',
    name: 'Rust (Bevy Game Engine)',
    language: 'Rust',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    hostOnly: true,
    description: 'Data-driven ECS game engine; the starter wires a camera and a controllable player through Bevy plugins.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'https://rustup.rs/' }
    ]
  },
  {
    id: 'rust-yew',
    name: 'Rust (Yew WebAssembly)',
    language: 'Rust / WebAssembly',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 8080,
    description: 'Component-based Rust framework for browser applications compiled to WebAssembly, built and served with Trunk.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'rustc', label: 'Rust Compiler', installHint: 'https://rustup.rs/' },
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'Installed with rustup' },
      { binary: 'trunk', label: 'Trunk WebAssembly bundler', installHint: 'cargo install --locked trunk' }
    ]
  },
  {
    id: 'rust-leptos',
    name: 'Rust (Leptos WebAssembly)',
    language: 'Rust / WebAssembly',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 8080,
    description: 'Fine-grained reactive Rust framework for browser UIs, using the client-side rendering profile with Trunk.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'rustc', label: 'Rust Compiler', installHint: 'https://rustup.rs/' },
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'Installed with rustup' },
      { binary: 'trunk', label: 'Trunk WebAssembly bundler', installHint: 'cargo install --locked trunk' }
    ]
  },

  // --- THE BASICS / VANILLA RUNTIMES ---
  {
    id: 'vanilla-html-css-js',
    name: 'Vanilla HTML5 / CSS3 / JS',
    language: 'HTML/CSS/JS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 3000,
    description: 'Zero bundler, zero framework. Pure standard HTML5, CSS3, and JavaScript served statically.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'vanilla-node',
    name: 'Vanilla Node.js (http)',
    language: 'Node.js',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Pure Node.js standard library HTTP server with zero third-party dependencies.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'vanilla-php',
    name: 'Vanilla PHP',
    language: 'PHP',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Native PHP scripts executed via PHP built-in server or fast-cgi.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    requires: [
      { binary: 'php', label: 'PHP Runtime', installHint: 'apt install php / brew install php' }
    ]
  },
  {
    id: 'vanilla-go',
    name: 'Vanilla Go (net/http)',
    language: 'Go',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'A standard-library HTTP service using Go net/http, with no framework dependency.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [{ binary: 'go', label: 'Go Toolchain', installHint: 'https://go.dev/dl/' }]
  },
  {
    id: 'vanilla-python',
    name: 'Vanilla Python (WSGI)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'A minimal HTTP API using Python standard-library WSGI, with no framework dependency.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [{ binary: 'python3', label: 'Python 3', installHint: 'https://www.python.org/downloads/' }]
  },
  {
    id: 'vanilla-java',
    name: 'Vanilla Java (JDK HttpServer)',
    language: 'Java',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'A small HTTP service using the JDK built-in HttpServer, without a web framework.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [{ binary: 'java', label: 'Java JDK 17+', installHint: 'https://adoptium.net/' }]
  },

  // --- MODERN RUNTIMES: DENO & BUN ---
  {
    id: 'deno-native',
    name: 'Deno 2.0 (Native Server / Oak)',
    language: 'Deno (TS/JS)',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Next-gen secure runtime with native TypeScript, Deno.serve(), and web standards.',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'deno', label: 'Deno Runtime', installHint: 'https://deno.land or curl -fsSL https://deno.land/install.sh | sh' }
    ]
  },
  {
    id: 'deno-fresh',
    name: 'Deno (Fresh Framework)',
    language: 'Deno (TS/JS)',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8000,
    description: 'Next-gen fullstack Deno web framework with instant loading and client islands.',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'deno', label: 'Deno Runtime', installHint: 'https://deno.land or curl -fsSL https://deno.land/install.sh | sh' }
    ]
  },
  {
    id: 'ts-elysia',
    name: 'Bun (ElysiaJS)',
    language: 'Bun (TS/JS)',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Ergonomic, type-safe backend framework designed specifically for Bun runtime speed.',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'bun', label: 'Bun Runtime', installHint: 'https://bun.sh or curl -fsSL https://bun.sh/install | bash' }
    ]
  },

  // --- GO ---
  {
    id: 'go-gin',
    name: 'Go (Gin)',
    language: 'Go',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'High-performance Martini-like Go API framework with fast routing.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'go', label: 'Go Toolchain', installHint: 'https://go.dev/dl/' }
    ]
  },
  {
    id: 'go-fiber',
    name: 'Go (Fiber)',
    language: 'Go',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Express-inspired web framework built on top of Fasthttp in Go.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'go', label: 'Go Toolchain', installHint: 'https://go.dev/dl/' }
    ]
  },
  {
    id: 'go-echo',
    name: 'Go (Echo)',
    language: 'Go',
    category: 'backend',
    role: 'backend',
    defaultPort: 1323,
    description: 'High performance, extensible, minimalist Go web framework with built-in middleware.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'go', label: 'Go Toolchain', installHint: 'https://go.dev/dl/' }
    ]
  },
  {
    id: 'go-chi',
    name: 'Go (Chi Router)',
    language: 'Go',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Lightweight, idiomatic, composable router for building Go HTTP services.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'go', label: 'Go Toolchain', installHint: 'https://go.dev/dl/' }
    ]
  },
  {
    id: 'go-goravel',
    name: 'Go (Goravel)',
    language: 'Go',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'A Laravel-like web framework for Go with elegant routing, ORM, and artisan architecture.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'go', label: 'Go Toolchain', installHint: 'https://go.dev/dl/' }
    ]
  },

  // --- C# / .NET ---
  {
    id: 'csharp-aspnet',
    name: 'C# (ASP.NET Core Web API)',
    language: 'C#',
    category: 'backend',
    role: 'backend',
    defaultPort: 5000,
    description: 'Enterprise cross-platform RESTful Web API on .NET 9.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [
      { binary: 'dotnet', label: '.NET SDK', installHint: 'https://dot.net/download' }
    ]
  },
  {
    id: 'csharp-blazor',
    name: 'C# (Blazor Server/WASM)',
    language: 'C#',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 5001,
    description: 'Fullstack C# interactive web UI using WebAssembly or Server-side SignalR.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [
      { binary: 'dotnet', label: '.NET SDK', installHint: 'https://dot.net/download' }
    ]
  },

  // --- PYTHON ---
  {
    id: 'python-fastapi',
    name: 'Python (FastAPI)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Modern, fast async Python web framework with automatic OpenAPI docs.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-django',
    name: 'Python (Django)',
    language: 'Python',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8000,
    description: 'Batteries-included fullstack Python framework with ORM and admin panel.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-flask',
    name: 'Python (Flask)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 5000,
    description: 'Lightweight WSGI Python microframework.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },

  // --- NODE / TS BACKENDS ---
  {
    id: 'ts-express',
    name: 'Express',
    language: 'JS / TS',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Classic fast, unopinionated, minimalist web framework for Node.js.',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'ts-fastify',
    name: 'Fastify',
    language: 'JS / TS',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Extremely fast Node.js web framework focused on low overhead and schema validation.',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'ts-nestjs',
    name: 'NestJS',
    language: 'TypeScript',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Progressive Node.js framework for scalable enterprise server-side applications.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'ts-hono',
    name: 'Hono',
    language: 'JS / TS',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Ultrafast, lightweight standards-based web framework for Node, Bun, and Deno.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },

  // --- FULLSTACK & META-FRAMEWORKS ---
  {
    id: 'fullstack-nextjs',
    name: 'Next.js (App Router)',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Production React framework with SSR, Server Components, and API routes.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'fullstack-nuxt',
    name: 'Nuxt 3 (Vue Fullstack)',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'The intuitive Vue meta-framework with auto-imports, file-based routing, and SSR.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'fullstack-remix',
    name: 'Remix / React Router v7',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Fast, resilient React fullstack framework focused on web standards and nested loaders.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'fullstack-sveltekit',
    name: 'SvelteKit',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 5173,
    description: 'Fullstack reactive framework with tiny bundles and zero-virtual-DOM overhead.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'fullstack-astro',
    name: 'Astro (Content & Islands)',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 4321,
    description: 'Content-driven island architecture supporting React, Vue, and Svelte.',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'fullstack-laravel',
    name: 'PHP (Laravel 11)',
    language: 'PHP',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8000,
    description: 'The web artisan framework for PHP with Eloquent ORM and queues.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'php', label: 'PHP Runtime', installHint: 'apt install php / brew install php' },
      { binary: 'composer', label: 'Composer (PHP PM)', installHint: 'https://getcomposer.org/download/' }
    ]
  },
  {
    id: 'php-symfony',
    name: 'PHP (Symfony 7)',
    language: 'PHP',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8000,
    description: 'Enterprise PHP framework with Flex, Doctrine ORM, and Twig templating.',
    badgeColor: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
    requires: [
      { binary: 'php', label: 'PHP Runtime', installHint: 'apt install php / brew install php' },
      { binary: 'composer', label: 'Composer (PHP PM)', installHint: 'https://getcomposer.org/download/' }
    ]
  },

  // --- FRONTEND SPA / HYPERMEDIA ---
  {
    id: 'react-vite',
    name: 'React 19 + Vite',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Modern client-side React SPA with Vite, HMR, and Tailwind CSS utility styling.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'react-mui',
    name: 'React + MUI (Material UI)',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'React SPA powered by Google Material Design component library.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'vue-vite',
    name: 'Vue.js 3 + Vite',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Composition API, Pinia state management, and blazing Vite dev server.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'angular-cli',
    name: 'Angular 18+',
    language: 'TypeScript',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 4200,
    description: 'Enterprise TypeScript SPA with signals, hydration, and modular architecture.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'solidjs-vite',
    name: 'SolidJS + Vite',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 3000,
    description: 'Fine-grained reactive frontend without virtual DOM, maximum runtime performance.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'qwik-city',
    name: 'Qwik + Qwik City',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Resumable, instant-loading web app architecture with zero-hydration cost.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'html-htmx',
    name: 'HTMX + Modern Web',
    language: 'HTML/CSS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 3000,
    description: 'Hypermedia-driven interactive UI without heavy client-side JavaScript bundles.',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  {
    id: 'inferno-js',
    name: 'Inferno (React-Compatible)',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Blazing-fast React-compatible UI library with the smallest bundle size and near-native DOM rendering speed. Drop-in alternative to React.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'kotlin-js',
    name: 'Kotlin/JS Browser Frontend',
    language: 'Kotlin',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 8080,
    description: 'Compile Kotlin to JavaScript for a browser-based frontend using the Kotlin Multiplatform Gradle plugin.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [{ binary: 'java', label: 'Java JDK 17+', installHint: 'https://adoptium.net/' }, { binary: 'gradle', label: 'Gradle', installHint: 'https://gradle.org/install/' }]
  },
  {
    id: 'swiftui-client',
    hostOnly: true,
    name: 'SwiftUI Apple Client',
    language: 'Swift',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    description: 'Native Apple platform client starter using SwiftUI. Build and run with Xcode on macOS.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [{ binary: 'swift', label: 'Swift Toolchain / Xcode', installHint: 'https://developer.apple.com/xcode/' }]
  },

  // --- MOBILE & DESKTOP (TAURI, FLUTTER, ELECTRON) ---
  {
    id: 'tauri-app',
    hostOnly: true,
    name: 'Tauri Desktop App (Rust + Web)',
    language: 'Rust / Web',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 1420,
    description: 'Lightweight, memory-efficient native desktop client built with Rust and any web frontend.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'rustc', label: 'Rust Compiler', installHint: 'https://rustup.rs' },
      { binary: 'cargo', label: 'Cargo (Rust PM)', installHint: 'Installed with rustup' },
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org' }
    ]
  },
  {
    id: 'dart-flutter',
    hostOnly: true,
    name: 'Dart (Flutter Web & Multiplatform)',
    language: 'Dart',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 8080,
    description: 'Cross-platform native UI for Android, iOS, Linux, Windows, macOS, and Web.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    requires: [
      { binary: 'flutter', label: 'Flutter SDK', installHint: 'https://flutter.dev/docs/get-started/install' },
      { binary: 'dart', label: 'Dart SDK', installHint: 'Installed with Flutter' }
    ]
  },
  {
    id: 'ionic-framework',
    name: 'Ionic (Capacitor Mobile)',
    language: 'JS / TS',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 8100,
    description: 'Hybrid mobile & PWA suite powered by Capacitor.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'capacitor-app',
    name: 'Capacitor (Web to Native)',
    language: 'JS / TS',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 5173,
    description: 'Vite web app wrapped in native Android and iOS shells with Capacitor, without a UI kit. The web build also runs in Docker.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'csharp-maui',
    hostOnly: true,
    name: 'C# (.NET MAUI)',
    language: 'C#',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    description: 'Cross-platform native Android, iOS, macOS and Windows app with XAML and C# on .NET 10. Linux hosts can build the Android target only.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [
      { binary: 'dotnet', label: '.NET 10 SDK + MAUI workload', installHint: 'https://dot.net/download, then `dotnet workload install maui` (Linux: `maui-android`)' }
    ]
  },
  {
    id: 'electron-app',
    hostOnly: true,
    name: 'Electron Desktop Client',
    language: 'JS / TS',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 5173,
    description: 'Cross-platform native desktop wrapper for Linux, Windows, and macOS.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'react-native-expo',
    hostOnly: true,
    name: 'React Native (Expo)',
    language: 'JS / TS',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 8081,
    description: 'Cross-platform iOS, Android, and Web apps with React Native powered by the Expo managed workflow and Expo Router.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },

  // --- JVM & OTHER RUNTIMES ---
  {
    id: 'java-springboot',
    name: 'Java (Spring Boot 3)',
    language: 'Java',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Enterprise Java application stack with Maven or Gradle.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'java', label: 'Java JDK 17+', installHint: 'apt install openjdk-17-jdk / brew install openjdk@17' },
      { binary: 'mvn', label: 'Maven (Java PM)', installHint: 'apt install maven / brew install maven' }
    ]
  },
  {
    id: 'java-javafx',
    name: 'Java (JavaFX Desktop)',
    language: 'Java',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    hostOnly: true,
    description: 'Modular JavaFX desktop app with FXML views, controllers and CSS, run through the javafx-maven-plugin.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'java', label: 'Java JDK 17+', installHint: 'apt install openjdk-17-jdk / brew install openjdk@17' },
      { binary: 'mvn', label: 'Maven (Java PM)', installHint: 'apt install maven / brew install maven' }
    ]
  },
  {
    id: 'java-swing',
    name: 'Java (Swing Desktop)',
    language: 'Java',
    category: 'mobile-desktop',
    role: 'desktop-mobile',
    defaultPort: 0,
    hostOnly: true,
    description: 'Classic JDK Swing desktop app with a Maven layout, separating UI frames from testable model code.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'java', label: 'Java JDK 17+', installHint: 'apt install openjdk-17-jdk / brew install openjdk@17' },
      { binary: 'mvn', label: 'Maven (Java PM)', installHint: 'apt install maven / brew install maven' }
    ]
  },
  {
    id: 'kotlin-ktor',
    name: 'Kotlin (Ktor / Spring Boot)',
    language: 'Kotlin',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Coroutines-first asynchronous backend built for Kotlin.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [
      { binary: 'java', label: 'Java JDK 17+', installHint: 'apt install openjdk-17-jdk / brew install openjdk@17' },
      { binary: 'gradle', label: 'Gradle (optional)', installHint: 'https://gradle.org/install/' }
    ]
  },
  {
    id: 'elixir-phoenix',
    name: 'Elixir (Phoenix LiveView)',
    language: 'Elixir',
    category: 'backend',
    role: 'backend',
    defaultPort: 4000,
    description: 'BEAM virtual machine concurrency with real-time LiveView WebSockets.',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    requires: [
      { binary: 'elixir', label: 'Elixir', installHint: 'https://elixir-lang.org/install.html' },
      { binary: 'mix', label: 'Mix (Elixir PM)', installHint: 'Installed with Elixir' },
      { binary: 'erl', label: 'Erlang/OTP', installHint: 'apt install erlang / brew install erlang' }
    ]
  },
  {
    id: 'ruby-rails',
    name: 'Ruby (Ruby on Rails 7/8)',
    language: 'Ruby',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Convention-over-configuration rapid web development with Hotwire.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    requires: [
      { binary: 'ruby', label: 'Ruby Runtime', installHint: 'https://www.ruby-lang.org/en/downloads/' },
      { binary: 'gem', label: 'RubyGems', installHint: 'Installed with Ruby' },
      { binary: 'bundler', label: 'Bundler', installHint: 'gem install bundler' }
    ]
  },

  // --- SCRIPTING / AUTOMATION ---
  {
    id: 'bash-worker',
    name: 'Bash Shell Worker / CLI Service',
    language: 'Bash',
    category: 'scripting',
    role: 'worker',
    defaultPort: 0,
    description: 'Headless automation daemon, scheduled cron jobs, or pipeline runner.',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    requires: [
      { binary: 'bash', label: 'Bash Shell', installHint: 'Pre-installed on Linux/macOS' }
    ]
  },
  {
    id: 'sql-migrations',
    name: 'SQL Migration & Seeder Service',
    language: 'SQL',
    category: 'scripting',
    role: 'worker',
    defaultPort: 0,
    description: 'Automated database schema migration engine & test fixtures.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
  },
  {
    id: 'google-apps-script',
    hostOnly: true,
    name: 'Google Apps Script',
    language: 'JavaScript / TypeScript',
    category: 'scripting',
    role: 'worker',
    defaultPort: 0,
    description: 'Server-side JavaScript automation for Google Workspace (Sheets, Docs, Drive, Gmail). Pushed to Google via clasp. TypeScript supported with transpilation.',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/40',
    supportsFlavor: true,
    requires: [
      { binary: 'node', label: 'Node.js', installHint: 'https://nodejs.org/' },
      { binary: 'clasp', label: 'Google clasp CLI', installHint: 'npm install -g @google/clasp' }
    ]
  },
  {
    id: 'assemblyscript',
    name: 'AssemblyScript (Wasm)',
    language: 'AssemblyScript / TypeScript',
    category: 'scripting',
    role: 'worker',
    defaultPort: 0,
    description: 'TypeScript-like language that compiles strictly typed code directly to WebAssembly (Wasm). Blazing fast binaries for Node.js, Web workers, and edge computing.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    supportsFlavor: false,
    requires: [
      { binary: 'node', label: 'Node.js', installHint: 'https://nodejs.org/' }
    ]
  },

  // --- MODERN FULLSTACK & RESUMABLE ---
  {
    id: 'tanstack-start',
    name: 'TanStack Start (React)',
    language: 'TypeScript',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Full-stack React framework powered by TanStack Router, Vite, and full-type RPC server functions.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    isHighlighted: true,
    requires: [
      { binary: 'node', label: 'Node.js', installHint: 'https://nodejs.org/' }
    ]
  },
  {
    id: 'solid-start',
    name: 'SolidStart',
    language: 'TypeScript',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Fine-grained reactive fullstack framework for SolidJS with streaming SSR and Vinxi bundler.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    requires: [
      { binary: 'node', label: 'Node.js', installHint: 'https://nodejs.org/' }
    ]
  },
  {
    id: 'lit-element',
    name: 'Lit (Web Components)',
    language: 'TypeScript',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Google lightweight library for building fast, reactive, framework-agnostic native Web Components.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    requires: [
      { binary: 'node', label: 'Node.js', installHint: 'https://nodejs.org/' }
    ]
  },
  {
    id: 'python-reflex',
    name: 'Reflex (Python Full-Stack UI)',
    language: 'Python',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Build a reactive web UI and backend in Python; Reflex compiles the interface for the browser.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    requires: [{ binary: 'python3', label: 'Python 3.10+', installHint: 'https://www.python.org/downloads/' }]
  },
  {
    id: 'python-nicegui',
    name: 'NiceGUI (Python Web UI)',
    language: 'Python',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8080,
    description: 'Create browser-based dashboards and apps using Python components and NiceGUI.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    requires: [{ binary: 'python3', label: 'Python 3.9+', installHint: 'https://www.python.org/downloads/' }]
  },
  {
    id: 'python-anvil',
    hostOnly: true,
    name: 'Anvil (Hosted Python Full-Stack)',
    language: 'Python',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 0,
    description: 'Hosted full-stack Python web app platform with browser-side Python UI and server modules; continue in Anvil’s editor.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    requires: []
  },

  // --- POLYGLOT BACKENDS & NEW LANGUAGES ---
  {
    id: 'swift-vapor',
    name: 'Swift (Vapor 4)',
    language: 'Swift',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'High-concurrency server-side Swift framework with native Swift async/await and non-blocking I/O.',
    badgeColor: 'bg-orange-600/20 text-orange-400 border-orange-600/40',
    requires: [
      { binary: 'swift', label: 'Swift Toolchain', installHint: 'https://www.swift.org/download/' }
    ]
  },
  {
    id: 'scala-play',
    name: 'Scala (Play Framework)',
    language: 'Scala',
    category: 'backend',
    role: 'backend',
    defaultPort: 9000,
    description: 'Reactive, highly scalable web framework for the JVM built on Akka/Pekko and Netty.',
    badgeColor: 'bg-red-600/20 text-red-400 border-red-600/40',
    requires: [
      { binary: 'sbt', label: 'sbt (Scala Build Tool)', installHint: 'https://www.scala-sbt.org/download.html' }
    ]
  },
  {
    id: 'clojure-ring',
    name: 'Clojure (Ring / Kit)',
    language: 'Clojure',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Simplicity-first, functional Lisp web services running atop the JVM with hot-reloading REPL.',
    badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
    requires: [
      { binary: 'clojure', label: 'Clojure CLI', installHint: 'https://clojure.org/guides/install_clojure' }
    ]
  },
  {
    id: 'ocaml-dream',
    name: 'OCaml (Dream)',
    language: 'OCaml',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Tidy, type-safe web framework for OCaml with native async, WebSockets, and GraphQL.',
    badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40',
    requires: [
      { binary: 'opam', label: 'OPAM (OCaml)', installHint: 'https://opam.ocaml.org/doc/Install.html' }
    ]
  },
  {
    id: 'julia-genie',
    name: 'Julia (Genie.jl)',
    language: 'Julia',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'High-performance scientific computing and machine learning web framework in pure Julia.',
    badgeColor: 'bg-purple-600/20 text-purple-300 border-purple-600/40',
    requires: [
      { binary: 'julia', label: 'Julia Runtime', installHint: 'https://julialang.org/downloads/' }
    ]
  },
  {
    id: 'lua-lapis',
    name: 'Lua (OpenResty / Lapis)',
    language: 'Lua',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Extreme-performance web application framework running inside Nginx with LuaJIT.',
    badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-600/40',
    requires: [
      { binary: 'luajit', label: 'LuaJIT', installHint: 'apt install luajit / brew install luajit' }
    ]
  },
  {
    id: 'r-plumber',
    name: 'R (Plumber API)',
    language: 'R',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Convert R statistical models, data frames, and ggplot graphics into robust RESTful web services.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    requires: [
      { binary: 'R', label: 'R Runtime', installHint: 'https://cran.r-project.org/' }
    ]
  },
  {
    id: 'erlang-cowboy',
    name: 'Erlang (Cowboy)',
    language: 'Erlang',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Small, fast, modular HTTP server running on the fault-tolerant Erlang/OTP BEAM runtime.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'erl', label: 'Erlang/OTP', installHint: 'https://www.erlang.org/downloads' }
    ]
  },
  {
    id: 'nim-happyx',
    name: 'Nim (HappyX)',
    language: 'Nim',
    category: 'backend',
    role: 'backend',
    defaultPort: 5000,
    description: 'Ultra-fast macro-powered async web framework compiled to C with Pythonic elegance.',
    badgeColor: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
    requires: [
      { binary: 'nim', label: 'Nim Compiler', installHint: 'https://nim-lang.org/install.html' }
    ]
  },
  {
    id: 'crystal-kemal',
    name: 'Crystal (Kemal)',
    language: 'Crystal',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Lightning-fast Sinatra-like microframework with Ruby-like syntax and C-speed LLVM compilation.',
    badgeColor: 'bg-stone-500/20 text-stone-300 border-stone-500/40',
    requires: [
      { binary: 'crystal', label: 'Crystal Compiler', installHint: 'https://crystal-lang.org/install/' }
    ]
  },

  {
    id: 'rust-poem',
    name: 'Rust (Poem OpenAPI)',
    language: 'Rust',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Ergonomic, type-safe async Rust web framework with automated Swagger/OpenAPI documentation.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    requires: [
      { binary: 'cargo', label: 'Cargo / Rust', installHint: 'https://rustup.rs/' }
    ]
  },

  // --- Added in 1.3.0 ---
  {
    id: 'quasar-vite',
    name: 'Quasar (Vite)',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 9000,
    description: 'Vue-based framework with a rich component library for SPAs, PWAs, mobile and desktop targets.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'svelte-vite',
    name: 'Svelte + Vite',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Plain Svelte 5 single page app on Vite, without SvelteKit.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'preact-vite',
    name: 'Preact + Vite',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 5173,
    description: 'Lightweight 3 kB React alternative with the same modern API, on Vite.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'gatsby',
    name: 'Gatsby',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 8000,
    description: 'React-based static site and SSR framework with a data layer and file-based routing.',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'vike',
    name: 'Vike (React)',
    language: 'JS / TS',
    category: 'frontend',
    role: 'frontend',
    defaultPort: 3000,
    description: 'Flexible Vite-based SSR/SSG framework with file-based routing and full control over the stack.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'redwoodjs',
    name: 'RedwoodJS',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8910,
    description: 'Opinionated fullstack framework: React web side, GraphQL and Prisma API side.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'blitz',
    name: 'Blitz.js',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Fullstack Next.js toolkit with a zero-API data layer (RPC) and Prisma.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'meteor',
    hostOnly: true,
    name: 'Meteor',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Full-stack JavaScript platform with a built-in MongoDB and realtime data. Runs on the host only.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'meteor', label: 'Meteor', installHint: 'npx meteor / curl https://install.meteor.com/ | sh' }
    ]
  },
  {
    id: 'nextjs-trpc',
    name: 'Next.js + tRPC',
    language: 'JS / TS',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 3000,
    description: 'Next.js App Router with an end-to-end typed tRPC API, the standalone core of the T3 stack.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'ts-adonis',
    name: 'AdonisJS',
    language: 'JS / TS',
    category: 'backend',
    role: 'backend',
    defaultPort: 3333,
    description: 'Laravel-style TypeScript framework: controllers, routing, validation and an ace CLI.',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'ts-koa',
    name: 'Koa',
    language: 'JS / TS',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Minimal, expressive middleware framework for Node.js from the Express team.',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'bun-native',
    name: 'Bun (Bun.serve)',
    language: 'JS / TS',
    category: 'backend',
    role: 'backend',
    defaultPort: 3000,
    description: 'Plain Bun runtime HTTP server with the built-in test runner. No framework dependency.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    requires: [{ binary: 'bun', label: 'Bun Runtime', installHint: 'https://bun.sh' }]
  },
  {
    id: 'python-litestar',
    name: 'Python (Litestar)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'High-performance, typed ASGI framework with DI, OpenAPI and a batteries-included toolkit.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-sanic',
    name: 'Python (Sanic)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Async Python web server and framework built for speed.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-starlette',
    name: 'Python (Starlette)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Lightweight ASGI toolkit that FastAPI is built on.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-tornado',
    name: 'Python (Tornado)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 8888,
    description: 'Asynchronous networking library and web framework for long-lived connections.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-pyramid',
    name: 'Python (Pyramid)',
    language: 'Python',
    category: 'backend',
    role: 'backend',
    defaultPort: 6543,
    description: 'Small, flexible WSGI framework that scales from one file to large apps.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-streamlit',
    name: 'Python (Streamlit)',
    language: 'Python',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 8501,
    description: 'Turn Python scripts into interactive data and ML apps with no frontend code.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'python-gradio',
    name: 'Python (Gradio)',
    language: 'Python',
    category: 'fullstack',
    role: 'fullstack',
    defaultPort: 7860,
    description: 'Build and share ML demos and web UIs for Python functions in minutes.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    requires: [
      { binary: 'python3', label: 'Python 3', installHint: 'https://python.org or apt install python3' },
      { binary: 'pip3', label: 'pip (Python PM)', installHint: 'apt install python3-pip' }
    ]
  },
  {
    id: 'hugo',
    name: 'Hugo',
    language: 'Go',
    category: 'frontend',
    role: 'static-site',
    defaultPort: 1313,
    description: 'Very fast static site generator written in Go. Docker builds the site, then serves it with nginx.',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    requires: [{ binary: 'hugo', label: 'Hugo', installHint: 'https://gohugo.io/installation/' }]
  },
  {
    id: 'jekyll',
    name: 'Jekyll',
    language: 'Ruby',
    category: 'frontend',
    role: 'static-site',
    defaultPort: 4000,
    description: 'Blog-aware static site generator in Ruby; the engine behind GitHub Pages.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    requires: [
      { binary: 'ruby', label: 'Ruby', installHint: 'https://www.ruby-lang.org/en/downloads/' },
      { binary: 'bundle', label: 'Bundler', installHint: 'gem install bundler' }
    ]
  },
  {
    id: 'eleventy',
    name: 'Eleventy',
    language: 'JS / TS',
    category: 'frontend',
    role: 'static-site',
    defaultPort: 8080,
    description: 'Simple, flexible static site generator for Node with many template languages.',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'docusaurus',
    name: 'Docusaurus',
    language: 'JS / TS',
    category: 'frontend',
    role: 'static-site',
    defaultPort: 3000,
    description: 'React-based documentation site generator with versioning and search.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'vitepress',
    name: 'VitePress',
    language: 'JS / TS',
    category: 'frontend',
    role: 'static-site',
    defaultPort: 5173,
    description: 'Vite and Vue powered static site generator for documentation.',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    requires: [
      { binary: 'node', label: 'Node.js Runtime', installHint: 'https://nodejs.org or nvm install --lts' },
      { binary: 'npm', label: 'npm (Node PM)', installHint: 'Installed with Node.js' }
    ]
  },
  {
    id: 'gleam-wisp',
    name: 'Gleam (Wisp)',
    language: 'Gleam',
    category: 'backend',
    role: 'backend',
    defaultPort: 8000,
    description: 'Type-safe functional web service on the BEAM using the Wisp framework and Mist server.',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    requires: [
      { binary: 'gleam', label: 'Gleam', installHint: 'https://gleam.run/getting-started/installing/' },
      { binary: 'erl', label: 'Erlang/OTP', installHint: 'https://www.erlang.org/downloads' }
    ]
  },
  {
    id: 'v-vweb',
    name: 'V (veb)',
    language: 'V',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Fast, simple compiled language with a built-in web module (veb, formerly vweb).',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    requires: [{ binary: 'v', label: 'V Compiler', installHint: 'https://docs.vlang.io/introduction.html#install-from-source' }]
  },
  {
    id: 'dart-shelf',
    name: 'Dart (Shelf)',
    language: 'Dart',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Plain Dart server built on Shelf middleware and shelf_router.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    requires: [{ binary: 'dart', label: 'Dart SDK', installHint: 'https://dart.dev/get-dart' }]
  },
  {
    id: 'dart-serverpod',
    hostOnly: true,
    name: 'Dart (Serverpod)',
    language: 'Dart',
    category: 'backend',
    role: 'backend',
    defaultPort: 8080,
    description: 'Dart backend with a generated client, ORM and built-in auth. Runs on the host; uses Docker for Postgres/Redis.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    requires: [
      { binary: 'dart', label: 'Dart SDK', installHint: 'https://dart.dev/get-dart' },
      { binary: 'serverpod', label: 'Serverpod CLI', installHint: 'dart pub global activate serverpod_cli' },
      { binary: 'docker', label: 'Docker Engine', installHint: 'https://docs.docker.com/get-docker/' }
    ]
  }
]

/** True for desktop/mobile/hosted apps that LazyStack never runs as a Docker service. */
export function isHostOnlyTech(techId: string): boolean {
  return TECH_CATALOG.find(tech => tech.id === techId)?.hostOnly === true
}
