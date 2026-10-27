# LazyStack

LazyStack is a desktop stack builder and command-line scaffolder for composing application stacks. Choose languages, frameworks, databases, service connections, testing tools, and an architecture layout; LazyStack generates a project structure and supporting configuration.

## Download v1.0.4

Download **Linux AppImage** or **Windows portable EXE** from the [v1.0.4 GitHub release](https://github.com/Ian-nwb/LazyStack/releases/tag/v1.0.4).

| Platform | Package |
| --- | --- |
| Linux x64 | AppImage |
| Windows x64 | Portable EXE |

macOS package not yet available (sponsor me a Macbook for app signature)

## Features

- **Mix application roles:** Generate frontend clients, backend services, full-stack apps, workers, and desktop/mobile clients together.
- **Broad technology catalog:** Use established frameworks or start with plain language/runtime templates. Current options include React, Vue, Angular, Solid, Qwik, HTMX, Lit, Kotlin/JS, SwiftUI, Reflex, NiceGUI, Anvil, Python, PHP, Go, Java, Node.js, Kotlin/Ktor, Swift/Vapor, Rust, and many more.
- **Architecture layouts:** Choose a preset or customize root directories, additional folders, and per-app paths.
- **Polyglot layout:** Route browser clients to `frontend/clients/`, API services to `backend/services/`, workers to `backend/workers/`, and deployment files to `deploy/`.
- **Service connections:** Configure API URLs, environment variable names, health checks, and startup dependencies between services.
- **Database configuration:** Add self-hosted databases or managed cloud providers, configure per-service database scope, and generate local credentials in `.env`.
- **Database web UIs:** Optionally attach an admin UI to each database instance: Adminer, pgAdmin, or Prisma Studio for PostgreSQL; Adminer, phpMyAdmin, or Prisma Studio for MySQL/MariaDB; Mongo Express for MongoDB; and Redis Commander for Redis/Valkey. Prisma Studio runs on the host so its local web server is reachable; the generated project adds an `npm run prisma:studio:<database>` command. Start the database stack first, then run that command and open the configured local port. It uses Prisma CLI 7's direct connection URL support, so it does not require a Prisma schema.
- **Testing tools:** Select tools per app, organized by test purpose. See [Testing tools](#testing-tools).
- **Infrastructure output:** Generate Docker Compose, optional Nginx or Apache routing, environment files, scripts, shared packages, and starter documentation.
- **Blueprints and CLI:** Export JSON blueprints and scaffold them without opening the desktop interface.

## Frontend and vanilla starters

Frontend and UI choices include React + Vite, React + MUI, Vue + Vite, Angular, SolidJS, Qwik, HTMX, Lit web components, vanilla HTML/CSS/JavaScript, Kotlin/JS for browser apps, and SwiftUI for native Apple clients. Python UI choices include Reflex and NiceGUI, which combine a Python backend with browser-rendered UI. Anvil is included as a hosted Python full-stack option; its apps are continued in the Anvil editor.

For plain services, choose Vanilla Node.js, PHP, Go (`net/http`), Python standard-library HTTP, or Java JDK `HttpServer`. These are framework-free starters with runnable source and README instructions. Existing framework choices include Go Chi/Echo, PHP Laravel, Kotlin Ktor, Swift Vapor, and others.

## Testing tools

Testing is a first-class stack choice. Select tools for the app’s language and testing needs; the generator records the choices in the project configuration and adds available starter/configuration files.

| Test area | Available examples |
| --- | --- |
| Unit and component | Jest, Vitest, Testing Library, pytest, Go `testing`, PHPUnit, JUnit, 
| API and integration | Supertest, Newman, Bruno, REST Assured, Swagger UI, and Swagger/OpenAPI spec validation with the Redocly CLI |
| Browser end-to-end | Playwright, Cypress, WebdriverIO, Puppeteer |
| UI component development | Storybook |
| Performance and load | k6, Artillery |
| Contract and schema | Pact, OpenAPI validation |
| Security checks | OWASP ZAP |
| Extend the catalog | Add custom testing tools by name and package |

The tool list varies with the selected stack, and teams can choose more than one tool for an app. Tools are opt-in; the generator does not install every test runner into every generated service.

## Architecture layouts

| Layout | Directory focus |
| --- | --- |
| Standard Monorepo | `apps/`, `packages/`, `infra/` |
| Microservices Decoupled | `services/`, shared contracts, isolated service data |
| Domain-Driven Design | `domains/`, `core/`, bounded contexts |
| **Polyglot** | `frontend/clients/`, `backend/services/`, `backend/workers/`, `deploy/` |
| Modular Monolith | `modules/`, `libs/`, shared deployment |
| Hexagonal / Ports & Adapters | Services separated from core logic and adapters |
| Serverless & Cloud-Native | `functions/`, shared packages, cloud infrastructure |
| Event-Driven Services | APIs, consumers, event schemas, and broker infrastructure |
| Data Platform | Pipelines, ingestion services, dashboards, and schemas |
| Custom Structure | User-defined roots, custom folders, and per-app paths |

## Databases

Self-hosted options include SQLite, PostgreSQL, MySQL, MariaDB, MongoDB, Redis, Valkey, ClickHouse, SurrealDB, Neo4j, Qdrant, Meilisearch, MinIO, ScyllaDB, RabbitMQ, and PocketBase. Cloud and backend-as-a-service options include Supabase, Firebase, PlanetScale, Neon, Turso, Upstash, Appwrite, and Convex.

Generated database passwords are stored in the project root `.env`. Keep that file private; `.env.example` contains safe placeholders.

## Requirements

- Node.js 20 or newer and npm 10 or newer to run or build LazyStack from source.
- Docker Engine/Desktop with Docker Compose to run generated container stacks.
- The runtime/toolchain required by the templates you select.

## Run from source

```bash
git clone https://github.com/Ian-nwb/LazyStack.git
cd LazyStack
npm install
npm run dev
```

To build and run the desktop app locally:

```bash
npm run build
npm start
```

## CLI

The standalone CLI package is being prepared as v1.0.5. It supports blueprint initialization, catalog search, validation, planning, prerequisite checks, export, and scaffolding. See [the CLI roadmap](ROADMAP-1.0.5.md) for scope and package publishing status.

```bash
npm run build:cli
npm run cli -- help
npm run cli -- init --preset fastapi-react --name my-api
npm run cli -- validate --config lazystack.json
npm run cli -- plan --config lazystack.json
npm run cli -- doctor --config lazystack.json
npm run cli -- list
npm run cli -- presets
```

Export a blueprint, then scaffold it:

```bash
npm run cli -- export --preset modern-mern --name my-app --out lazystack.json
npm run cli -- scaffold --config lazystack.json --out ./generated
```

Or scaffold directly from a preset:

```bash
npm run cli -- scaffold --preset fastapi-react --name my-api --out ./generated
```

`--out` is the parent directory where the generated project will be created.

## Build packages

The v1.0.4 scripts build Linux AppImage and Windows portable EXE packages; they do not build for macOS.

```bash
npm run dist:linux    # release/1.0.4/LazyStack-1.0.4.AppImage
npm run dist:win      # release/1.0.4/LazyStack 1.0.4.exe
npm run dist:release  # build both targets
```

## v1.0.4

v1.0.4 adds native project generation with an optional unified workspace, a tested FastAPI API-service profile, generated OpenAPI TypeScript clients, expanded scaffold CI, and service/network architecture diagrams. The detailed release scope and QA record are in [ROADMAP-1.0.4.md](ROADMAP-1.0.4.md).

## v1.0.5 roadmap: CLI-first

The next release will focus on making LazyStack's CLI installable and reliable as a standalone npm package, with guided project setup, blueprint validation and planning, prerequisite checks, safer scaffolding, and clean-install CI. Publishing requires an npm account with access to the chosen package name; installing a public package does not require login. See [ROADMAP-1.0.5.md](ROADMAP-1.0.5.md).

The previously deferred service-platform work is now planned for [v1.0.6](ROADMAP-1.0.6.md): gRPC/protobuf, event and broker wiring, service-to-service authentication, observability, and broader starter coverage.

### Future feature ideas

These are proposals, not features included in the current release.

1. Local AI stack assistant that drafts blueprints from natural-language requests.
2. Separate development, staging, and production profiles.
3. Kubernetes manifests and Helm chart export.
4. Terraform and Pulumi infrastructure export.
5. Database backup and restore workflows.
6. Integrations with Vault, 1Password, and cloud secret stores.
7. Deployment workflow generators for cloud and self-hosted platforms.
8. Shareable plugin and template registry.
9. Architecture migration assistant for evolving generated projects.
10. More framework-specific unit, integration, contract, and browser test starters.
11. CPU, memory, and storage sizing estimates.
12. Team review and merge workflows for blueprint changes.
13. Optional OpenTelemetry, Prometheus, Grafana, and log collection (planned for v1.0.5).
14. gRPC/protobuf and event schemas with broker wiring (planned for v1.0.5).
15. Configurable service-to-service authentication (planned for v1.0.5).

## Repository layout

```text
electron/       Electron main process and project scaffolding
src/components/ Desktop interface
src/data/       Framework, database, testing, and architecture catalogs
src/cli/        Blueprint and scaffolding CLI
build/          App icons and packaging resources
release/        Local desktop build artifacts
```

## License

LazyStack is distributed under the MIT License. See [LICENSE](LICENSE).
