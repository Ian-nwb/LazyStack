# LazyStack

> **Automated Polyglot Monorepo & Fullstack Architecture Scaffolder**  
> Design, configure, and scaffold production-ready fullstack monorepos with unified gateway routing, container orchestration, and real-time host toolchain auditing.

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
- **Haskell**: Servant Web API
- **High Performance / Systems**: C++ Drogon, x86-64 NASM Micro-server, Zig HTTP

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

## Building for Windows, macOS, and Linux

LazyStack is packaged using `electron-builder` with multi-target output configurations.

### Quick Build Commands

| Target Platform | Command | Generated Artifacts | Output Location |
| :--- | :--- | :--- | :--- |
| **Linux** | `npm run dist:linux` | `.AppImage`, `.deb` (x64) | `release/` |
| **Windows** | `npm run dist:win` | `.exe` (NSIS Installer & Portable) | `release/` |
| **macOS** | `npm run dist:mac` | `.dmg` | `release/` |
| **All Platforms** | `npm run dist:all` | Builds for all supported targets | `release/` |
| **Unpackaged Dir** | `npm run pack` | Prepares unpackaged binary directory | `release/linux-unpacked/` |

### Platform-Specific Build Notes

#### Linux
To build on Ubuntu / Debian / Fedora:
```bash
npm run dist:linux
```
Produces:
- `release/LazyStack-1.0.0.AppImage` (Universal portable Linux executable, `chmod +x` to run)
- `release/lazystack_1.0.0_amd64.deb` (Debian/Ubuntu package installer)

#### Windows
To build Windows binaries from a Windows machine:
```bash
npm run dist:win
```
*(If cross-compiling from Linux or macOS, ensure `wine` and `mono` are installed or use Docker).*  
Produces:
- `release/LazyStack Setup 1.0.0.exe` (NSIS installer with desktop shortcuts)
- `release/LazyStack 1.0.0.exe` (Standalone portable single-file executable)

#### macOS
To build macOS `.dmg`:
```bash
npm run dist:mac
```
*(Note: Building macOS DMGs natively requires macOS. For code signing and notarization, configure Apple Developer credentials in your environment).*  
Produces:
- `release/LazyStack-1.0.0.dmg`

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
