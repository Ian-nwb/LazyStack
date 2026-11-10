# Changelog

All notable changes to LazyStack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-11-10

### Changed
- **Stack presets reduced to the five most common**: T3 Next.js, FastAPI + React, Modern MERN, Go Echo + Vue 3 and Rust Axum. Supabase + Next.js, Firebase + React, Turso + SvelteKit, .NET Core Enterprise, AI Agent & LLM, Clean Architecture Go and Event-Driven Kafka were removed from the preset row and from `lazystack presets`. The same stacks can still be built by hand.
- **Architecture layouts: 15 are offered.** 1.2.0 cut the layouts from 16 to 7 by mistake; Domain-Driven, Hexagonal, Clean Architecture, CQRS, Data Platform, AI/ML Platform, JAMstack and Edge, and Mobile and Cross-Platform are back. Only **CLI and Tooling Monorepo** stays removed. A blueprint that names a removed layout still scaffolds with its folders unchanged and opens as Custom.

## [1.2.0] - 2026-11-10

### Added
- **Architecture layouts and diagrams are computed from the generator.** The Blueprint tree, the README's directory tree and `lazystack plan` list exactly the files LazyStack will write. The architecture picker shows where each app role is placed and a live "Resulting layout" for your cart; Custom mode can edit the folder for each role.
- **Service diagram and Network topology were redrawn.** The service diagram shows gateway routes, call depth, connection variables and per-service data scope. The network topology separates the host machine, the named Docker network (`<project>_lazystack_net`) and managed external services, and shows each container as `service:port` with the port it is published on, including traffic through `host.docker.internal`.
- Generated `docs/architecture.md` now contains the same two diagrams (Mermaid) plus published ports, services and databases, and the Blueprint "Export Markdown" button produces the same document.
- Presets with extra root folders (for example Microservices `shared/contracts/`) create each folder with a short `README.md`, so git keeps them.
- `npm run verify:layout` (run in CI) checks that preset descriptions only name folders the generator creates, that the planned files equal the dry-run changes, and that the topology matches the generated Compose file.

### Changed
- **The architecture picker offers 7 layouts instead of 16**: Standard Monorepo, Microservices, Modular Monolith, Polyglot, Event-Driven, Serverless and Custom. Domain-Driven, Hexagonal, Clean Architecture, CQRS, Data Platform, AI/ML Platform, JAMstack and Edge, Mobile and Cross-Platform, and CLI and Tooling were removed. Existing blueprints and `lazystack.json` files that name a removed layout still scaffold with their folders unchanged and open as Custom; only the extra README-marked folders of that layout are no longer created.
- Preset descriptions only promise root-level folders; the layout inside each app is always the framework's own. Microservices creates `shared/contracts/`.
- **Serverless & Cloud-Native** places frontend and full-stack apps in `web/` (they previously went into `functions/`).
- The **Hybrid** database isolation mode now does what it says: data stores are scoped per service, while caches and message brokers (Redis, Valkey, RabbitMQ, Kafka) stay shared. It is used by Modular Monolith.

### Fixed
- The Swagger UI and a database admin UI could be published on the same host port (8088), so `docker compose up` failed. Admin UI ports are now reserved first.
- A disabled or managed-cloud database listed before an unnamed one made Compose name the container differently from the hostname in the apps' `.env` (for example `redis` versus `redis_2`). Compose and the apps now use the same name.
- In **Open Existing Project**, a dry run of an update appended cloud-service variables to the real `.env` and did not list the change. Those variables are now merged by the writer and reported.

## [1.1.3] - 2026-11-10

### Fixed
- **Reverse proxy gateways did not work.** Nginx (the default) exited on start because Compose mounted the main `nginx.conf` into `conf.d/`; Apache refused to start without `mod_unixd`; Traefik's routes file was invalid YAML. Nginx, Caddy and Traefik also forwarded the route prefix, so `/api/health` reached the API as `/api/health` instead of `/health`. All four now start and strip the prefix (Apache lists longer prefixes first), and the gateway waits for the app containers.
- Every generated project used the Compose project name `infra`, so starting one project replaced another project's containers. Compose files now set `name:` from the project name.

### Changed
- CI boots the generated FastAPI + React stack and requests `/` and `/api/health` through Nginx, Apache, Caddy and Traefik.

## [1.1.2] - 2026-11-10

### Added
- **Capacitor** (`capacitor-app`): a plain Vite web app (TypeScript or JavaScript, no UI kit) wrapped in native Android and iOS shells with Capacitor 8. It includes an `@capacitor/app` plugin example and a Vitest test. The web build runs in Docker; native builds use `npx cap add` / `npm run android`.
- **.NET MAUI** (`csharp-maui`): a .NET 10 app following the `dotnet new maui` single-project layout (`Platforms/`, `Resources/`, Shell, a view model) with an xUnit test project. It always runs on the host; the dev orchestrator runs the Android target on Linux, Mac Catalyst on macOS and Windows on Windows. Linux can only build Android.
- Both are recognized by **Open Existing Project** / `lazystack import` (`@capacitor/core` without Ionic; `<UseMaui>true</UseMaui>`), and both appear in the manual-setup popup.

### Fixed
- **Install Packages** did nothing useful in many setups:
  - package managers installed through nvm, volta, rustup, Go or .NET were not found when the app was launched from the desktop (missing user `PATH` entries);
  - every failure was swallowed and the button reported success;
  - commands with more than 1 MB of output were killed;
  - apps deeper than two folders (e.g. `backend/services/<app>`) were skipped;
  - the button did nothing in the browser dev build.
- Package metadata `author` is now Ian-nwb (https://github.com/Ian-nwb).
- `lazystack validate`/`scaffold` rejected blueprints with cloud databases (Supabase, Firebase, Neon, ...) because they have no local port.
- The dev orchestrator started Tauri with `npm run tauri dev`, a script the starter does not define; it now runs `npm run dev`.
- **Start/Stop Stack** always used `infra/docker-compose.yml`, so projects using the Polyglot layout (`deploy/`) or a custom infrastructure folder could not start. The stack now uses the folder recorded in `lazystack.json` (falling back to `infra/`, `deploy/`, `infrastructure/`, `docker/` or the root), only passes `--env-file .env` when it exists, and reports a clear error when Docker or the Compose file is missing.

### Changed
- After scaffolding (or applying changes to an existing project), a popup reminds you to read the READMEs. When the stack includes something that needs a step LazyStack can't do for you, the popup switches to a **manual setup** view that lists each one with numbered steps and docs links, and it always shows for those stacks. This covers 25 frameworks plus every cloud database:
  - **SDKs, CLIs and accounts:** Flutter platform folders, Google Apps Script (clasp login and script id), Anvil, Expo, Ionic native shells, Dioxus, Yew/Leptos (Trunk), SwiftUI.
  - **System libraries and toolchains:** Tauri, GPUI, Bevy, Slint, OCaml/Dream, Drogon, libmicrohttpd, NASM, Haskell, Nim, R, Lapis.
  - **Secrets and schema:** Laravel `APP_KEY`, Symfony `APP_SECRET`, the FastAPI API-service profile, SQL migrations.
  - **Cloud databases:** provider credentials.
  The same steps are written to a "Manual setup required" section in the generated root README.
- Installing packages now shows live progress: a spinner and step counter on the button, plus a panel with the current step, elapsed time, a progress bar and streaming output. When it finishes, the panel lists every step as installed, skipped (tool not installed, with the command to run) or failed (with its output).
- Node workspaces are installed once from the root; Rust uses `cargo fetch`, Go uses `go mod tidy`, and Maven, Deno and Elixir (Hex) projects are covered.
- **Expo** now uses a native starter matching `create-expo-app` on **SDK 58** (React Native 0.88, React 19.3, Expo Router tabs, `eas.json`, a jest-expo test), replacing the SDK 51 template. Expo is now host-only, so it no longer gets a Docker service.
- Service connections from Expo, Capacitor and Ionic apps now use the bundler's public prefix (`EXPO_PUBLIC_…`, `VITE_…`) and a host-reachable URL (`localhost` or the proxy) instead of a Docker service name. Expo and Capacitor apps also get `EXPO_PUBLIC_API_URL` / `VITE_API_URL` pointing at their first connection, which the starters read.

## [1.1.1] - 2026-11-08

### Added
- **New frameworks**: Dioxus (Rust, web/desktop/mobile via `dx`), Slint (Rust desktop), Bevy (Rust game engine), JavaFX (modular FXML app) and Java Swing (Maven, UI/model split with JUnit tests). Desktop frameworks run on the host and never get a Docker service.
- **Framework-native project folders for every framework**: starters now mirror each framework's own initializer (`ng new`, `nest new`, `django-admin startproject` + `startapp`, `mix phx.new --no-html`, `dx new`, `javafx-archetype-fxml`, start.spring.io, start.ktor.io, `play-scala-seed`, `rebar3 new release`, `lapis new`, `dune init project`, `crystal init`, `deno init`, Fresh, Vapor, `dotnet new web` / `blazorwasm`, and more), including test folders with a passing test, an ecosystem `.gitignore`, and a README with run, test and build commands. Starters live in `electron/scaffolding/templates/native/`.
- **Open Existing Project**: open any folder in the desktop app (or `lazystack import --dir`) to view it as a Blueprint diagram. Projects generated by LazyStack round-trip through the new embedded `lazystack.json`; other repositories are detected from manifests (`package.json`, `Cargo.toml`, `go.mod`, `pom.xml`, `requirements.txt`, `composer.json`, `*.csproj`, ...), Compose files (databases and ports) and proxy config. Add apps, databases or a proxy, review a change preview, and apply. Existing app folders are never modified, `.env` files only gain missing keys, and regenerated infrastructure files are backed up to `.lazystack/backup/<timestamp>/`.
- **CLI**: `lazystack import`, `lazystack add --tech <id>` and `lazystack apply --config <file>` for existing projects, all with `--dry-run`.
- Generated projects now include `lazystack.json`, and `.lazystack/` is git-ignored.
- `npm run verify:templates` (run in CI) checks every catalog framework against its starter files and Dockerfile.

### Fixed
- 14 frameworks (Play, Vapor, Poem, Clojure, Crystal, Erlang, Julia, Lapis, Nim, OCaml, R, TanStack Start, SolidStart, Lit) generated a generic Node.js stub instead of their own project: their templates were unreachable behind the TypeScript fallback.
- Go Gin, Echo, Fiber and Chi starters never imported their framework and ignored `PORT`.
- Vite single-page apps (React, Vue, Solid, Inferno, MUI, Lit, Qwik), Nuxt, SvelteKit and Astro had no `start` script, so their containers exited on boot.
- SvelteKit used `adapter-auto` (no runnable Docker output) and was missing `src/app.html`; it now uses `adapter-node`.
- Angular, Ionic, NestJS and Hono starters could not build (missing `index.html`, tsconfig, `nest-cli.json`, compiler packages or build/start scripts).
- The Deno Fresh starter did not use Fresh; Phoenix was a bare Plug app; the Erlang starter referenced modules that did not exist.
- Dockerfiles: .NET ran `dotnet run` in the SDK-less runtime image (now `dotnet publish`, Blazor served by Nginx); Zig built the wrong path; Julia's `CMD` was invalid JSON; Clojure, OCaml, Erlang, Swift and Play copied files the starters did not create; Elysia used a Node image without Bun; Rust images now build a release binary on `rust:1-alpine` instead of running `cargo run`; Go runs `go mod tidy` before building.
- OCaml Dream images lacked the `pkg-config`, `libev` and OpenSSL system packages, and the builder's glibc did not match the runtime image; Lapis images used an OpenResty variant without LuaRocks.
- `docker-compose.yml` was invalid when every app ran on the host (`services` must be a mapping), and no longer emits the obsolete `version` key.
- Host-only apps were inconsistently excluded: GPUI could appear in Compose, and Kubernetes, Terraform and deploy workflows included desktop apps. Electron, Tauri, Flutter and Apps Script are now host-only too; older blueprints that set them to Docker are normalized instead of failing.
- Dev orchestrator: Clojure launched with `lein` instead of the Clojure CLI, OCaml pointed at the wrong executable, Go skipped `go mod tidy`, and Yew/Leptos ran `cargo run` instead of `trunk serve`.
- The Electron starter enabled `nodeIntegration` without context isolation; it now uses a preload bridge.
- ASP.NET Core hard-coded port 5000; it now honours `PORT`.
- Blueprint previews are derived from the files the generator writes, so they no longer list paths that are never created.
- CI's PHP syntax check pointed at a file the starter does not generate.

## [1.1.0] - 2026-11-07

### Added
- Rust GPUI desktop starter and Yew and Leptos WebAssembly starters (built with Trunk).
- Framework-native paths for catalog entries and per-runtime environment defaults (`RAILS_ENV`, `SPRING_PROFILES_ACTIVE`, `MIX_ENV`, `RUST_LOG`, ...) instead of `NODE_ENV` everywhere.
- Native layout previews in the Blueprint tree.
- Caddy and Traefik reverse proxy generation alongside Nginx and Apache.

### Changed
- Plain PHP uses a `public/` web root.
- Hosted and native desktop/mobile apps (GPUI, Anvil, SwiftUI) run on the host without Docker templates.

## [1.0.9] - 2026-10-31

### Added
- **Universal 75+ Framework Out-of-the-Box Runtime**: Dev orchestrator now maps native launch commands for all 75+ supported technologies (Python, Go, Rust, C#, PHP, Ruby, Elixir, Zig, C, C++, Java, Kotlin, Scala, Clojure, OCaml, Julia, Lua, R, Erlang, Nim, Crystal, Swift, Dart, Bun, Deno).
- **Automated Python Virtualenv & First-Boot Migrations**: Scaffolding and runtime automatically build a local `.venv`, install `requirements.txt` via isolated pip, and run database migrations on initial startup (Django, FastAPI Alembic, Flask) to eliminate PEP 668 errors.
- **PHP Symfony 7 & Go Goravel Starters**: Added Symfony 7 and Go Goravel backends with complete directory scaffolding (`app/http/controllers`, `routes`, `config`), Dockerfiles, and dev server orchestration.
- **Multi-Language Dependency Installer**: Automated package management across all project candidate folders (`npm`, `pip`, `composer`, `bundle`, `mix`, `cargo`, `go mod`, `dotnet`, `flutter`, `shards`, `rebar3`, `julia`).

## [1.0.8] - 2026-10-31

### Added
- **6 New Architecture & Directory Layout Presets**:
  - **AI / ML & LLM Platform**: Tailored for modern AI products with `models/` (weights & prompts), `agents/workers/` (autonomous loops), `services/inference/` (FastAPI/Triton serving), `pipelines/eval/` (benchmarking), and `prompts/` (versioned DSPy/LangChain schemas).
  - **Clean Architecture / Onion**: Strict concentric boundaries decoupling business logic with `domain/` (entities), `usecases/` (application workflows), `adapters/` (controllers & presenters), and `services/` (delivery implementations).
  - **CQRS & Event Sourcing**: Separated write-side command processors (`services/commands/`) from read-side query projections (`services/projections/`) with append-only event contracts (`events/`).
  - **JAMstack & Edge Platform**: Globally distributed edge architecture with `sites/` (SSR/SSG storefronts), `edge/workers/` (Cloudflare Workers / Edge runtime), and `edge/schedulers/`.
  - **Mobile & Cross-Platform Monorepo**: Unified codebase for `apps/mobile/` (React Native/Expo/Flutter), `apps/web/` (Next.js/Vite), `apps/desktop/` (Tauri/Electron), and shared `packages/ui/` design system.
  - **Developer Tooling & CLI Monorepo**: Multi-package engine for tool builders with `packages/cli/`, `packages/core/`, `plugins/`, and `build-infra/`.
- **Signature Directory Scaffolding**: Core generator ensures signature directories for all 16 architecture presets are physically scaffolded on disk.
- **New 1-Click Production Stack Presets**:
  - `ai-agent-platform`: FastAPI Agent backend + React Vite dashboard + Redis Streams + Qdrant vector DB.
  - `clean-go-onion`: Go Echo Clean Architecture backend + Vue 3 client + PostgreSQL.
  - `event-driven-kafka`: NestJS producer API + Python consumer worker + Apache Kafka + PostgreSQL.
- **CLI Ecosystem Listing**: `lazystack list` now outputs all 16 architecture and directory structure presets with their IDs and taglines.

### Fixed
- **Production Preload Script & Host Auditor**: Configured CommonJS format for the Electron preload bundle in `vite.config.ts` so `window.electronAPI` initializes cleanly in production packages (AppImage and Windows portable `.exe`), eliminating the `Failed to fetch` error on `/api/audit`.
- **Concurrent Host Diagnostics & Enhanced PATH Discovery**: Optimized binary auditing to run in parallel via `Promise.all`, dropping latency to under 1 second, and added automatic PATH resolution for common Windows (`WinGet`, `scoop`, `%LOCALAPPDATA%`, `Program Files`) and Linux developer paths.

## [1.0.7] - 2026-10-31

### Added
- **Terraform / OpenTofu Export**:
  - Auto-generates `infra/terraform/main.tf` with provider blocks for AWS, GCP, and DigitalOcean (multi-provider, one to activate).
  - Per-app `infra/terraform/services/<service>.tf` with AWS ECS Fargate task definition and service, plus commented GCP Cloud Run and DigitalOcean App Platform alternatives.
  - Shared `cluster.tf` (ECS cluster + security group) and `outputs.tf`.
- **Kubernetes / Helm Charts**:
  - Per-app `infra/k8s/<service>.yaml` — Deployment with resource requests/limits and liveness probe + ClusterIP Service.
  - Shared `infra/k8s/configmap.yaml`, `infra/k8s/secret.yaml`, and `infra/k8s/ingress.yaml` (Nginx Ingress, generated when a proxy is configured).
  - Helm chart skeleton under `infra/helm/<project>/` with `Chart.yaml` and a structured `values.yaml` with per-service image, port, and resource overrides.
- **CI/CD Deploy Workflow**:
  - `.github/workflows/deploy.yml` generated in every scaffolded project.
  - Matrix build strategy — one container image build+push job per service.
  - Publishes to GitHub Container Registry (GHCR) with `latest` and commit SHA tags.
  - Layer caching via `type=gha` for fast incremental builds.
  - Separate `deploy` job triggered after build-push completes on `main`.
- **Generated project README** updated to document all cloud deployment paths, manifest locations, and usage commands.

## [1.0.6] - 2026-10-30

### Added
- **Unified Dev Orchestrator (`lazystack dev` / `npm run dev`)**:
  - Automatically spins up required background databases, caches, and message brokers via `docker compose --env-file .env -f infra/docker-compose.yml up -d` without needing to containerize host frontend or backend applications.
  - Concurrently runs all host applications with live, line-buffered ANSI color prefixes (`[client]`, `[api]`, `[worker]`, `[docs]`).
  - Injects mutual environment variables dynamically from the generated `.env` into each child process.
  - Zero-dependency Node.js ES module runner generated at `scripts/dev-orchestrator.mjs`.
  - Added CLI `lazystack dev` command with `--dir` and `--docker` options.
  - Updated `scripts/dev.sh` and `scripts/dev.ps1` to prefer the orchestrator when Node.js is present on the host.
  - Added `dev:all`, `dev:docker`, `dev:sh`, and `dev:ps1` scripts to generated monorepo workspace `package.json`.
- **Event-Driven Message Brokers & Worker Wiring**:
  - Added Apache Kafka (KRaft mode, zero-ZooKeeper) container orchestration on port 9092 using `apache/kafka:3.7.0`.
  - Automatically scaffolds shared typed contracts in `packages/events/` (`@<scope>/events`) whenever RabbitMQ, Kafka, Redis Streams, or worker services are present.
  - Strongly typed `BaseEvent<T>` envelope with UUIDs, correlation IDs, timestamps, and retry counts.
  - Domain event schemas: `UserRegisteredPayload`, `OrderCreatedPayload`, `TaskQueuedPayload`, `TaskCompletedPayload`, and `DeadLetterPayload`.
  - Dead-letter queue pipeline (`events.dead_letter`) with exponential backoff and retry policy configuration (`DEFAULT_RETRY_POLICY`).
  - Polyglot publisher and consumer harnesses:
    - TypeScript/Node: `packages/events/src/publisher.ts` and `packages/events/src/consumer.ts`.
    - Python: `packages/events/examples/worker.py`.
    - Go: `packages/events/examples/worker.go`.
  - Broker configuration exported in `.env` (`EVENT_BROKER_TYPE`, `EVENT_RETRY_LIMIT`, `EVENT_BACKOFF_MS`, `EVENT_DLQ_TOPIC`).

## [1.0.5] - 2026-10-30

### Added
- **Google Apps Script Starter**:
  - Added to the `scripting` catalog category with Google Workspace automation support.
  - Powered by `@google/clasp`, with `.clasp.json`, `appsscript.json`, and `.claspignore`.
  - Supports both TypeScript and JavaScript flavors with sample `onOpen`, `runSample`, and `doGet` handlers.
- **React Native (Expo) Starter**:
  - Added to the `mobile-desktop` catalog category with file-based routing via Expo Router (`expo-router`).
  - Cross-platform targeting for iOS, Android, and Web with TypeScript and JavaScript options.
  - Includes tab navigation, theme integration, vector icons, and safe area context.
- **Inferno.js Starter**:
  - Added to the `frontend` catalog category for blazing-fast, React-compatible DOM rendering with minimal bundle overhead.
  - Configured with Vite, `@vitejs/plugin-react` (aliasing `inferno`), and JSX support.
  - Supports both TypeScript and JavaScript flavors with interactive state demonstration.
- **AssemblyScript (WebAssembly) Starter**:
  - Added to the `scripting` catalog category for high-performance WebAssembly compilation.
  - Strict TypeScript code compiled directly to `.wasm` binaries via AssemblyScript compiler (`asc`).
  - Pre-configured with `asconfig.json`, `assembly/tsconfig.json`, Node.js Wasm executor, and unit test suite.
- **Icon Overrides**:
  - Added icon mappings in `src/utils/techIcons.ts` for Google Apps Script, AssemblyScript (Wasm), React Native Expo, and Inferno.js.
- **Standalone CLI Package (v1.0.5)**:
  - Independent npm package distribution in `packages/cli` (`lazystack`).
  - Added interactive and flag-driven `init` for preset-based blueprint creation.
  - Added `search` across frameworks, databases, presets, and testing tools with JSON support.
  - Added `validate` and `plan` commands for blueprint analysis without scaffolding.
  - Added `doctor` diagnostic checks for toolchains and Docker prerequisites.
  - Added dry-run mode and `--force` confirmation before writing into non-empty directories.
- **Desktop Application Release**:
  - Built Linux AppImage (`LazyStack-1.0.5.AppImage`) and Windows portable executable (`LazyStack 1.0.5.exe`).

## [1.0.4] - 2026-10-26

### Added
- Native project generation with optional unified monorepo workspace.
- FastAPI API-service profile with complete OpenAPI specification integration.
- Typed TypeScript client generation connected to OpenAPI contracts.
- Service and network architecture diagrams with SVG and Markdown export.
- Expanded scaffold and boot CI matrix covering JavaScript/TypeScript, Python, Go, Rust, Java, Kotlin, and PHP.

## [1.0.3] - 2026-10-26

### Added
- Expanded stack catalog with additional backend, database, and devops templates.
- Hotfix for database tooling and connection string generation.

## [1.0.2] - 2026-10-26

### Added
- UI polish and preset selection enhancements.
- Template generation bug fixes and reliability improvements.

## [1.0.0] - 2026-10-24

### Added
- Initial production release of LazyStack.
- Interactive Electron desktop builder with tech stack cart and monorepo scaffolding.
- Docker Compose orchestration generation for microservices and polyglot stacks.
- CLI scaffolding tool with configuration export and blueprint import.
- 1-click curated stack presets.
