# LazyStack roadmap

The roadmap has two parts. **2.x** adds a hosting planner and makes LazyStack useful for the
whole life of a project, not only on day one. **3.0** collects the larger work on starter quality, service wiring and
the template format.

---

# 2.x: LazyStack stays useful after day one

## Shipped in 2.1.0: hosting planner, new logo, `lazystack upgrade`, `lazystack dev` dashboard

Full plan: [docs/roadmap/v2.1.0.md](docs/roadmap/v2.1.0.md).

### New logo and app icon
**Proposal.** A black-and-white mark (two stack chevrons under a 2×2 plan grid) replaces the
current logo in the app header, the desktop app icon and the showcase. No color anywhere.
Reference: [docs/roadmap/v2.1.0-icon.png](docs/roadmap/v2.1.0-icon.png).

### Hosting planner
**Proposal.** Suggest what kind of hosting each app needs (static/CDN, serverless, BaaS, PaaS,
self-hosted PaaS, managed containers, Kubernetes, cloud VM, VPS or bare metal) from its role,
tech and connections, with alternatives, example services and the generated files that apply.
The user can override the choice per app (`app.hosting` in the blueprint). It's shown in a
Blueprint **Hosting** tab, printed by `lazystack hosting`, and written to `docs/hosting.md`.
The default is **local only** (running on your machine, not deployed); the suggestion
is shown as advice for when you deploy. It gives advice only and generates no new deploy files.
**Done when.** `lazystack hosting -c` on the fastapi-react preset shows both apps as local, with
static suggested for the frontend and PaaS for the API, and overrides survive validate → scaffold → import.

## Lifecycle

### `lazystack upgrade` (shipped in 2.1.0): template updates as a three-way merge
**Problem.** Today a project is generated once. When we fix the Blitz Dockerfile or the deploy
workflow, existing projects never get the fix.
**Proposal.** Record the LazyStack version and per-file template hashes in `lazystack.json`.
`lazystack upgrade` regenerates the project with the new version and three-way-merges each file
(old template → new template → the user's file), the way Copier and cruft do. Files the user
never touched update silently; conflicts get standard conflict markers, plus a summary.
**Done when.** Users can pull fixes like the 2.0.1 Dockerfile change into a project generated
with 2.0.0 using one command.

### Environment profiles and secrets
**Proposal.** `dev`, `staging` and `prod` profiles in the blueprint, each with its own `.env`
overlay. Secrets are stored encrypted with SOPS + age (committable), or as 1Password / Vault
references that are resolved at start. The dev orchestrator and the deploy job pick a profile.

### `lazystack dev` as a real dashboard (shipped in 2.1.0)
**Proposal.** Replace interleaved logs with a terminal UI: one pane per service, with health
state, restart and log filtering. Start services in dependency order using healthchecks (the
Compose topology already knows the graph), and show which `.env` variable points where.

### Preview environments
**Proposal.** The generated GitHub workflow deploys each pull request to a throwaway
environment (Fly.io or Render preview, or a namespace on the Kubernetes target) and comments
the URL on the PR. The environment is torn down when the PR closes.

## Suggested order (2.x)

| Release | Focus | Why this order |
| --- | --- | --- |
| **2.1** | Hosting planner, new logo, `lazystack upgrade`, dev dashboard | **Shipped in 2.1.0** |
| **2.2** | Environment profiles and secrets | The deploy and preview work needs per-environment config |
| **2.3** | Preview environments | Builds on profiles and the generated deploy workflow |

---

# 3.0: projects that are known to work, and keep working

2.0 roughly doubled the catalog. Building every starter for 2.0 found **14 broken templates**
(Yew, Leptos, Blitz, Qwik, Inferno, Kotlin/JS, Crystal, Qwik City, Lit, RedwoodJS, Rails,
Symfony, Javalin, and the R image), plus MinIO's image disappearing from Docker Hub. None of
them showed up in normal CI. The catalog grows faster than anyone can check it by hand.

So the theme of 3.0 is **from "generates files" to "generates projects that are
known to work, and keep working"**. The items are grouped by why they matter. Each item has
the problem we actually saw, the proposal, and how we'd know it worked.

## 1. Trust: every starter is proven, continuously

### 1.1 Boot tests, not just build tests
**Problem.** A Docker image that builds can still crash on start. Javalin built fine and returned
`500` on `/health`. Qwik had no `start` script that worked. Rails was missing its gems.
**Proposal.** Extend `scripts/build-starter.sh` to `--run`: start the image, wait for its port,
`GET /health` (most starters already expose it), and fail if it isn't 200 within a timeout.
Static sites get a `GET /` check.
**Done when.** The weekly workflow reports *built* and *answered* per starter, and a new framework
can't merge without passing both.

### 1.2 Stack tests: the generated project, not just each app
**Problem.** Per-app checks miss wiring bugs: hyphenated service names broke Compose variables,
and Keycloak's issuer URL differs inside and outside Docker.
**Proposal.** For every preset and every service, scaffold, `docker compose up --wait`, then run a
probe *from inside an app container* that connects using the generated `.env` (a SQL query, a
Redis `PING`, an OIDC token request to Keycloak, an S3 put/get, an SMTP send to Mailpit).
**Done when.** Each service in the catalog has a connection probe that passes weekly.

### 1.3 Verified versions instead of version strings in TypeScript
**Problem.** Dependency versions are scattered through template strings: `inferno ^8.2.5` named a
version that doesn't exist, `trunk` jumped to a newer Rust, Quarkus 4 was only an RC. Nothing
updates them, and nothing notices when they rot.
**Proposal.** Move every pinned version (npm, PyPI, Maven, crates, NuGet, Docker tags) into
`src/data/versions.json`, read by the templates. Add a Renovate config for *this* repo, with a
regex manager over that file. Renovate opens the bump PR, and the weekly starter build (with
boot tests) decides whether it merges.
**Done when.** Bumping Next.js or Postgres is a one-line PR that CI proves or rejects.

### 1.4 Show verification status in the app
**Proposal.** Have the weekly workflow publish `status.json` (per tech: last green build, boot
result, versions) to GitHub Pages. The framework picker shows a small "verified 3 days ago"
badge, or a warning when a starter's last build failed.
**Done when.** Users can see that a starter is broken before they choose it.

---

---

## 2. Depth: services that are *wired*, not just *configured*

### 2.1 Integration code, not only environment variables
**Problem.** Selecting Keycloak gives an app `OIDC_ISSUER_URL`, but no login code. Grafana LGTM
gives `OTEL_EXPORTER_OTLP_ENDPOINT`, but no instrumentation. Users still do the hardest part.
**Proposal.** Follow the broker-examples pattern (`brokerClients.ts`), one module per
service × ecosystem:
- **Auth:** OIDC login and token verification middleware (Auth.js / `openid-client` for Node,
  Authlib for Python, `coreos/go-oidc`, Spring Security, ASP.NET `AddOpenIdConnect`).
- **Observability:** OpenTelemetry auto-instrumentation (Node `--require`, Python `opentelemetry-instrument`,
  the Java agent, .NET `OpenTelemetry.AutoInstrumentation`). Traces show up in Grafana on first run.
- **Email:** a "send a test mail" endpoint that lands in Mailpit.
- **AWS:** an SDK client preconfigured for LocalStack, with an S3 upload example.

**Done when.** A fresh project with React + FastAPI + Keycloak + LGTM lets you log in and see
the request trace in Grafana without writing code.

### 2.2 Data layer choice per app
**Proposal.** An "ORM / migrations" option per app: Drizzle or Prisma, SQLAlchemy + Alembic,
sqlc or GORM, SQLx, EF Core, Ecto. Each comes with one example model, a migration and a seed
script that runs in the dev orchestrator before the app starts.

### 2.3 Contracts between apps
**Problem.** Apps are connected by URL only. The "typed OpenAPI client" testing tool hints at
more.
**Proposal.** When app A connects to API B, generate a typed client for A from B's OpenAPI (or
protobuf with `buf`, or GraphQL codegen). Then a contract check in CI fails when B changes
incompatibly. For the event-driven layout, an AsyncAPI document for the broker topics.

---

---

## 3. Templates and authoring

### 3.1 Templates as files, community template packs
**Problem.** Starters live in TypeScript template literals. Escaping caused bugs during 2.0 (a
`${'$'}`, a backtick in a comment), and contributors can't open a template in their editor
with syntax highlighting.
**Proposal.** Move each starter to `templates/<techId>/` as real files with a small
placeholder syntax, with `meta.json` for catalog data. The same format becomes the unit of
**template packs** that third parties can publish (`lazystack add-pack github:org/pack`), each
verified by the same build-and-boot checks before it is listed.

### 3.2 Blueprint from a description (AI)
**Proposal.** "A SaaS with a Next.js frontend, a Go API, Postgres, background jobs and email" →
a `ProjectSettings` draft, produced by the Claude API with structured output validated against
the blueprint JSON schema, then shown in the existing Blueprint view for review. Nothing is
generated without the user confirming. A local model through Ollama could be offered as a
private option.

---

## 4. Safety defaults in generated projects

- **Non-root containers.** Most generated Dockerfiles run as root. Add a `USER` per ecosystem,
  and make the boot tests prove the app still starts.
- **Pinned base images by digest**, updated by Renovate, so a re-tag upstream can't silently
  change a build.
- **Supply chain in the generated CI:** an SBOM (Syft), an image scan (Trivy, failing on critical
  CVEs), and `npm audit` / `pip-audit` / `cargo audit` per app.
- **Healthchecks inside app images** (`HEALTHCHECK` lines), so Compose and orchestrators see real
  app health without extra configuration.

---

## 5. Reach

- **Distribution of LazyStack itself:** winget and Scoop manifests, an AUR package and a Flathub
  build, so users can install and update with their package manager. (macOS is still waiting
  for a sponsor's Macbook to sign with.)
- **Signed Windows builds** through Azure Trusted Signing (inexpensive), so SmartScreen stops
  warning on first launch.
- **Catalog additions** carried over from the 2.0 scan: ClojureScript, ReScript, Scala.js,
  Compose Multiplatform, Analog, Waku, Ember, Nitro, Encore.ts, Loco.rs, Vaadin, Laravel +
  Inertia/Livewire, Hanami, Lustre, IHP, and headless CMSs (Payload, Strapi, Directus, Medusa).
  Each one only lands once it passes build *and* boot tests (1.1).

---

## Suggested order (3.x)

| Release | Focus | Why first |
| --- | --- | --- |
| **3.0** | Boot tests (1.1), versions file + Renovate (1.3), non-root and digest pinning (4), templates as files (3.1) | Stops template rot at the source; everything after builds on it |
| **3.1** | Service wiring: OIDC + OpenTelemetry (2.1), stack tests (1.2), verified badges (1.4) | Turns the 2.0 services from configuration into working features |
| **3.2** | ORM choice (2.2), contracts (2.3), template packs (3.1), AI blueprint drafting (3.2) | Opens the catalog to contributors without lowering the bar |

**What to measure:**
- how many generated projects run `lazystack upgrade` successfully;
- the share of starters that build *and* boot each week (target 100%);
- the time from a broken upstream release to a fixed template.
