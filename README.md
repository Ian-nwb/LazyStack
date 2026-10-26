# LazyStack(DO NOT DOWNLOAD YET)
exe is crashing 

> **Automated Polyglot Monorepo & Fullstack Architecture Scaffolder**  
> Design, configure, and scaffold production-ready fullstack monorepos with unified gateway routing, container orchestration, and real-time host toolchain auditing.

---

## Downloads & Releases

Pre-built releases for **LazyStack v1.0.0** are available on the [GitHub Releases](https://github.com/Ian-nwb/LazyStack/releases/tag/v1.0.0) page:

| Operating System | Package Format | Direct Download | Notes |
| :--- | :--- | :--- | :--- |
| Linux (x64) | Universal AppImage | [LazyStack-1.0.0.AppImage](https://github.com/Ian-nwb/LazyStack/releases/download/v1.0.0/LazyStack-1.0.0.AppImage) | Portable, run `chmod +x` |
| Windows (x64) | Standalone Executable | [LazyStack-1.0.0.exe](https://github.com/Ian-nwb/LazyStack/releases/download/v1.0.0/LazyStack-1.0.0.exe) | Portable single-file executable |
| Windows (x64) | Portable ZIP | [LazyStack-1.0.0-windows-x64.zip](https://github.com/Ian-nwb/LazyStack/releases/download/v1.0.0/LazyStack-1.0.0-windows-x64.zip) | Extract and run `LazyStack.exe` |
| macOS (x64 / Apple Silicon) | App Bundle ZIP | [LazyStack-1.0.0-mac.zip](https://github.com/Ian-nwb/LazyStack/releases/download/v1.0.0/LazyStack-1.0.0-mac.zip) | Extract and open `LazyStack.app` |

---

## Key Highlights

- **Polyglot Stack Builder**: Mix and match any frontend, backend, or fullstack framework. Support for 65+ technologies across 30+ languages (TypeScript, JavaScript, Go, Rust, Python, PHP, Java, C#, Elixir, Ruby, Haskell, Swift, Scala, Clojure, OCaml, Julia, Lua, R, Erlang, Nim, Crystal, C++, Assembly, and Zig).
- **Reverse Proxy Gateway Generation**: Automatically provisions unified entrypoint configurations for **Nginx** (upstreams, WebSocket upgrades) or **Apache HTTP Server** (`mod_proxy`, `mod_proxy_wstunnel`), or direct port mappings.
- **Database & Cache Ecosystem**: 1-click Docker orchestration for **PostgreSQL 16**, **MySQL 8.4**, **MongoDB 7**, **Redis 7.2**, **Valkey 8 (Linux Foundation)**, **ClickHouse OLAP**, **Meilisearch**, and **SQLite**.
- **Host Environment Auditor**: Detects host toolchains (Node, Bun, Deno, Go, Cargo, Python, Composer, .NET SDK, Docker, etc.) in real time with quick-install commands and PATH helpers.
- **Warm Cream & Sleek Dark Themes**: Monochromatic design featuring warm ivory cream (`#faf6ed`), rich parchment, and dark espresso typography.
- **Turnkey Scaffolding**: Produces clean folder structures, Dockerfiles, docker-compose configs, `.env` files, and unified orchestrator tasks ready to run with `docker compose up`.

---

## Supported Frameworks & Runtimes

### Fullstack Frameworks
- **Next.js 15** (App Router, React Server Components)
- **Nuxt 3** (Vue 3, Nitro engine)
- **Remix** (React Router 7 / Remix)
- **SvelteKit** (Svelte 5 runes)
- **Qwik / QwikCity** (Resumable, zero hydration overhead)
- **TanStack Start** (React, TanStack Router, Vite SSR)
- **SolidStart** (Fine-grained reactive SSR)
- **Astro 5** (Content islands & SSR)
- **Laravel 11** (PHP 8.3, Composer)
- **Deno Fresh** (Just-in-time rendering, Islands architecture)
- **Blazor WebAssembly** (.NET 9 SDK)
- **Django 5** (Python 3.12, ASGI/WSGI)
- **Ruby on Rails 7** (Ruby 3.3, Puma)

### Frontend Frameworks
- **React 19** + Vite (TypeScript / JavaScript)
- **Vue 3** + Vite (TypeScript / JavaScript)
- **Svelte 5** + Vite
- **SolidJS** + Vite
- **Angular 19**
- **Lit** (Google native Web Components)
- **Vanilla HTML5 / Modern CSS / ESM JS**

### Backend & API Services
- **Go**: Fiber v3, Echo v4, Chi v5, Gin
- **Rust**: Axum 0.7, Actix-web 4, Poem OpenAPI
- **Swift**: Vapor 4 (Native async/await, Linux & macOS)
- **Scala**: Play Framework / Akka / Netty (JVM)
- **Clojure**: Ring / Compojure / Kit (JVM Lisp)
- **OCaml**: Dream (Type-safe, async I/O, WebSockets)
- **Julia**: Genie.jl (Scientific ML & high-performance computing)
- **Lua**: OpenResty / Lapis (LuaJIT inside Nginx)
- **R**: Plumber REST API
- **Erlang**: Cowboy (Fault-tolerant OTP BEAM runtime)
- **Nim**: HappyX (Pythonic syntax, C-speed compilation)
- **Crystal**: Kemal (Ruby-like syntax, LLVM-compiled)
- **Node.js**: Express 5, Fastify 5, NestJS 10, Vanilla Node HTTP
- **Bun**: Elysia, Hono
- **Deno**: Oak
- **Python**: FastAPI, Flask
- **Java**: Spring Boot 3.3
- **Elixir**: Phoenix Framework 1.7
- **C#**: ASP.NET Core Web API (.NET 9)
- **PHP**: Slim Framework 4, Symfony 7
- **High Performance Systems**: C++ Drogon, Zig HTTP, C POSIX (libmicrohttpd)

### Experimental & Exploratory Templates
LazyStack provides designated experimental templates for low-level systems research and benchmarking. These are clearly tagged to isolate them from battle-tested production tiers:
- **Assembly (x86_64 NASM Micro-server)**: Bare-metal Linux TCP socket server via direct kernel syscalls in pure Assembly. Containerized into a sub-5MB scratch image. Provided for low-level education, curiosity, and binary size exploration (not recommended for production web applications).

### Databases & Infrastructure
- **PostgreSQL 16** (Alpine)
- **MySQL 8.4 LTS**
- **MariaDB 11**
- **MongoDB 7.0**
- **Redis 7.2** (Alpine)
- **Valkey 8.0** *(Linux Foundation open source high-performance key-value datastore)*
- **Qdrant Vector DB** *(AI embeddings, vector similarity search, and RAG pipelines)*
- **Meilisearch** *(Instant, typo-tolerant full-text search engine)*
- **MinIO** *(High-performance S3-compatible object storage with web console)*
- **ScyllaDB** *(C++ rewrite of Apache Cassandra for ultra high-throughput NoSQL)*
- **ClickHouse OLAP** *(Column-oriented analytical engine)*
- **SurrealDB v2** *(Multi-model document, graph, and relational cloud database)*
- **Neo4j** *(Graph database engine with Cypher query language)*
- **RabbitMQ** *(AMQP message broker with web management dashboard)*
- **SQLite 3** *(Shared volume, app-local, or Litestream replication)*

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **bun** / **pnpm**
- **Docker & Docker Compose** (for running generated stacks)

### Clone & Install
```bash
git clone https://github.com/your-username/lazystack.git
cd lazystack
npm install
```

### Run in Development

**Option 1: Vite Web Browser Mode (Fast iteration)**
```bash
npm run dev
```
> Opens `http://localhost:5173`. Uses Vite backend middleware to inspect host tools via `/api/audit`.

**Option 2: Native Desktop Electron Mode**
```bash
npm start
```
> Launches the native Electron window with direct IPC access to host filesystem dialogs and child process auditors.

---

## LazyStack CLI & Blueprint Config Export

LazyStack includes a headless Command Line Interface (`lazystack`) for terminal workflows, automated scripting, and CI/CD pipelines.

### CLI Usage

```bash
# 1. List all 65+ supported frameworks, databases, and stack presets
npx lazystack list

# 2. View available 1-click stack presets
npx lazystack presets

# 3. Export a complete blueprint configuration to lazystack.json
npx lazystack export --preset t3-stack --out lazystack.json

# 4. Scaffold a monorepo headlessly from an exported config
npx lazystack scaffold --config lazystack.json --out ./my-projects

# 5. Or 1-click scaffold directly from a preset name
npx lazystack scaffold --preset fastapi-react --name my-fullstack-app --out ./my-projects
```

### Blueprint Configuration (`lazystack.json`)

The exported `lazystack.json` blueprint provides an infrastructure-as-code specification of your full monorepo:
- Applications, ports, roles (`frontend`, `backend`, `fullstack`), run modes (`docker`, `host`), and language dialects (TypeScript/JavaScript).
- Enabled databases, persistent volume bindings, and connection credentials.
- Reverse proxy configurations (Nginx / Apache) with upstream path route mappings.

Blueprints can be imported back into the LazyStack GUI at any time or checked into version control.

---

## Building for Windows, macOS, and Linux

LazyStack is packaged using `electron-builder` with multi-target output configurations.

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**

```bash
git clone https://github.com/Ian-nwb/LazyStack.git
cd LazyStack
npm install
```

### Quick Build Commands

| Target Platform | Command | Generated Artifacts | Output Location |
| :--- | :--- | :--- | :--- |
| **Linux** | `npm run dist:linux` | `.AppImage` (x64) | `release/LazyStack-1.0.0.AppImage` |
| **Windows (Native)** | `npm run dist:win` | `.exe` (NSIS Installer & Portable) | `release/LazyStack Setup 1.0.0.exe` |
| **Windows (Cross-platform ZIP)** | `npx electron-builder --win zip` | `.zip` (with `LazyStack.exe`) | `release/LazyStack-1.0.0-win.zip` |
| **macOS (Native)** | `npm run dist:mac` | `.dmg` installer | `release/LazyStack-1.0.0.dmg` |
| **macOS (Cross-platform ZIP)** | `npx electron-builder --mac zip` | `.zip` (with `LazyStack.app`) | `release/LazyStack-1.0.0-mac.zip` |
| **All Platforms** | `npm run dist:all` | Builds for all supported targets | `release/` |
| **Unpackaged Folder** | `npm run pack` | Prepares unpackaged binary folder | `release/linux-unpacked/` |

---

### Step-by-Step Instructions

#### 1. Linux Build
To build universal Linux binaries:
```bash
# 1. Compile Vite frontend and packaging bundle
npm run dist:linux

# 2. Grant execution permissions
chmod +x release/LazyStack-1.0.0.AppImage

# 3. Launch LazyStack
./release/LazyStack-1.0.0.AppImage
```
Output:
- `release/LazyStack-1.0.0.AppImage` (Universal portable Linux executable)

#### 2. Windows Build
**Option A: Building natively on Windows**
```powershell
# In PowerShell or Command Prompt
npm install
npm run dist:win
```
Produces:
- `release/LazyStack Setup 1.0.0.exe` (NSIS installer with desktop shortcuts)
- `release/LazyStack 1.0.0.exe` (Standalone portable single-file executable)

**Option B: Cross-compiling Windows ZIP from Linux or macOS**
```bash
# Packages full Windows x64 binary without requiring Wine:
npx electron-builder --win zip
```
Produces:
- `release/LazyStack-1.0.0-win.zip` (Extract on Windows and run `LazyStack.exe`)

#### 3. macOS Build
**Option A: Building natively on macOS**
```bash
# In Terminal on macOS
npm install
npm run dist:mac
```
Produces:
- `release/LazyStack-1.0.0.dmg` (Drag-and-drop installer)

**Option B: Cross-compiling macOS ZIP from Linux or Windows**
```bash
# Packages full macOS app bundle without requiring Apple developer tools:
npx electron-builder --mac zip
```
Produces:
- `release/LazyStack-1.0.0-mac.zip` (Extract on macOS and run `LazyStack.app`)

---

### Publishing Releases to GitHub

To upload newly built release binaries to GitHub:
```bash
# 1. Authenticate with GitHub CLI
gh auth login

# 2. Upload or update assets for the release tag
gh release upload v1.0.0 --clobber \
  release/LazyStack-1.0.0.AppImage \
  release/LazyStack-1.0.0.exe \
  release/LazyStack-1.0.0-windows-x64.zip \
  release/LazyStack-1.0.0-mac.zip
```

---

## Continuous Integration: Scaffold-and-Boot Matrix

LazyStack maintains automated CI testing (`.github/workflows/ci.yml`) to verify that generated monorepo projects compile cleanly and produce syntactically valid Docker Compose infrastructure:

1. **Build & TypeScript Validation**: Compiles the Vite renderer, Electron main process, preload layer, and the standalone CLI, followed by full TypeScript typechecking (`tsc --noEmit`).
2. **Matrix Test Suite**: Automatically scaffolds and inspects popular presets:
   - **T3 Stack**: Next.js 15 App Router + PostgreSQL + Nginx Gateway
   - **FastAPI + React**: Python 3.12 FastAPI + React 19 + Redis + PostgreSQL
   - **Modern MERN**: React 19 + Express 5 + MongoDB 7.0
   - **Go + Vue**: Go Fiber v3 + Vue 3 + Redis 7.2
   - **Rust Axum**: Rust Axum 0.7 + SQLite
3. **Bootability Specification Check**: Runs `docker compose config --quiet` on every scaffolded stack to guarantee 100% syntactically valid container orchestration.

---

## Project Architecture

```
lazystack/
├── electron/
│   ├── main.ts                    # Electron window & lifecycle management
│   ├── preload.ts                 # Secure contextBridge IPC layer
│   ├── environment/
│   │   └── auditor.ts             # Host CLI runtime detection & quick-install
│   └── scaffolding/
│       ├── generator.ts           # Monorepo blueprint writer
│       └── templates/
│           ├── docker.ts          # Dockerfile & compose generators (Postgres, Valkey, etc.)
│           ├── nginx.ts           # Nginx upstream & location generator
│           ├── apache.ts          # Apache mod_proxy generator
│           └── starters.ts        # Polyglot framework project starters
├── src/
│   ├── components/
│   │   ├── CartBuilder.tsx        # Stack builder & framework selector
│   │   ├── DatabasePicker.tsx     # Database orchestrator (Valkey, Postgres, etc.)
│   │   ├── ProxyConfigurator.tsx  # Nginx / Apache reverse proxy config
│   │   ├── EnvironmentAuditor.tsx # Host runtime checker & package installer
│   │   ├── BlueprintInspector.tsx # Real-time file tree & compose preview
│   │   ├── ProjectConfigBar.tsx   # Project name & target directory selector
│   │   ├── ValidationBanner.tsx   # Blueprint validation & Scaffold button
│   │   └── Header.tsx             # Theme toggle & branding
│   ├── data/
│   │   ├── frameworks.ts          # Framework catalog & requirements
│   │   └── databases.ts           # Database definitions (Valkey 8, MySQL, etc.)
│   ├── types.ts                   # Core TypeScript domain models
│   ├── App.tsx                    # Root UI state machine
│   └── index.css                  # Warm cream & sleek dark design system
├── release/                       # Packaged executables (.AppImage, .exe, .dmg)
├── package.json                   # Build & packaging configurations
└── vite.config.ts                 # Vite + Electron build configuration
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.
