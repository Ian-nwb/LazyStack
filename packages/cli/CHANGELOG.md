# LazyStack CLI changelog

## 3.0.0

- 28 new frameworks (170 total): Strapi, Payload, Directus, Laravel + Inertia, Laravel + Livewire, CodeIgniter, CakePHP, Jakarta EE (WildFly), Vaadin, Vert.x, Spring Boot (Kotlin), Android (Jetpack Compose), Compose Multiplatform desktop, Nitro, hapi, Feathers, Ember.js, Quart, Falcon, aiohttp, Bottle, Beego, Iris, Loco, Warp, Salvo, Hanami and Roda. `import` recognizes them.
- Real JavaScript variants for Express, Fastify, Hono, Elysia, Deno, Next.js, Nuxt, Remix, Qwik City, Nitro, hapi and Feathers.
- Fixes: JavaScript-flavor React, MUI, Solid and Inferno starters no longer contain TypeScript-only syntax; `dev` starts JavaFX, Swing, Kotlin/JS, SwiftUI, AssemblyScript, Apps Script and SQL migration apps with their own commands.

## 2.1.0

- `lazystack dev` shows a dashboard (service health, filterable logs, restart, environment wiring) and starts apps in dependency order once their dependencies are healthy; `--plain` keeps plain logs. Databases start with `docker compose up --wait`, and app containers are no longer started next to the same apps on the host.
- `lazystack upgrade [--dir] [--from <version>] [--dry-run] [--allow-dirty]` pulls template fixes into a generated project with a three-way merge. `lazystack.json` records `$generator`.
- `lazystack hosting -c <blueprint>` suggests what kind of hosting each app needs, with reasons, alternatives and the generated files to use. Apps are `local` until you set `hosting` on them; `--types` compares all types and `--json` prints the plan. `validate` rejects unknown `hosting` values.
- Generated projects include `docs/hosting.md`; `apply` and `add` regenerate it (after a backup) so it follows the blueprint.

## 2.0.1

- Generated Dockerfiles fail when the app build or dependency install fails (Node, Ruby on Rails, Symfony) instead of producing a broken image; Rails images can build native gems and Symfony allows its runtime Composer plugin.

## 2.0.0

- 24 new frameworks (142 total), including F#, Elm and Perl, Quarkus, Micronaut, Javalin, Go templ + HTMX, Django Ninja, React + Tailwind + shadcn/ui, Cloudflare Workers and WXT. `import` recognizes them.
- 13 new services (45 total): Keycloak, Mailpit, LocalStack, DynamoDB Local, Grafana LGTM, Ollama, Typesense, Elasticsearch, SeaweedFS, Temporal, TimescaleDB, pgvector, Dragonfly.
- Generated projects include `mise.toml`, a dev container, Fly.io/Render/GitLab deploy files and a real SSH + Compose deploy job.
- `lazystack list --json` prints the catalog as JSON.
- Fixes: MinIO image (left Docker Hub), R Plumber image, .NET 10, Compose variables for hyphenated names.

## 1.5.2

- `lazystack doctor` on Windows also reads the machine and user PATH from the registry, so tools installed while a shell is open are found.

## 1.5.1

- `lazystack doctor` and the host audit share one audit across concurrent callers, run at most 8 version checks at a time with a 10-second default timeout, and count a tool found on PATH as installed when only its version check timed out.

## 1.5.0

- New frameworks: Goose (Vanilla), Goose (HTTP, experimental) and Dart Jaspr (118 total). `import` recognizes Jaspr and Goose projects.
- `lazystack doctor` reads the login shell's PATH, checks common Flutter/Dart install locations, and covers every toolchain the catalog requires (Goose, Jaspr CLI, Serverpod CLI, Dart, CMake, Ruby, Elixir, Gleam, Gradle, V, Hugo, Meteor and more).

## 1.4.0

- 6 new databases and services (32 total): Memcached, Mosquitto, Redpanda, CockroachDB, OpenSearch and InfluxDB.
- Node, Python, Go, Rust and ASP.NET services get a broker example per cache or broker they use; Kafka is reachable from Docker apps; `docker compose up --wait` runs when a broker is present.
- Fixes for the Gleam, V and Blitz starters.

## 1.3.0

- 28 new frameworks (115 total): Quasar, Svelte, Preact, Gatsby, Vike, RedwoodJS, Blitz, Meteor, Next.js + tRPC, AdonisJS, Koa, Bun, Litestar, Sanic, Starlette, Tornado, Pyramid, Streamlit, Gradio, Hugo, Jekyll, Eleventy, Docusaurus, VitePress, Gleam, V, Dart Shelf and Serverpod. Static site generators use the new `static-site` role.
- New `lazystack ports --config <file>` command: reports duplicate ports (including databases' fixed extra ports and the proxy) and ports already in use on this machine. `scaffold` probes the machine first; pass `--skip-port-check` to skip it.
- `scaffold` stops on duplicate ports across apps, databases, admin UIs and the proxy, and prints warnings for privileged ports.
- NATS (JetStream) database/service; app `.env` files use `REDIS_URL`, `RABBITMQ_URL`, `KAFKA_BROKERS` and `NATS_URL` for caches and brokers.

## 1.2.1

- `lazystack presets` lists five stack presets: `t3-stack`, `fastapi-react`, `modern-mern`, `go-vue` and `rust-axum`. The other seven were removed.
- 15 architecture layouts are offered again (1.2.0 offered 7). Only CLI and Tooling Monorepo is removed; blueprints that name it scaffold unchanged and are treated as custom.

## 1.2.0

- `lazystack plan` prints the real project tree, computed from the files `scaffold` would write.
- Generated `docs/architecture.md` has redrawn service and network diagrams (Mermaid) plus published ports, services and databases.
- Architecture layouts reduced to 7 (monorepo, microservices, modular monolith, Polyglot, event-driven, serverless, custom). Blueprints naming a removed layout still work and are treated as custom.
- `hybrid` database isolation scopes data stores per service and shares caches and brokers.
- Fix: Swagger UI and a database admin UI could be published on the same host port.
- Fix: Compose and app `.env` files could disagree on a database service name when a disabled or cloud database came first.
- Fix: `add --dry-run` no longer modifies `.env` and lists the change.

## 1.1.3

- Generated reverse proxy gateways work: Nginx no longer exits on start, Apache loads `mod_unixd`, Traefik's routes file is valid YAML, and Nginx, Caddy and Traefik strip the route prefix so `/api/health` reaches the API as `/health`.
- Generated Compose files set `name:` from the project name, so two projects no longer replace each other's containers; the gateway starts after the app containers.

## 1.1.2

- Add Capacitor (`capacitor-app`) and .NET MAUI (`csharp-maui`) to the catalog; `import` detects both.
- Expo starter moves to SDK 58 (Expo Router tabs, `eas.json`, jest-expo test) and is now host-only.
- Connections from Expo, Capacitor and Ionic apps use public env prefixes (`EXPO_PUBLIC_`, `VITE_`) and host-reachable URLs.
- `validate` and `scaffold` accept blueprints with cloud databases (Supabase, Firebase, Neon, ...), which have no local port.
- The generated dev orchestrator starts Tauri with `npm run dev` (the starter has no `tauri dev` script).
- Generated root READMEs gain a "Manual setup required" section for frameworks and cloud databases that need steps LazyStack can't do for you.

## 1.1.1

- Add `import`, `add` and `apply` for existing projects (with `--dry-run`). Existing app folders are never modified; regenerated infrastructure is backed up to `.lazystack/backup/`.
- Add Dioxus, Slint, Bevy, JavaFX and Java Swing to the catalog.
- Starters for every framework now follow the framework's own initializer layout, with tests, `.gitignore` and README.
- `scaffold --config` accepts the `lazystack.json` embedded in generated projects.
- Many starter, Dockerfile and Compose fixes; see the repository CHANGELOG for details.

## 1.0.5

First standalone npm package release for the LazyStack command-line scaffolder.

- Package the bundled CLI independently from the Electron desktop application.
- Add interactive and flag-driven `init` for preset-based blueprint creation.
- Add `search` across frameworks, databases, presets, and testing tools, with JSON output.
- Add blueprint `validate` and `plan` commands that do not scaffold files.
- Add `doctor` checks for selected language toolchains and Docker prerequisites.
- Add scaffold dry-run and require `--force` before writing into a non-empty target.
- Retain preset and config-based scaffold, export, list, help, and version commands.
- Require Node.js 20 or newer.
- Add **Google Apps Script** to the scripting category (clasp-based, TypeScript and JavaScript, with `onOpen`, `runSample`, and `doGet` starters).
- Add **AssemblyScript (Wasm)** to the scripting category (strict TypeScript compiled to WebAssembly, `asc` scripts, Node.js Wasm executor, and unit test suite).
- Add **React Native (Expo)** to the mobile-desktop category (Expo Router file-based routing, TypeScript and JavaScript, iOS / Android / Web targets).
- Add **Inferno** to the frontend category (React-compatible Vite starter with TypeScript and JavaScript, class-based counter demo).

Released in tandem with the LazyStack Desktop v1.0.5 application for Linux and Windows.
