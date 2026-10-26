# LazyStack 1.0.4 QA and implementation plan

This document turns the v1.0.3 QA findings into a release plan. The items below are planned work, not claims about current capabilities. Release v1.0.4 only ships after its generated-project quality gates pass.

## Working-tree progress (unreleased)

Implemented so far: the unified-workspace switch; service and network diagrams in blueprint inspection and generated architecture docs, with SVG and Markdown export; a tested FastAPI API-service profile; generated-app checks for representative Python, Go, Rust, Java, Kotlin, and PHP projects; and an opt-in TypeScript client generated from a connected OpenAPI contract. Build and type checks pass locally, and the FastAPI CRUD tests plus Go and Rust builds have been run locally. The GitHub CI workflow has not yet run.

Still open: verify Java and Kotlin builds in CI; expand generated-project checks and starter coverage across supported frameworks; add gRPC/protobuf and event contracts with broker wiring; implement service-to-service authentication as a blueprint feature; and add an opt-in, end-to-end observability profile. This is ongoing work, not a completed or released 1.0.4.

## QA findings from v1.0.3

- The catalog already contains native-language choices, including FastAPI, Go, Rust, Java/Kotlin, and PHP. The templates for several of these are thin starters, so catalog coverage should not be confused with production-shaped project generation.
- The root generator currently writes JavaScript workspace files and scripts regardless of the selected app languages. Native apps need language-appropriate project files and commands without requiring npm or pnpm to understand them.
- The FastAPI starter is essentially a health/root endpoint. Selecting a framework does not currently define domain models, CRUD behavior, authentication, persistence, migrations, or a useful API contract.
- CI builds and typechecks LazyStack itself, then scaffolds five presets and checks a few generated files and Compose syntax. It does not install dependencies, build, test, or boot the generated application services.
- Service configuration covers URLs, health checks, database connections, and startup dependencies. OpenAPI selection can generate a typed TypeScript client for a connected frontend from an OpenAPI-enabled service; support is currently limited to that consumer/runtime combination. gRPC/protobuf, event contracts, queues, service-to-service authentication, and a complete observability stack are not yet end-to-end blueprint features.
- Blueprint inspection and generated-project architecture documentation now provide separate service dependency and network topology diagrams; inspection supports SVG and Markdown export.

## Release goals

| Priority | Workstream | 1.0.4 result |
| --- | --- | --- |
| P0 | Generated-project CI and QA | CI installs, builds, tests, and boots representative generated projects, rather than only checking that files exist. |
| P0 | Native project generation | Python, Go, Rust, Java, Kotlin, and PHP projects use their own package/build tools, with an optional unified workspace switch. |
| P0 | Useful service starters | Selectable project profiles generate domain, persistence, CRUD, migrations, authentication, and API documentation where supported. |
| P1 | Blueprint diagrams | Blueprint inspection shows a service diagram and a distinct network topology diagram. |
| P1 | Service contracts | OpenAPI can generate typed clients; gRPC/protobuf and event contracts can be defined and generated from the blueprint. |
| P1 | Platform services | Queues, service-to-service authentication, telemetry, metrics, dashboards, and log collection can be selected and wired into generated infrastructure. |

## Implementation phases

### 1. Establish generated-project QA gates

**Work**

- Expand the preset matrix to cover at least one representative project for Python/FastAPI, Go, Rust, Java/Spring Boot, Kotlin, PHP, and a mixed-language frontend/backend stack.
- For each generated service, install its declared dependencies with the language's normal tooling, run its formatter/linter where configured, compile/build it, and execute its tests.
- Build generated Docker images and run a small smoke matrix. Wait for configured health checks, request the health endpoint, and verify configured service dependencies can connect.
- Validate generated configuration independently: Compose, lockfiles/manifests, migration configuration, OpenAPI, protobuf, and event schemas.
- Keep generated-project CI results visible by language and preset; a passing LazyStack TypeScript build alone must not mark generated-project QA as passing.

**Acceptance criteria**

- CI fails with the failing generated project and the exact install/build/test/boot step identified.
- Every v1.0.4 supported native-language example installs, builds, and passes its starter tests from a clean checkout.
- At least one multi-service blueprint boots in CI and passes health checks and a cross-service request.
- Generated projects do not depend on registry state from a previous CI job.

### 2. Add an on/off switch for unified workspace files

**Work**

- Add a project-level **Unified workspace** on/off switch in the blueprint setup.
- **Off:** generate each app with only its native project files and commands. Native-only projects do not receive root `package.json`, npm/pnpm workspace files, or npm scripts.
- **On:** generate root workspace files and orchestration scripts for JavaScript/TypeScript apps and shared JS packages. Keep Python, Go, Rust, JVM, and PHP apps native; root scripts may call their native tools but must not absorb those apps into npm/pnpm workspaces.
- Define the switch in the blueprint schema, presets, desktop UI, CLI, generated README, and CI fixtures so its behavior is consistent.
- Generate native project metadata and commands for each selected language: `pyproject.toml` and a Python environment workflow; `go.mod`; Cargo manifests/workspaces; Maven or Gradle files for Java/Kotlin; and Composer or native PHP files.
- When enabled, make root scripts language-aware. A mixed stack may have a small orchestration entry point, but each app remains independently buildable with its native toolchain.
- Give each template a documented runtime version, install command, build/test command, exposed port, environment contract, and Docker build path.
- Make dependency installation an explicit scaffold option or documented first-run step. Never imply generated apps were built when only files were written.

**Acceptance criteria**

- With the switch off, Python-only, Go-only, Rust-only, JVM-only, and PHP-only blueprints contain no root npm/pnpm workspace files or required npm setup.
- With the switch on, JavaScript/TypeScript apps and JS packages are included in the root workspace; native apps retain their own manifests and build commands.
- Toggling the setting changes only root workspace integration files and scripts; it does not change native app source or native dependency manifests.
- Both settings work through the desktop UI, exported/imported blueprints, and CLI scaffolding.
- Generated Dockerfiles use the app's runtime and its native dependency manifest.

### 3. Add feature-driven, meaningful service starters

**Work**

- Keep a minimal starter profile, and add an API-service profile with explicit blueprint selections for domain entities/fields, persistence, CRUD, authentication, and migrations.
- Generate a small, documented example domain for opted-in features instead of silently inventing a user's business requirements.
- Add database-specific persistence and migration templates for supported language/database pairs; reject or clearly mark unsupported combinations before generation.
- Generate validation, error handling, configuration loading, health endpoints, tests, and API documentation alongside feature code.
- Define feature parity by framework and language in a compatibility table; do not advertise a feature for a template until its generated app builds and its tests pass.

**Acceptance criteria**

- An API-service profile produces at least one example entity with create/read/update/delete routes, persistence, a migration, input validation, and automated tests.
- Authentication is opt-in, includes protected-route tests, and documents its local development credentials or setup.
- OpenAPI describes the generated routes and schemas rather than only a placeholder root endpoint.
- The minimal profile remains small and does not receive unselected dependencies or features.

### 4. Generate service contracts and connections

**Work**

- Make OpenAPI the source contract for HTTP APIs and generate typed clients for selected consumers and supported target languages.
- Add protobuf contract selection, generated gRPC server/client stubs, health/reflection configuration where supported, and Compose dependencies.
- Add event schema definitions and compatibility validation; connect selected producers/consumers to a chosen broker with generated topic/queue names and credentials.
- Add explicit service authentication choices (for example API keys for local development and a documented token-based production pattern). Generate secrets into `.env`, keep them out of source control, and test rejected unauthenticated calls.
- Represent contract ownership, protocol, consumer, and generated output paths in the blueprint so diagrams and CI use the same data.

**Acceptance criteria**

- A changed OpenAPI contract regenerates a client and CI verifies that the consumer compiles against it.
- A sample gRPC blueprint builds both sides and passes a request in the scaffold smoke test.
- Event schema changes are validated in CI, and generated producer/consumer examples share the same schema.
- Service authentication is tested for both allowed and rejected requests; secrets are absent from committed generated files.

### 5. Add service and network diagrams per blueprint

**Service diagram:** show each app/service, role, language/framework, ports, API or RPC connections, database/broker dependencies, and health/startup edges. Label connections with their configured protocol and environment variable.

**Network topology diagram:** separately show Docker networks, service groups/isolation, gateways and proxies, published host ports, internal-only endpoints, data stores, queues, and external cloud dependencies. Make exposure boundaries obvious.

**Work**

- Render both diagrams in blueprint inspection and the generated project documentation.
- Drive the diagrams from the validated blueprint model, not from a second manually maintained representation.
- Support a useful empty state, large blueprint navigation, readable labels, and keyboard-accessible selection. Keep the diagrams distinct because service dependencies and network reachability answer different questions.
- Provide export to SVG and a text/Markdown representation suitable for reviews and CI artifacts.

**Acceptance criteria**

- Every blueprint renders both diagrams and each configured service, database, connection, network, port, and gateway appears in the correct view.
- Editing a blueprint updates both diagrams without stale edges or duplicate services.
- Representative monolith, polyglot, service-isolated, and cloud-backed examples have visual QA at desktop and narrow widths.

### 6. Add opt-in observability infrastructure

**Work**

- Add an observability profile with OpenTelemetry SDK/exporter wiring for supported app templates, a collector, Prometheus metrics scraping, Grafana dashboards, and a selected log collection path.
- Make ports, credentials, retention, resource limits, and exposed-versus-internal services configurable. Keep dashboards and collector endpoints local by default.
- Supply starter dashboards for service health, latency, request/error counts, and resource usage; label unsupported language exporters rather than generating nonfunctional configuration.
- Ensure the observability profile can be enabled independently and has a clear resource-cost summary.

**Acceptance criteria**

- A supported generated service emits a test trace and metrics that are visible in the local observability stack.
- Prometheus targets show healthy status and Grafana provisions the starter dashboard without manual setup.
- Logs can be correlated by service and trace ID for the supported example, and the generated documentation explains how to view them.
- Compose validation, boot, and shutdown succeed with observability both enabled and disabled.

## Release gates and scope control

1. P0 workstreams are required for v1.0.4: generated-project CI, native toolchain isolation, and at least one tested feature-driven API profile.
2. Diagrams, OpenAPI typed clients, and the opt-in observability profile are planned for v1.0.4, gated on their acceptance criteria.
3. gRPC/protobuf, event contracts, queue wiring, and service authentication must each pass their own end-to-end sample before being advertised as supported. If their tests or language coverage are incomplete, ship them in a later release rather than lowering the v1.0.4 gate.
4. No supported-language or feature claim is added to the README/showcase until a CI example proves generation, dependency install, build, test, and applicable runtime behavior.
5. Build Linux and Windows release artifacts from the same tagged commit only after the full generated-project CI matrix passes; preserve the existing no-macOS packaging scope unless that changes separately.

## Deferred backlog

- Expand feature parity to every framework in the catalog after the representative templates meet the quality bar.
- Add more queue/broker providers, schema registries, production identity providers, deployment targets, and language-specific observability dashboards.
- Continue the broader ideas already listed in the README: AI-assisted blueprint authoring, environment profiles, Kubernetes, Terraform/Pulumi, secrets integrations, and architecture migration tools.
