# LazyStack

> **Automated Polyglot Monorepo & Fullstack Architecture Scaffolder**  
> Design, configure, and scaffold production-ready fullstack monorepos with unified gateway routing, container orchestration, and real-time host toolchain auditing.

---

## Version 1.0.2 Builds

This source tree builds a Linux AppImage and a portable Windows executable. Version 1.0.2 outputs go in `release/1.0.2/`; this build does not package macOS.

| Target | Command | Output |
| :--- | :--- | :--- |
| Linux x64 | `npm run dist:linux` | `release/1.0.2/LazyStack-1.0.2.AppImage` |
| Windows x64 | `npm run dist:win` | `release/1.0.2/LazyStack 1.0.2.exe` |
| Both | `npm run dist:release` | AppImage and Windows portable EXE |

---

## Key Highlights

- **Polyglot Stack Builder**: Mix and match any frontend, backend, or fullstack framework. Support for 65+ technologies across 30+ languages (TypeScript, JavaScript, Go, Rust, Python, PHP, Java, C#, Elixir, Ruby, Haskell, Swift, Scala, Clojure, OCaml, Julia, Lua, R, Erlang, Nim, Crystal, C++, Assembly, and Zig).
- **Reverse Proxy Gateway Generation**: Automatically provisions unified entrypoint configurations for **Nginx** (upstreams, WebSocket upgrades) or **Apache HTTP Server** (`mod_proxy`, `mod_proxy_wstunnel`), or direct port mappings.
- **Database & Cache Ecosystem**: 1-click Docker orchestration for **PostgreSQL 16**, **MySQL 8.4**, **MongoDB 7**, **Redis 7.2**, **Valkey 8 (Linux Foundation)**, **ClickHouse OLAP**, **Meilisearch**, and **SQLite**.
- **Host Environment Auditor**: Detects host toolchains (Node, Bun, Deno, Go, Cargo, Python, Composer, .NET SDK, Docker, etc.) in real time with quick-install commands and PATH helpers.
- **Warm Cream & Sleek Dark Themes**: Monochromatic design featuring warm ivory cream (`#faf6ed`), rich parchment, and dark espresso typography.
- **Turnkey Scaffolding**: Produces clean folder structures, Dockerfiles, docker-compose configs, `.env` files, and unified orchestrator tasks ready to run with `docker compose up`.

## 15 possible features for future releases

These are product ideas for discussion; they are not promises or current features.

1. **Local AI stack assistant** — describe a stack in plain language and let a local model draft the blueprint.
2. **Environment profiles** — keep development, staging, and production settings in separate profiles.
3. **Kubernetes and Helm export** — generate manifests and charts alongside Docker Compose.
4. **Terraform and Pulumi export** — provision cloud infrastructure from the selected stack.
5. **Visual service topology** — inspect APIs, databases, queues, and network dependencies as a diagram.
6. **OpenAPI client generation** — create typed clients for connected services from API schemas.
7. **Observability bundle** — optionally add OpenTelemetry, Prometheus, Grafana, and log collection.
8. **Database backup and restore** — create portable snapshots and restore workflows for generated databases.
9. **Secrets manager integrations** — connect environment settings to 1Password, Vault, or cloud secret stores.
10. **Deployment targets** — generate deployment workflows for common cloud and self-hosted platforms.
11. **Plugin and template registry** — share custom frameworks, database adapters, and stack presets.
12. **Architecture migration assistant** — preview and apply changes when a stack or directory layout evolves.
13. **More generated test coverage** — scaffold useful unit, integration, contract, and browser tests per framework.
14. **Resource sizing estimates** — estimate local and deployment CPU, memory, and storage needs.
15. **Team blueprint collaboration** — review, compare, and merge stack configuration changes.

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

## Building Linux and Windows packages

LazyStack is packaged using `electron-builder`. The v1.0.2 build targets Linux AppImage and Windows portable EXE only.

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**

```bash
git clone https://github.com/Ian-nwb/LazyStack.git
cd LazyStack
npm install
```

### Build commands

```bash
# Build only the Linux AppImage
npm run dist:linux

# Build only the portable Windows EXE
npm run dist:win

# Build both deliverables
npm run dist:release
```

Linux output: `release/1.0.2/LazyStack-1.0.2.AppImage`. Windows output: `release/1.0.2/LazyStack 1.0.2.exe`.

Run the AppImage with `chmod +x release/1.0.2/LazyStack-1.0.2.AppImage` followed by `./release/1.0.2/LazyStack-1.0.2.AppImage`.

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
├── release/                       # Packaged executables (.AppImage, .exe)
├── package.json                   # Build & packaging configurations
└── vite.config.ts                 # Vite + Electron build configuration
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.
