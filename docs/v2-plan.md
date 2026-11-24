# LazyStack v2 plan

Source: the gap scan of the 1.5.2 catalog (118 frameworks, 32 services) against the 2026 web ecosystem.
Status keys: **2.0** = ships in 2.0.0, **2.x** = planned after 2.0.

## 1. Broken in 1.5.x (2.0)

| Item | Fix |
| --- | --- |
| `minio/minio` was removed from Docker Hub, so MinIO projects fail at `docker compose up` | Object storage moves to a maintained S3-compatible image; existing `minio` blueprints keep working |
| R (Plumber) Dockerfile uses `r-base:4.4-alpine`, a tag that never existed | `rocker/r-ver:4.4` |
| .NET 9 reached end of support on 2026-11-10; templates mixed `net9.0` and `net10.0` | All .NET starters and the installer move to .NET 10 LTS |
| Go 1.23 Docker images (unsupported upstream) | Current Go release images |
| `provectuslabs/kafka-ui` is unmaintained | `kafbat/kafka-ui` (maintained fork) |
| CI built 43 of 118 starters, so image and template rot went unnoticed | Scheduled "build every starter" workflow (section 5) |

## 2. New languages and frameworks

| Language / ecosystem | Additions | Status |
| --- | --- | --- |
| F# (new) | Giraffe | 2.0 |
| Elm (new) | Elm (Browser.element + Vite) | 2.0 |
| Perl (new) | Mojolicious | 2.0 |
| Java | Quarkus, Micronaut, Javalin | 2.0 |
| Go | Templ + HTMX | 2.0 |
| Python | Django Ninja, Plotly Dash, FastHTML | 2.0 |
| PHP | Slim 4, WordPress | 2.0 |
| Ruby | Sinatra | 2.0 |
| Rust | Rocket | 2.0 |
| JS / TS | Alpine.js, React + Tailwind v4 + shadcn/ui, Astro Starlight, Cloudflare Workers (Hono), WXT browser extension | 2.0 |
| .NET | ASP.NET Core Razor Pages | 2.0 |
| Dart | Dart Frog | 2.0 |
| Swift | Hummingbird 2 | 2.0 |
| R | Shiny | 2.0 |
| Python docs | MkDocs Material | 2.0 |
| ClojureScript, ReScript, PureScript, Scala.js, Kotlin Compose Multiplatform | | 2.x |
| Analog, Waku, Ember, Nitro, Encore.ts | | 2.x |
| Quart, Falcon, Connect-Go/gRPC, Huma, Wails, Loco.rs, Salvo, Vaadin, http4s, Avalonia, CodeIgniter, Laravel + Inertia/Livewire, Hanami, Bridgetown, Lustre, IHP | | 2.x |
| Headless CMS / commerce: Payload, Strapi, Directus, Medusa | | 2.x |
| AWS Lambda / SST | | 2.x |

## 3. New services

| Category | Additions | Status |
| --- | --- | --- |
| Auth | Keycloak (OIDC issuer wired into connected apps' env) | 2.0 |
| Developer tools | Mailpit (SMTP + web inbox), LocalStack | 2.0 |
| Observability | Grafana LGTM (OpenTelemetry collector + Grafana, Loki, Tempo, Prometheus); apps get `OTEL_EXPORTER_OTLP_ENDPOINT` | 2.0 |
| Local AI | Ollama | 2.0 |
| Data | TimescaleDB, pgvector, Typesense, Elasticsearch, Dragonfly, DynamoDB Local, SeaweedFS (S3) | 2.0 |
| Workflows | Temporal dev server | 2.0 |
| Zitadel, Authentik, DuckDB, Cassandra, queue wiring (BullMQ, Celery, Sidekiq, Oban) | | 2.x |

## 4. Generator features

| Feature | Status |
| --- | --- |
| `.devcontainer/devcontainer.json` with the toolchains of the selected apps | 2.0 |
| `mise.toml` pinning every toolchain the project needs (`mise install` sets up a machine without root) | 2.0 |
| Deploy targets: real SSH + Compose deploy job, `fly.toml` per service, Render blueprint, `.gitlab-ci.yml` | 2.0 |
| `lefthook.yml`, `.editorconfig`, `renovate.json` | 2.0 |
| Per-app ORM choice (Drizzle, SQLAlchemy + Alembic, GORM/sqlc, SQLx, EF Core) | 2.x |
| Per-app UI kit choice (Tailwind/shadcn shipped as its own starter in 2.0) | 2.x |
| gRPC/protobuf (buf), GraphQL codegen, AsyncAPI for event-driven layouts | 2.x |
| Environment profiles, secrets (Vault/1Password), template registry, AI blueprint drafter, Pulumi export, sizing | 2.x |

## 5. Release engineering and quality

| Item | Status |
| --- | --- |
| Weekly + manual CI: scaffold and `docker build` every non-host-only starter, and check every referenced image exists | 2.0 |
| Tag-triggered release workflow: Linux AppImage, Windows portable EXE, unsigned macOS zip, GitHub release, npm publish with provenance | 2.0 |
| Windows CI job: scaffold, `doctor`, installer and PATH unit tests | 2.0 |
| Unit tests (`npm run test:unit`) for installer helpers and generator invariants | 2.0 |
| In-app "new version available" banner from GitHub Releases | 2.0 |
| Signed macOS builds | 2.x (needs an Apple developer account) |
