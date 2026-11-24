# Changelog

All notable changes to LazyStack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-24

LazyStack 2.0 adds 24 frameworks, 13 developer services, reproducible toolchains and real deploy targets, and fixes images that had stopped working. The full scope, including what follows in 2.x, is in [docs/v2-plan.md](docs/v2-plan.md).

### Fixed
- **MinIO projects failed at `docker compose up`**: `minio/minio` was removed from Docker Hub. MinIO now uses the maintained Chainguard build (`cgr.dev/chainguard/minio`, same API and variables) with a healthcheck that needs only bash. SeaweedFS is available as an Apache-2.0 alternative.
- **R (Plumber) Docker image never built**: `r-base:4.4-alpine` doesn't exist. It now uses `rocker/r-ver:4.4` with libsodium, and the build fails if plumber doesn't install (the old image would have started and crashed).
- **.NET 9 reached end of support on 2026-11-10**: ASP.NET Core, Blazor and MAUI starters, their Docker images and the installer use .NET 10 LTS. A project named `app` no longer breaks Blazor (its `App` namespace collided with the `App` component).
- **Yew and Leptos images**: `cargo install trunk` pulled trunk 0.22, which needs rustc 1.96; trunk is pinned to 0.21.14.
- **Compose variables for hyphenated names**: service names like `my-api_postgres` produced `${MY-API_POSTGRES_PORT}`, which Compose reads as a default-value expression. Service names now use only letters, digits and `_`.
- The importer no longer mistakes the Kafka UI image for a Kafka broker. Go images use Go 1.27; Kafka UI uses the maintained `kafbat/kafka-ui`.

### Added: frameworks (118 to 142)
- **New languages:** F# (Giraffe), Elm (Browser.element + Vite), Perl (Mojolicious).
- **Java:** Quarkus, Micronaut, Javalin. **Go:** templ + HTMX. **Rust:** Rocket. **Swift:** Hummingbird 2. **Dart:** Dart Frog. **R:** Shiny.
- **Python:** Django Ninja, Plotly Dash, FastHTML, MkDocs Material. **PHP:** Slim 4, WordPress (official image, starter theme, `WORDPRESS_DB_*` variables from the project's MySQL/MariaDB). **Ruby:** Sinatra. **.NET:** Razor Pages.
- **JavaScript/TypeScript:** React + Tailwind CSS v4 + shadcn/ui (`components.json` ready for `npx shadcn add`), Alpine.js, Astro Starlight, Cloudflare Workers with Hono (`wrangler dev` runs workerd locally), and WXT browser extensions (Chrome, Edge, Firefox, Safari; host only).
- Every new starter builds in Docker; the Go, Perl, Dart Frog and Workers images run their tests during the build. The importer recognizes all of them, and the Host Auditor checks Perl and cpanm.

### Added: services (32 to 45)
- **Keycloak**: imports a realm named after the project with one public OIDC client per app and a `dev`/`dev` user; apps get `OIDC_ISSUER_URL`, `OIDC_DISCOVERY_URL` and `OIDC_CLIENT_ID`.
- **Mailpit** (SMTP + web inbox on :8025), **LocalStack** and **DynamoDB Local** (AWS, with `AWS_ENDPOINT_URL` and test credentials), **Grafana LGTM** (OpenTelemetry collector, Grafana on :3300, Loki, Tempo, Prometheus; apps get `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME`), **Ollama**, **Typesense**, **Elasticsearch 9**, **SeaweedFS**, **Temporal** (UI on :8233).
- **TimescaleDB** and **pgvector** (Postgres-compatible: same credentials, `DATABASE_URL`, Adminer/pgAdmin) and **Dragonfly** (Redis-compatible: `REDIS_URL`, Redis client examples, Redis Commander).
- Verified: every service reaches healthy under `docker compose up --wait`, Keycloak issues tokens for the dev user, SeaweedFS stores and returns objects.

### Added: generated projects
- `mise.toml` pinning every toolchain the project needs, and `.devcontainer/devcontainer.json` (official features per ecosystem, Docker outside of Docker, mise).
- Deploy targets: the GitHub deploy workflow now deploys over SSH with Docker Compose when the `DEPLOY_HOST` variable is set (it used to print a placeholder), a `fly.toml` in each Docker app, a Render Blueprint (`render.yaml`, with managed Postgres when the stack uses Postgres) and `.gitlab-ci.yml`.
- `.editorconfig`, `lefthook.yml` (each toolchain's built-in formatter, scoped to the app that uses it) and `renovate.json`.

### Added: release engineering
- `lazystack list --json` prints the catalog. `scripts/build-starter.sh <tech>` scaffolds one framework and builds its Dockerfile.
- Weekly workflow `starters.yml` builds every starter and checks that every referenced image still exists (`npm run check:images`), so removed images and dependency drift show up within a week.
- Tag-triggered `release.yml` builds the Linux AppImage, Windows portable EXE and **unsigned macOS zips** (arm64 and x64) on GitHub's runners, publishes the GitHub release from this changelog, and publishes the CLI to npm with provenance.
- Unit tests (`npm run test:unit`) for installer helpers, PATH parsing and generator invariants (every framework and preset scaffolds, every Compose variable is valid), and a Windows CI job that scaffolds, runs `doctor` and reads the registry PATH. CI runs on Node 22.
- The app shows "vX available" in the header when a newer GitHub release exists (no auto-install; it opens the release page).

### Changed
- Node.js 22+ is required to build LazyStack from source (Node 20 reached end of life).
- Windows downloads are named `LazyStack.<version>.exe`; macOS zips `LazyStack-<version>-mac-<arch>.zip`.

### Not verified
- The macOS build, the Windows CI job and the npm trusted-publishing path run for the first time with this release.
- Ollama was only checked for image availability (its image is several GB); its healthcheck uses the bundled `ollama` CLI.

## [1.5.2] - 2026-11-24

### Fixed
- **Auto-install failed on Linux for every apt, dnf and pacman package.** The installer ran `sudo` without a terminal, so it stopped with "a terminal is required to read the password" (or, under `npm run dev`, waited for a password in the dev server's terminal). It now runs as root if it already is, uses passwordless or cached `sudo -n`, otherwise asks for the password with the desktop's `pkexec` prompt. With none of those available it shows the exact command to run in a terminal.
- **Package manager detection depended on `which`**, which some distros (e.g. `archlinux:base`) don't ship, so the result was "unknown". It now looks up `apt-get`, `dnf` and `pacman` on PATH directly.
- **apt installs failed on fresh systems** ("Unable to locate package"): `apt-get update` runs first, with `DEBIAN_FRONTEND=noninteractive`. Pacman syncs its database when none exists yet.
- **Install commands could hang until the timeout** when a tool asked a question. Commands now run with stdin closed and a 15-minute limit; `curl … | sh` installers fail when the download fails instead of reporting success.
- **Package names that don't exist in the distro repos**, found by checking every recipe against Ubuntu 22.04/24.04, Debian 12/13, Fedora 45 and Arch:
  - Docker Compose: `docker-compose-v2`, or `docker-compose` on Debian (was `docker-compose-plugin`); Fedora uses `moby-engine` and `nodejs-npm`.
  - Java falls back from JDK 17 to 21 (Debian 13) or the latest OpenJDK (Fedora 45).
  - .NET installs SDK 9 (the templates target `net9.0`; it was SDK 8), through Microsoft's `dotnet-install.sh` into `~/.dotnet` on apt and dnf systems, and `dotnet-sdk-9.0` on Arch.
  - Dart (apt/dnf), sbt, Gradle (Ubuntu ships Gradle 4.4), Gleam (Fedora), Flutter (Arch), V, Nim and Julia get user-level fallback installers when the package manager can't install them.
  - Arch Rust installs `rust` instead of a bare `rustup` with no toolchain; Fedora gets `swift-lang`, `clojure` and `julia` recipes.
- **Windows: winget waited for its agreement prompt** on machines where it had never run. Installs now use `winget install --id <Id> -e --accept-source-agreements --accept-package-agreements --silent`. A missing winget is reported with a pointer to App Installer instead of a generic error.
- **Windows: wrong or non-existent winget IDs** (checked against the winget-pkgs repository): Elixir is `Elixir.Elixir`, Nim `nim.nim`, Cabal `haskell.cabal`, Swift `Swift.Toolchain`, Julia `Julialang.Julia`, .NET `Microsoft.DotNet.SDK.9`. Maven, Gradle, Composer, GHC, Flutter and V have no winget package, so they now link to their install pages.
- **Windows: adding a directory to PATH could truncate the user's PATH.** `setx PATH "%PATH%;dir"` copied the combined system and user PATH into the user PATH and cut it at 1024 characters. LazyStack now appends only to `HKCU\Environment\Path`, keeping `%VAR%` entries, and notifies running programs.
- **Windows: successful installs were reported as "not found in PATH"** because the running app never saw the PATH that winget installers write to the registry. The auditor now reads the machine and user PATH from the registry, and the hint says to restart LazyStack instead of `source ~/.bashrc`.
- Linux `curl | sh` recipes no longer run on Windows. A tool that installs but fails its version check (e.g. .NET without libicu, Gradle without Java) now reports that error instead of "Successfully installed". A tool with no recipe for your package manager (e.g. Goose on apt) says so and links its install page, instead of suggesting your package manager wasn't detected.

### Not verified
- The Windows changes (winget flags, registry PATH read/write) were not run on Windows. The PowerShell PATH script was parse-checked, and the winget IDs were checked against the winget-pkgs repository. The Linux installer was tested end to end in Ubuntu 24.04, Debian 13, Fedora 45 and Arch containers, as root and as a user without sudo. The `pkexec` prompt was not exercised.

## [1.5.1] - 2026-11-23

### Fixed
- **Host Auditor showed installed tools as missing until "Re-Audit Host" was pressed.** On load, the App Stack and Host Auditor tabs each started an audit, so 104 version checks ran at once on cold caches and fast tools like npm, Go and Cargo missed the 4-second limit. Now concurrent callers share one audit, at most 8 checks run at a time, the default timeout is 10 seconds, and a tool found on PATH whose version check only timed out counts as installed. The first audit on a cold start went from 14 to 31 of 52 found on the release machine, in 7 seconds instead of 22.

## [1.5.0] - 2026-11-23

### Fixed
- **Host auditor said Flutter and Dart were missing when they were installed.** Desktop launches don't read the shell profile, so SDKs added to PATH in `/etc/profile.d` or `~/.zshrc` (such as `/opt/flutter/bin`) were invisible. The auditor now reads the login shell's PATH once and also checks common Flutter/Dart locations (`/opt/flutter`, `~/flutter`, `~/development/flutter`, snap, fvm, `~/.pub-cache/bin`, `/usr/lib/dart`). `flutter --version` can take over 4 seconds, so Flutter now has a 30-second probe timeout. Dart was never audited, so "Dart SDK" always showed as missing on Dart frameworks.
- **Installer ran user-level installers under sudo.** Only `apt-get`, `pacman`, `dnf` and `snap` commands get `sudo` now; `dart pub global activate`, `cargo install`, `npm install -g`, `gem install` and `curl | sh` installers run as the user.

### Added
- **Goose language** ([aardappel/goose](https://aardappel.github.io/goose/)): **Goose (Vanilla)**, a host-only program (`src/main.goose`, `goose run` / `goose build`), and **Goose (HTTP)**, a JSON service (experimental). Goose has no networking module yet, so the HTTP starter carries a small POSIX socket layer in C (`src/http.c`, added to the build by the `src/main.build` sidecar) that `extern fn` binds; routing and responses are Goose. Its Dockerfile downloads the Goose v2026.4 release and builds with gcc.
- **Dart Jaspr**: Flutter-style components rendered on the server and served through Shelf, so it runs with plain `dart run` (`/health` plus server-rendered pages, `jaspr_test` server test, `dart compile exe` Docker image). Verified: `dart analyze` and `dart test` pass, the Docker image builds and `/health` answers.
- **Host auditor covers every toolchain the catalog requires**: added Goose, Jaspr CLI, Serverpod CLI, Dart, G++, CMake, Bash, rustc, Trunk, Dioxus CLI, Ruby, RubyGems, Bundler, Erlang/OTP, Elixir, Gleam, Cabal, Stack, OPAM, Gradle, R, LuaJIT, V, Hugo, Meteor and clasp, with install commands. `lazystack doctor` uses the same PATH lookup and version flags.
- Importer recognizes Jaspr (`pubspec.yaml`) and Goose (`src/main.goose`) projects, and Goose apps get their own goose icon in the framework picker.

### Not verified
- The Goose starters were not compiled on the release machine (running the downloaded Goose binary was not permitted there). `src/http.c` compiles cleanly with `gcc -Wall -Wextra`; the Goose code follows the v2026.4 reference and bundled samples.

## [1.4.0] - 2026-11-12

### Fixed
- **Gleam (Wisp) starter did not build**: dependency ranges resolved to a newer `gleam_stdlib` than the Docker image's compiler, and Wisp 2 / Mist 6 renamed APIs. The starter now targets Wisp 2, Mist 6 and Gleam 1.14 (verified: `gleam test` passes, the Docker image builds and `/health` answers).
- **V (veb) Dockerfile used an image without the V compiler**; it now builds from `thevlang/vlang:alpine` (verified).
- **Blitz starter failed `blitz build`**: removed an invalid `blitz.config.ts`, render the index page on the server (it reads data through an RPC query) and run `prisma generate` with an explicit schema path (verified: build passes).
- **Kafka was unreachable from Docker apps**: the broker only advertised `localhost`. It now has an in-network listener (`<service>:29092`, used by Docker apps and `KAFKA_BROKERS`) and the host listener (`localhost:<port>`). Verified live with kafkajs.

### Added
- **6 databases and services (26 to 32):** Memcached, Eclipse Mosquitto (MQTT), Redpanda (Kafka API), CockroachDB, OpenSearch and InfluxDB 2. Each has a Compose service with a healthcheck, an env variable in app `.env` files (`MEMCACHED_URL`, `MQTT_URL`, `KAFKA_BROKERS`, `DATABASE_URL`, ...), importer detection and port-check coverage (Mosquitto WebSockets 9001, Redpanda admin 9644, CockroachDB console 8180). Memcached is a cache; Mosquitto and Redpanda appear under Messaging & caching.
- **NATS NUI** dashboard admin UI for NATS, and Kafka UI for Redpanda as well as Kafka.
- **Broker examples for Rust and ASP.NET services** (Redis, RabbitMQ, Kafka, NATS), on top of Node, Python and Go. Verified: `cargo check` and `dotnet build` pass.
- **Per-language broker examples**: Node, Python and Go services get a connect/publish/subscribe module for each Redis, Valkey, RabbitMQ, Kafka or NATS they use, and the client library is added to `package.json`, `requirements.txt` or `go.mod`. Other ecosystems still get the connection variable in `.env`.
- **Kafka UI** admin UI option for Kafka.
- **Dev orchestrator waits for brokers**: when a cache or broker is in the stack, `docker compose up` runs with `--wait` so host apps start after their healthchecks pass.
- **CI**: a `new_frameworks_matrix` job scaffolds, builds and tests each of the 1.3.0 frameworks (Node build, Python pytest, or Docker build).

### Changed
- **The desktop UI adapts to screen size**: header, tab bar, section headers, filter tabs and the footer wrap or scroll on narrow windows, paddings shrink, and the app fills the dynamic viewport height.

### Still not included
- Broker examples for JVM services (Spring Boot, Ktor, Play, Ring): they only get the connection variable in `.env`.
- Meteor starter has not been run (the Meteor toolchain is not installed on the release machine).

## [1.3.0] - 2026-11-12

### Added
- **28 frameworks** (87 to 115). JS/TS frontends and fullstack: Quasar (Vite), Svelte + Vite, Preact + Vite, Gatsby, Vike, RedwoodJS, Blitz.js, Meteor (host only), Next.js + tRPC. Node backends: AdonisJS, Koa, Bun (`Bun.serve`). Python: Litestar, Sanic, Starlette, Tornado, Pyramid, Streamlit, Gradio. Static site generators: Hugo, Jekyll, Eleventy, Docusaurus, VitePress. Other languages: Gleam (Wisp), V (veb), Dart Shelf, Serverpod (host only).
- **`static-site` app role.** Static site generators use it; it lands in the frontend folder of every architecture layout unless a layout sets its own. Their Dockerfiles build the site, then serve it with nginx on the app port.
- **Port-conflict check.** Ports must be unique across apps, databases, the fixed extra ports some databases publish (RabbitMQ management 15672, MinIO console 9001, ClickHouse 9000, Neo4j bolt 7687, Qdrant gRPC 6334, NATS monitoring 8222), database admin UIs and the proxy; duplicates block scaffolding and name every owner with a suggested free port. Privileged and commonly OS-owned ports produce warnings. The footer banner shows conflicts live with an **Auto-fix ports** button and a **Check ports** button that probes this machine (IPC `check-ports`, Vite `/api/ports`). New `lazystack ports --config <file>`; `scaffold` runs the machine probe unless `--skip-port-check` is passed.
- **NATS (JetStream)** as a database/service, and a **Messaging & caching** group in the database picker. Redis and Valkey are now the `cache` category. Importer recognizes the `nats` image.

### Changed
- App `.env` files give caches and brokers their own variable (`REDIS_URL`, `RABBITMQ_URL`, `KAFKA_BROKERS`, `NATS_URL`). `DATABASE_URL` now always belongs to the first data store rather than the first service of any kind.
- The importer detects the new frameworks, including Next.js + tRPC before plain Next.js, Quasar before Vue, and Streamlit/Gradio before generic Python.

### Not included
- Per-language broker client snippets, Kafka UI / NATS dashboard admin UIs, and dev-orchestrator wait-for-readiness for brokers from the 1.3.0 plan are not part of this release.

## [1.2.2] - 2026-11-10

### Fixed
- **The desktop app's Directory Contract tab and the "Resulting layout" preview showed "process is not defined"** instead of the project tree (1.2.0 and 1.2.1). The generator chose a dev command from the host OS with Node's `process.platform`, which does not exist in the renderer. The Service diagram, Network topology and generated projects were not affected, and the CLI was not affected.

### Added
- `npm run verify:browser` (run in CI) bundles the Blueprint planner and diagram code for the browser and runs it with no Node globals for every framework, database, proxy and architecture layout.

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
