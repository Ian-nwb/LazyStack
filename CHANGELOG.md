# Changelog

All notable changes to LazyStack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
