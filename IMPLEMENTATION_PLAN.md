# Implementation Plan: Service Connections, Testing Tools, and Polyglot Layout

## Goals

1. Let users connect services and databases with generated URLs, credentials, health checks, and startup dependencies.
2. Let users choose testing tools per app, with a broad catalog and an extensible “Other” option.
3. Make the Polyglot structure match its preview: frontend apps under `frontend/clients/`, backend apps under `backend/services/`, and other roles handled explicitly.
4. Keep generated settings reviewable in the blueprint preview and preserve compatibility with existing blueprints.

## Current behavior and gaps

- `SelectedDatabase.assignedAppId` already associates a database instance with an app. The database picker can generate multiple instances.
- Docker Compose already emits database health checks and makes apps wait for assigned or global databases with `depends_on: condition: service_healthy`.
- Apps do not have explicit app-to-app dependency or environment-variable mapping settings. Their `.env` files contain a port and database values, but API base URLs are not modeled as connections.
- `CartApp` has no app health-check settings or selected testing tools.
- The Polyglot preset sets one `appsDir` to `backend/services`. The generator uses that same root for every app role, so a frontend app ends up at `backend/services/frontend`. The preview and preset description promise a frontend/backend split that the generator cannot currently represent.

## Phase 1 — Correct the Polyglot directory model

### Data model

- Extend `FolderStructureConfig` with role-specific application roots, for example `appDirs: { frontend, backend, fullstack, worker, other }`, or a more general `roleDirectories` map.
- Keep `appsDir` as the default for old blueprints and roles without an explicit mapping.
- Define path resolution precedence clearly: per-app `customAppPaths` first, role-specific path second, legacy `appsDir` last.

### Polyglot preset

- Set frontend root to `frontend/clients` and backend root to `backend/services`.
- Decide explicit defaults for fullstack, worker, desktop/mobile, and other roles (for example `apps/fullstack`, `backend/workers`, `apps/desktop`, `apps/other`). Show these choices in the preset description and tree.
- Update app creation and custom per-service path placeholders to show the resolved path for each app.
- Update all path consumers: scaffold generator, Docker Compose build contexts, dev Compose mounts, proxy upstream configuration, architecture docs, and blueprint tree.
- Clarify the name: “Frontend/Backend Split (Polyglot)” communicates that the structure separates roles; “polyglot” alone means multiple programming languages and can be confusing. Keep the alternate name searchable in the description.

### Acceptance criteria

- A frontend app appears only under `frontend/clients/<app>` and a backend app under `backend/services/<app>`.
- Docker and host-mode paths, proxy routing, and generated docs refer to the same resolved locations.
- Existing blueprints without role roots continue to use `appsDir` and preserve custom path overrides.

## Phase 2 — Model service and database connections

### Blueprint schema

- Add an app connection model to `CartApp` or `ProjectSettings` with source app ID, target app ID, environment variable name, and connection type (HTTP API, gRPC, or other supported protocol).
- Add optional app health-check settings: enable flag, HTTP path or command, port, interval, timeout, retries, and start period. Default health checks off unless the selected template can provide a correct endpoint.
- Keep database assignment as the existing source of truth. Add configurable credential values or generated secret references for username, password, database name, and URL environment variable names; do not put real secret values in the blueprint preview.
- Version blueprint exports if the settings format needs a formal schema version. Imported older exports should receive safe defaults.

### Connection UX

- Add a “Connections” section for each app, with an **Add connection** action.
- Choose a target app and connection type, then configure an environment variable such as `USERS_API_URL`.
- Display the resolved URL preview based on runtime mode:
  - Docker-to-Docker: `http://<compose-service-name>:<container-port>`.
  - Host-to-host: `http://localhost:<host-port>`.
  - Mixed Docker/host mode: show a deliberate host-gateway or host URL and explain it in the preview.
- Show database assignments and derived connection variables beside app-to-app connections so users can review all runtime dependencies in one place.
- Detect missing targets, duplicate environment variable names, invalid ports, and dependency cycles before scaffolding.

### Generated configuration

- Generate app-specific `.env.example` files with variable names and safe example values. Put generated local secrets in `.env`, ensure `.env` is ignored by Git, and never display secret values in previews.
- Generate URLs from Compose service DNS names for container-to-container communication; do not use published host ports for that path.
- Emit explicit Compose app dependencies. Use `service_healthy` only when a target has a health check; otherwise use `service_started`.
- Add app `healthcheck` blocks only when the selected health configuration is complete and appropriate for that image. Keep health-check commands configurable for non-HTTP apps.
- Reuse the same resolved dependency graph in production Compose, development Compose, and the preview.

### Acceptance criteria

- Selecting an API connection emits an environment variable in the consuming service and a matching dependency in Compose.
- Database URLs use the right service name, port, database name, and credentials for both global and app-assigned databases.
- A generated secret does not appear in the blueprint preview or committed example files.
- Invalid or cyclic dependencies are shown before generation with an actionable explanation.

## Phase 3 — Add testing tools as a selectable catalog

### Catalog and compatibility

- Add a testing-tool catalog separate from framework and database catalogs. Each entry should include ID, display name, category, package ecosystem, install package(s), supported languages/frameworks, and generated setup files or commands.
- Include categories, not just the initial examples:
  - JavaScript/TypeScript unit and integration: Jest, Vitest, Mocha, AVA, Node test runner, Supertest, Testing Library.
  - Browser end-to-end: Playwright, Cypress, WebdriverIO, Puppeteer.
  - API/HTTP testing: Newman (Postman CLI), Bruno CLI, REST Assured, Schemathesis, Dredd, Hurl, Karate.
  - Python: pytest, unittest, Hypothesis, HTTPX test client.
  - Go: `go test`, Testify, Ginkgo.
  - Rust: built-in test harness, nextest.
  - JVM: JUnit, TestNG, REST Assured.
  - .NET: xUnit, NUnit, MSTest.
  - PHP: PHPUnit, Pest.
  - Contract, load, and security testing: Pact, k6, Locust, OWASP ZAP baseline.
- Treat the list as curated but extensible. Provide an “Other” custom tool entry with name, install command/package, and optional setup notes rather than implying the list is exhaustive.
- Filter recommendations by selected framework/language but allow compatible overrides. Avoid silently selecting multiple tools that conflict (for example Jest and Vitest in the same JS app).

### UX and generation

- Add a per-app “Testing” panel with recommended tools, category filters, search, multi-select where compatible, and “Other”. Include a short compatibility note for each recommendation.
- Generate only files supported by that tool: package scripts/dependencies, Playwright/Cypress config, sample smoke/unit test, and CI steps where requested.
- Add generated tests to each app or a shared `tests/` directory according to an explicit setting; do not mix browser E2E tests into unit-test paths by default.
- Add a project-level test summary and root commands such as `test`, `test:e2e`, and `test:api` only when corresponding tools are selected.
- Keep test generation opt-in so the basic scaffold stays small.

### Acceptance criteria

- A user can search for and select Playwright, Jest/Vitest, Supertest, Newman, and tools from other ecosystems.
- “Other” works for unlisted tools without requiring a LazyStack release to recognize that tool.
- Generated scripts reference installed tools and valid config paths; selecting no tool adds no testing dependencies.
- The blueprint preview shows the per-app test plan and generated commands.

## Phase 4 — Blueprint, preview, and migration

- Update blueprint export/import for role roots, app connections, health checks, credentials references, and testing-tool selections.
- Keep previews derived from the same normalized settings used by the generator to avoid mismatches between tree, Compose, environment files, and output paths.
- Add schema validation for imported JSON and explain unknown testing-tool IDs or app references without discarding unrelated settings.
- Add sample blueprints covering a frontend + API + PostgreSQL stack, a multi-service API graph, and a polyglot Go backend with a React frontend.

## Phase 5 — Verification and release

- Unit-check path resolution for each app role, legacy blueprints, and custom path overrides.
- Check Compose generation for DB-only dependencies, app-to-app dependencies, healthy targets, targets without health checks, mixed run modes, and cycles.
- Check environment generation for correct Docker/host URLs and secret redaction.
- Check each testing-tool selection produces the expected package changes, test files, and commands; check custom “Other” values are escaped and validated.
- Generate representative projects for the acceptance blueprints and inspect their directory tree, `.env.example`, Compose configuration, and README instructions.
- Document the Polyglot path behavior and the meaning of service connections in the user guide.

## Recommended delivery order

1. Fix Polyglot role-based paths and make the blueprint tree match generated output.
2. Add validated app-to-app connections and generated URLs; reuse current database assignment and health-check behavior.
3. Add configurable app health checks and explicit service dependency conditions.
4. Add the extensible testing-tool catalog and per-app selection UI.
5. Add rich setup generation, import/export migration, and examples.

This order first removes the confusing current layout, then builds runtime connections on top of a sound per-app path model, and adds testing integrations once the project/app metadata is stable.
