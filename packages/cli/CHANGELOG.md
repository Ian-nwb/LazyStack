# LazyStack CLI changelog

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
