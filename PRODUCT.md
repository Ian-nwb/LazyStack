# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Solo developers starting a side project or prototype who want a working polyglot stack (for example a React client, a FastAPI or Go service, Postgres and Redis) without spending the first day on folders, Dockerfiles, Compose, `.env` and run scripts. They evaluate LazyStack on the showcase page and in the README before downloading.

## Product Purpose

LazyStack is a desktop app (Linux AppImage, Windows portable `.exe`) and a CLI (`npx lazystack`, npm package `lazystack`) that generates a complete project from a stack the user picks: framework-native app folders, Docker Compose with generated credentials, `.env`, a reverse proxy, deployment files, and one command (`lazystack dev`) that starts the whole stack. Success on the showcase is a visitor downloading the desktop app; installing the CLI is the secondary path.

## Positioning

One generator for every ecosystem: 142 frameworks across JS/TS, Python, Go, Rust, JVM, .NET, PHP, Ruby, Elixir, Swift, Dart and more, mixed freely in one project, each app following its own framework's conventions. The project stays maintained after day one: `lazystack upgrade` three-way-merges template fixes into projects already generated, and `lazystack dev` is a dashboard that starts apps in dependency order once their dependencies are healthy.

## Operating Context

- Desktop flow: App Stack (pick frameworks or a preset) → Databases → Proxy → Blueprint (file tree, Compose, Terraform, Kubernetes, CI/CD, ports, diagrams, `.env`, Hosting) → Scaffold Monorepo → Install Packages / Start Stack.
- CLI flow: `init` → edit `lazystack.json` → `validate` / `plan` / `doctor` / `ports` / `hosting` → `scaffold` → `dev` → later `import` / `add` / `apply` / `upgrade`.
- Projects run locally with Docker for databases and the host toolchains for apps.

## Capabilities and Constraints

- Catalog: 142 frameworks, 45 databases and services, 15 architecture layouts, 5 stack presets, 32 testing tools, Nginx/Apache/Caddy/Traefik.
- Version 2.1.0. Releases: GitHub releases (AppImage, portable EXE); CLI on npm. No macOS build (waiting for a signing machine). Windows builds are unsigned.
- Free and open source, MIT license. No pricing, accounts, telemetry or hosted service.
- The showcase is a static page in `showcase/` deployed to Vercel (`lazystack-showcase.vercel.app`).

## Brand Commitments

- Name: LazyStack. Mark: two stack chevrons under a 2×2 plan grid (`build/icon.svg`, `showcase/assets/logo.svg`), black and white only.
- The showcase keeps its monochrome color scheme (#050505 black, white, zinc greys); the user made this binding.
- Voice: plain, factual, developer-to-developer; numbers come from the real catalog.

## Evidence on Hand

- App screenshots: `showcase/assets/screens/` (stack, picker, diagram retaken for 2.1.0; manual-setup and install still show the old header mark).
- Real generated output can be produced on demand with the CLI (file trees, Compose, `docs/hosting.md`, `lazystack dev` dashboard).
- README user guide, CHANGELOG, ROADMAP.
- No testimonials, user counts, download counts, benchmarks or press. Do not invent any.

## Product Principles

1. Show real output, not claims: every promise on the page is backed by a screenshot or generated file.
2. Each app stays native to its framework; LazyStack never hides the project behind its own runtime.
3. Nothing is overwritten silently: previews, dry runs, backups and three-way merges.
4. Local first: everything runs on the developer's machine until they choose hosting.
