# Architecture layout and diagram rework

Status: in progress · Target: next minor release

## Progress

| Phase | State |
| --- | --- |
| 1. Shared database scope and pure planner | **Done** (verified, see below) |
| 2. Directory layout built from the plan | Not started |
| 3. Presets that describe what they generate | Not started |
| 4. Topology model shared with Compose | Not started |
| 5. Diagram redraw | Not started |
| 6. Consistency checks in CI | Not started |

Phase 1 verification: the five CI presets in both workspace modes (803 files) and a large cart under all 16 architecture presets × both workspace modes × proxy on/off (64 projects, 8,704 files) scaffold byte-identically to the pre-change generator. The one intended exception is `modular-monolith` (the only preset on `hybrid`), whose per-service data stores are now scoped to their service. `npx tsc --noEmit` and `npm run verify:templates` pass.

## Goal

The architecture picker, the Blueprint tree, the Service diagram and the Network topology must show exactly what `scaffoldProject` writes for the current settings. Today each of them is hand-written apart from the generator, and they have drifted from it.

The fix is to derive them from the generator itself. A pure planner produces the file list, and a topology model produces the Compose services. The UI, the README and the diagrams all read from those two. CI checks that they match the generated output.

## Current problems

### Architecture presets and directory layout

| # | Problem | Where |
| --- | --- | --- |
| A1 | Every preset has a `previewTree`, but nothing renders it. Most of them list folders the generator never creates: Microservices `shared/contracts` and `events`, Hexagonal `core/`, `adapters/`, `ports/` per service, Clean Architecture layers per service, Modular Monolith `apps/` host wrappers, Serverless `web/`. | `src/data/structurePresets.ts` |
| A2 | Preset cards show `config.appsDir/`. Nine presets route apps by role through `appDirectories`, so the card names the wrong folder. Polyglot shows `apps/`, but its frontends go to `frontend/clients/`. | `src/components/StructureCustomizer.tsx` |
| A3 | The `hybrid` database isolation mode can be selected, and Modular Monolith uses it, but no code reads it. It behaves like `centralized`. | `StructureCustomizer.tsx`, `structurePresets.ts` |
| A4 | The rule for which databases an app can see is copied in four places. | `electron/scaffolding/generator.ts:179`, `generator.ts:411`, `electron/scaffolding/templates/docker.ts:257`, `relevant()` in `src/components/BlueprintDiagrams.tsx` |
| A5 | Custom mode has no fields for `appDirectories`, so editing "Apps root" does nothing for roles the preset maps. The per-service path placeholder re-implements `getAppRelativePath`. | `StructureCustomizer.tsx` |
| A6 | `presetExtraDirs` is hard-coded in the generator, apart from the presets. The folders are created empty, so git drops them. Mobile's `packages/ui` and `packages/core` ignore `packagesDir`. The Blueprint tree doesn't show these folders. | `generator.ts:239` |
| A7 | The Blueprint tree tab is a hand-written copy of the generator's output. It leaves out `docs/architecture.md` (which the generator does write), the events package, the `prisma-studio-*` scripts and the unified-workspace root files. The README "Project Architecture" tree is another copy. | `src/components/BlueprintInspector.tsx:624-715`, `electron/scaffolding/templates/meta.ts:1366` |

### Service diagram

| # | Problem |
| --- | --- |
| S1 | It only draws app→app and app→DB edges. The gateway and its route prefixes, admin UIs, Swagger UI sidecars, `depends_on` conditions and connection env vars are missing. |
| S2 | Managed cloud databases and SQLite files are drawn the same way as DB containers. |
| S3 | All app→app edges loop through one gutter at x=385, so they overlap once there are more than 3–4 apps. |

### Network topology

| # | Problem |
| --- | --- |
| N1 | It doesn't separate the two traffic paths that `resolveServiceConnectionUrl` produces. Browser and WebView clients call `localhost:<proxy or app port>`. Server-side apps call `<service>:<port>` over Docker DNS, or `host.docker.internal` through `extra_hosts`. |
| N2 | The proxy routes to every app, including host-run apps through `host.docker.internal`. The diagram only draws routes to containers. |
| N3 | Admin UI and Swagger UI containers, the DB host-port to container-port mapping, the real network name (`<compose-name>_lazystack_net`) and which apps use which cloud service are all missing. |

### Related defects to fix along the way

| # | Problem | Where |
| --- | --- | --- |
| D1 | **Fixed in Phase 1.** Cloud env vars were appended to `.env` and `.env.example` with `fs.appendFile`, which skipped `writer.ts`. A dry run in augment mode therefore modified the real `.env` on disk and did not report it, and a dry run in create mode listed `.env` twice. They now go through the plan and the writer's merge. | `generator.ts:357` (removed) |
| D2 | Proxy configs create routes for host-only native apps (for example `rust-gpui`, `swiftui-client`, Tauri) that serve no HTTP. Exclude them when `isHostOnlyTech()` is true and the tech serves no HTTP. Confirm the list per tech before changing it. | `electron/scaffolding/templates/proxies.ts` |

## Decisions

These are the recommended defaults. The plan assumes them unless they are changed before work starts.

1. **Presets only promise root-level structure.** Inside each app the layout stays framework-native. No layer folders such as `ports/` or `usecases/` are generated inside framework projects.
2. **Overlapping presets get a real difference or are merged.** Microservices, Hexagonal and Clean Architecture currently produce nearly the same tree. Each one either gets its own `scaffoldDirs` and defaults, or is merged into another. If any preset ID is removed, keep it as an alias. Map it to its replacement in `normalizeStructureConfig` (task 3.1) so old `lazystack.json` files and imported projects keep working.
3. **No diagram layout dependency.** Use a hand-rolled layered layout. The graphs are small, and `elkjs` would add about 1 MB to the renderer.
4. **The `desktop-mobile` role stays as one role.** Splitting it is out of scope. The custom role-folder table (task 3.4) lets users fix placement by hand.

## Implementation

The phases are ordered so that each can ship as its own PR. Phases 1 and 4 are refactors that should change no generated output, so CI checks them directly.

### Phase 1 — Shared database scope and pure planner

No user-visible change.

**1.1 Database scope helper.** Create `src/utils/databaseScope.ts`:

```ts
export function isDatabaseVisibleToApp(settings: ProjectSettings, app: CartApp, db: SelectedDatabase): boolean
export function getAppDatabases(settings: ProjectSettings, app: CartApp, opts?: { includeCloud?: boolean; includeSqlite?: boolean }): SelectedDatabase[]
```

Rules:
- `centralized`: every enabled database is visible to every app.
- `service-isolated`: visible when `assignedAppId` is the app's ID, `'global'`, or unset. This matches current behaviour.
- `hybrid`: caches and brokers (categories `key-value` and `message-broker`, so `redis`, `valkey`, `rabbitmq`, `kafka`) behave as centralized. Every other category behaves as service-isolated.

Replace the four copies (A4) with calls to this helper.

**1.2 Pure planner.** Create `electron/scaffolding/plan.ts`:

```ts
export interface ScaffoldPlan {
  dirs: string[]                                  // project-relative, POSIX separators
  files: Record<string, { content: string; mode?: number }>
}
export function planScaffold(settings: ProjectSettings, credentials: DatabaseCredentials): ScaffoldPlan
```

- Move steps 2–7 of `scaffoldProject` into it: directories, meta files, Compose, proxy configs, SQLite, cloud SDK files, cloud env vars and each app's files.
- Merge the cloud env vars into the planned `.env` and `.env.example` contents, which fixes D1.
- Use string joins with `/`, not `node:path`. `src/` must be able to import this module, the way `src/data/nativeProjectLayout.ts` already imports `appTemplates`.
- Shell scripts (`.sh`) get `mode: 0o755`.
- Don't move the augment-mode checks. `existingAppDirs` and other filesystem checks stay in `scaffoldProject`, which skips planned paths under protected app folders.

**1.3 Generator as validate → plan → write.** `scaffoldProject` keeps its validation, calls `planScaffold`, then writes the plan in order through `out.ensureDir`, `out.write` and `out.chmod`. `filesCreated` becomes the number of planned files actually written.

**Phase 1 checklist**
- [x] `npx tsc --noEmit` passes.
- [x] `npm run verify:templates` passes.
- [x] For all five CI presets and both workspace modes, the scaffolded tree is byte-identical to the output before the change, except `.env` and `.env.example` for cloud DBs, whose order may change. Compare with `diff -r` on two scaffolds, generating credentials with a fixed seed or excluding them from the diff.
- [x] `--dry-run` for `add` reports the cloud `.env` changes.

### Phase 2 — Directory layout built from the plan

**2.1 Tree helper.** Create `src/utils/planTree.ts`:

```ts
export interface PlanTreeNode { name: string; path: string; kind: 'dir' | 'file'; note?: string; children: PlanTreeNode[] }
export function buildPlanTree(plan: ScaffoldPlan, settings: ProjectSettings, opts?: { collapseAppInternals?: boolean }): PlanTreeNode
```

- Folds paths into a tree. With `collapseAppInternals`, each app folder shows only its top-level entries plus folders in `EXPANDED_DIRS`, matching `nativeProjectLayout.ts`.
- `note` comes from a fixed map of known paths, for example `<infra>/docker-compose.yml` → "Production Compose file" and `<scripts>/dev-orchestrator.mjs` → "Starts host and Docker services". For app folders it is `role · techId · port · runMode`.
- Add `renderPlanTreeText(node): string` for the README and the CLI.

**2.2 Blueprint tree tab.** In `BlueprintInspector.tsx`, replace the hand-written JSX at lines 624–715 with a recursive `<PlanTree>` component fed by `buildPlanTree(planScaffold(settings, placeholderCredentials), settings, { collapseAppInternals: true })`. Memoize on `settings`. Placeholder credentials don't affect any paths.

**2.3 README tree.** In `meta.ts`, the README "Project Architecture" block becomes `renderPlanTreeText(...)`. To avoid a circular dependency, `planScaffold` builds every file except `README.md`, renders the tree from those paths plus `README.md`, then writes the README.

**2.4 CLI.** `lazystack plan --config <file>` prints `renderPlanTreeText` as well as its current output.

**Phase 2 checklist**
- [ ] The tree tab lists the same paths as `scaffold --dry-run` for every preset, after the same app-internal collapsing.
- [ ] The README tree matches the generated folders. Spot-check polyglot, event-driven and mobile-crossplatform.

### Phase 3 — Presets that describe what they generate

**3.1 Preset metadata.** In `src/data/structurePresets.ts`:
- Remove `previewTree`.
- Add `scaffoldDirs: Array<{ path: string; base?: 'root' | 'packages'; purpose: string }>`. Move every `presetExtraDirs` entry here. Entries with `base: 'packages'` resolve under `packagesDir`, which fixes mobile `packages/ui` and `packages/core`. The planner writes `<dir>/README.md` containing `purpose`, so the folder survives git.
- Rewrite `tagline` and `description` to describe only root structure (decision 1).
- Apply decision 2. Either give Microservices, Hexagonal and Clean Architecture their own `scaffoldDirs` and defaults, or merge them and register the old IDs as aliases.
- Add `normalizeStructureConfig(config)`. It maps aliases and fills missing fields. Call it from `resolveStructurePaths` and from `electron/project/importer.ts`.

**3.2 Delete `presetExtraDirs`** from `generator.ts`. The planner reads `scaffoldDirs`.

**3.3 Preset cards and detail panel** in `StructureCustomizer.tsx`:
- Cards show where each role goes, built from `resolveStructurePaths`, for example `frontend → frontend/clients` and `backend → backend/services`, plus the isolation badge.
- When a card is selected, a detail panel renders `buildPlanTree` for the current cart with that preset applied. With an empty cart it uses a sample cart of one frontend, one backend, one worker and one Postgres. This replaces the static preview.

**3.4 Custom mode.**
- Add a role → folder table that edits `appDirectories`. An empty value falls back to `appsDir`.
- Per-service placeholders call `resolveStructurePaths(settingsWithConfig).getAppRelativePath(...)`.
- Validate every role folder with `validateFolderName`, the same way the existing root fields are validated.
- Add the role folders to the folder-name check in `generator.ts:91`.

**3.5 Isolation option text.** Change the `hybrid` option to "Hybrid (per-service data stores, shared caches and brokers)" to match task 1.1.

**Phase 3 checklist**
- [ ] No preset description names a folder the planner doesn't create. Verify with a script that scans the descriptions for path-like tokens and checks each one against the planned dirs.
- [ ] Every `scaffoldDirs` folder exists after scaffolding and is tracked by git once committed.
- [ ] A `lazystack.json` that uses a removed or aliased preset ID still scaffolds and imports.

### Phase 4 — Topology model shared with Compose

No user-visible change.

**4.1 Model.** Create `src/utils/stackTopology.ts`:

```ts
type NodeKind = 'browser' | 'host-app' | 'app-container' | 'db-container' | 'admin-ui' | 'swagger-ui' | 'gateway' | 'sqlite-file' | 'cloud-service'
interface TopologyNode {
  id: string; kind: NodeKind; label: string; techOrType: string
  serviceName?: string           // Compose service name
  containerPort?: number; hostPort?: number
  zone: 'host' | 'docker' | 'external'
  ownerAppId?: string            // service-scoped DBs, sidecars
}
type EdgeKind = 'published-port' | 'proxy-route' | 'service-call' | 'db-connection' | 'host-gateway' | 'depends-on'
interface TopologyEdge {
  from: string; to: string; kind: EdgeKind
  label?: string                 // route prefix, protocol, env var
  url?: string                   // resolved URL (resolveServiceConnectionUrl / DB connection URL)
  condition?: 'service_healthy' | 'service_started'
}
export interface StackTopology { composeName: string; networkName: string; nodes: TopologyNode[]; edges: TopologyEdge[] }
export function buildStackTopology(settings: ProjectSettings): StackTopology
```

The model makes these decisions, which currently happen inside the YAML builders:
- `composeName` (the slug now computed in `docker.ts`) and `networkName` = `${composeName}_lazystack_net`
- which DBs get containers (the current `activeDbs` filter) and which apps get containers (the current `dockerApps` filter)
- each service's host and container ports
- admin UI and Swagger UI port assignment (currently decided inside `generateDockerCompose`)
- `depends_on` and its conditions, using `getAppDatabases` and the connections
- `extra_hosts` (a `host-gateway` edge whenever a container app connects to a host app)
- proxy routes, using the same `routeOf` as `proxies.ts`. Move `routeOf` into `src/utils/serviceConnections.ts` so both import it, and exclude non-HTTP host-only apps (D2).

**4.2 Compose emitter.** `generateDockerCompose` takes the topology and only formats YAML. `generateDockerDevCompose` and `proxies.ts` read services, ports and routes from the same model.

**Phase 4 checklist**
- [ ] `infra/docker-compose.yml` is byte-identical to the output before the change for all five CI presets, plus a cart with every admin UI type and a Swagger app. If D2 is fixed here, proxy configs may differ.
- [ ] The CI `docker compose config` step passes.

### Phase 5 — Diagram redraw

**5.1 Layout helper.** Create `src/components/diagram/layout.ts`. It is a layered layout that takes columns of nodes and returns node rectangles plus edge paths. Each pair of adjacent columns gets its own routing gutter, and parallel edges are spread across it so they don't overlap (S3). Height grows with the tallest column. The SVG export keeps working.

**5.2 Service diagram (logical view).** Rewrite `ServiceDiagram` to read from `buildStackTopology`.
- Columns: clients (`frontend` and `desktop-mobile` roles) → gateway (one row per route prefix) → backends, fullstack apps and workers, sorted by `depends_on` depth → data services.
- Data services are grouped as container, file or managed.
- With service-isolated or hybrid isolation, a scoped DB sits in its owner's lane.
- Edge labels show protocol and env var. The tooltip (`<title>`) shows the resolved URL.
- Admin UI and Swagger sidecars are small boxes attached to their owner.

**5.3 Network topology (physical view).** Rewrite `NetworkTopologyDiagram` with three zones:
- **Host machine:** browser, host-run apps, and a published-ports strip with one badge per host port.
- **Docker bridge network** (labelled with `networkName`): gateway, app containers, DB containers, admin UIs and Swagger UIs, each labelled `serviceName:containerPort` with a host-port badge when the port is published.
- **External:** managed cloud services, each connected to the apps that read its env vars.

Edges:
- browser → published port or gateway
- gateway → container, or gateway → host app through `host.docker.internal` (N2)
- container → container by DNS name
- container → host through `host.docker.internal`
- host app → `localhost:<db host port>`

Add a legend for the edge styles.

**5.4 Exports.**
- `BlueprintMarkdownExport` builds its Markdown from the topology model and adds Mermaid `flowchart` blocks for both views.
- The generator already writes `<docsDir>/architecture.md` with hand-built Mermaid diagrams (the code now lives in `planScaffold`). Rebuild those diagrams from the topology model, so the generated docs, the Blueprint tabs and the Compose file share one source.
- `docs/architecture.md` is not regenerable in augment mode, because users may edit it. This is the current behaviour; keep it.

**Phase 5 checklist**
- [ ] With a large cart (proxy, 6+ apps including a host app and a mobile client, a cloud DB, an admin UI, service-isolated DBs), no labels or edges overlap, at 1280px wide and in the SVG export.
- [ ] Every Compose service appears exactly once in the Network topology, with the same ports.
- [ ] The generated `docs/architecture.md` still renders in GitHub's Mermaid viewer.

### Phase 6 — Consistency checks in CI

Add `scripts/verify-layout.ts` and run it in `.github/workflows/ci.yml` next to `verify:templates`. For each architecture preset × both workspace modes, using a fixed sample cart:

1. The paths in `planScaffold` equal `scaffoldProject({ mode: 'create', dryRun: true }).changes`.
2. Every `scaffoldDirs` entry is in the plan.
3. The topology's container service names and published ports equal the `services:` keys and `ports:` in the generated Compose file. A line-based extraction is enough here, because the emitter's format is fixed.
4. No preset description names a folder outside the plan (the Phase 3 check).

## Files touched

| File | Change |
| --- | --- |
| `src/utils/databaseScope.ts` | new (done): DB visibility rules, including `hybrid` |
| `electron/scaffolding/plan.ts` | new (done): pure planner |
| `electron/scaffolding/generator.ts` | validate → plan → write; remove `presetExtraDirs` and the direct `appendFile` |
| `src/utils/planTree.ts` | new: plan → tree and text |
| `src/utils/stackTopology.ts` | new: topology model |
| `src/utils/serviceConnections.ts` | gains `routeOf` |
| `electron/scaffolding/templates/docker.ts` | emits YAML from the topology |
| `electron/scaffolding/templates/proxies.ts` | routes from the topology; skip non-HTTP host-only apps |
| `electron/scaffolding/templates/meta.ts` | README tree from the plan; `docs/architecture.md` |
| `src/data/structurePresets.ts` | `scaffoldDirs`, new descriptions, aliases, `normalizeStructureConfig`; remove `previewTree` |
| `src/types.ts` | `ArchitecturePreset` aliases, if any are merged |
| `electron/project/importer.ts` | calls `normalizeStructureConfig` |
| `src/components/StructureCustomizer.tsx` | role mapping on cards, detail panel, role-folder table |
| `src/components/BlueprintInspector.tsx` | tree tab from the plan |
| `src/components/BlueprintDiagrams.tsx` | both diagrams and the exports rewritten |
| `src/components/diagram/layout.ts` | new: layered layout |
| `src/cli/index.ts` | `plan` prints the tree |
| `scripts/verify-layout.ts`, `.github/workflows/ci.yml`, `package.json` | new CI check |
| `CHANGELOG.md`, `docs/framework-layouts.md` | document the behaviour changes (hybrid isolation, `docs/architecture.md`, preset text) |

## Not in scope

- Generating layer folders inside framework projects (decision 1)
- Splitting the `desktop-mobile` role (decision 4)
- Multiple Docker networks or network segmentation per service
- Kubernetes and Terraform topology views
