# LazyStack

LazyStack is a desktop stack builder and command-line scaffolder for composing application stacks. Choose languages, frameworks, databases, service connections, testing tools, and an architecture layout; LazyStack generates a project structure and supporting configuration.

## Download v1.0.3

Download **Linux AppImage** or **Windows portable EXE** from the [v1.0.3 GitHub release](https://github.com/Ian-nwb/LazyStack/releases/tag/v1.0.3).

| Platform | Package |
| --- | --- |
| Linux x64 | AppImage |
| Windows x64 | Portable EXE |

There is no macOS package for this release.

## Features

- **Mix application roles:** Generate frontend clients, backend services, full-stack apps, workers, and desktop/mobile clients together.
- **Broad technology catalog:** Use established frameworks or start with plain language/runtime templates. Current options include React, Vue, Angular, Solid, Qwik, HTMX, Lit, Kotlin/JS, SwiftUI, Reflex, NiceGUI, Anvil, Python, PHP, Go, Java, Node.js, Kotlin/Ktor, Swift/Vapor, Rust, and many more.
- **Architecture layouts:** Choose a preset or customize root directories, additional folders, and per-app paths.
- **Polyglot layout:** Route browser clients to `frontend/clients/`, API services to `backend/services/`, workers to `backend/workers/`, and deployment files to `deploy/`.
- **Service connections:** Configure API URLs, environment variable names, health checks, and startup dependencies between services.
- **Database configuration:** Add self-hosted databases or managed cloud providers, configure per-service database scope, and generate local credentials in `.env`.
- **Database web UIs:** Optionally attach an admin UI to each database instance: Adminer or pgAdmin for PostgreSQL, Adminer or phpMyAdmin for MySQL/MariaDB, Mongo Express for MongoDB, and Redis Commander for Redis/Valkey.
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
| API and integration | Supertest, Newman, Bruno, REST Assured, Postman collections via Newman |
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

```bash
npm run build:cli
npm run cli -- help
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

The v1.0.3 scripts build Linux AppImage and Windows portable EXE packages; they do not build for macOS.

```bash
npm run dist:linux    # release/1.0.3/LazyStack-1.0.3.AppImage
npm run dist:win      # release/1.0.3/LazyStack 1.0.3.exe
npm run dist:release  # build both targets
```

## Future feature ideas

These are proposals, not features included in the current release.

1. Local AI stack assistant that drafts blueprints from natural-language requests.
2. Separate development, staging, and production profiles.
3. Kubernetes manifests and Helm chart export.
4. Terraform and Pulumi infrastructure export.
5. Interactive service and network topology diagrams.
6. Typed API client generation from OpenAPI documents.
7. Optional OpenTelemetry, Prometheus, Grafana, and log collection.
8. Database backup and restore workflows.
9. Integrations with Vault, 1Password, and cloud secret stores.
10. Deployment workflow generators for cloud and self-hosted platforms.
11. Shareable plugin and template registry.
12. Architecture migration assistant for evolving generated projects.
13. More framework-specific unit, integration, contract, and browser test starters.
14. CPU, memory, and storage sizing estimates.
15. Team review and merge workflows for blueprint changes.

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
