# Contributing to LazyStack

Thanks for helping. Bug reports, framework requests and pull requests are all welcome.

## Set up

```bash
git clone https://github.com/Ian-nwb/LazyStack.git
cd LazyStack
npm install
npm run dev        # browser UI with the /api middleware; Electron main/preload are built too
```

Node.js 20+ and npm 10+ are required. Docker is only needed to run the projects LazyStack generates.

## How the code is organised

| Path | What lives there |
| --- | --- |
| `electron/scaffolding/generator.ts` | `scaffoldProject()`: the only code path that writes projects |
| `electron/scaffolding/templates/native/` | Framework-native starters, one module per ecosystem |
| `electron/scaffolding/templates/docker.ts` | Dockerfiles and Compose files |
| `electron/scaffolding/templates/meta.ts` | Root files, including the dev orchestrator launch commands |
| `electron/project/importer.ts` | Detects frameworks in existing projects |
| `src/data/` | Catalogs shared by the UI, generator and CLI |
| `src/components/` | Desktop interface (React) |
| `src/cli/` | The `lazystack` CLI, bundled to `packages/cli/` |

The desktop app (over IPC), the CLI and the browser dev server (Vite `/api/*` middleware in `vite.config.ts`) all call the same generator. If you change an IPC handler in `electron/main.ts`, update the matching middleware too.

## Adding or changing a framework

A framework is keyed by its tech id across several tables. Keep them in sync:

1. `src/data/frameworks.ts`: catalog entry, default port, required binaries, and `hostOnly` for desktop or mobile apps.
2. `electron/scaffolding/templates/native/<ecosystem>.ts`: a starter that mirrors the framework's own initializer, with a passing test, `.gitignore` and README.
3. `electron/scaffolding/templates/docker.ts`: a Dockerfile, unless the framework is host-only.
4. `electron/scaffolding/templates/meta.ts`: the dev orchestrator launch command.
5. `src/utils/nativeEnvironment.ts`, `src/utils/techIcons.ts`, `src/data/manualSetup.ts` (if it needs manual steps) and `docs/framework-layouts.md`.
6. `electron/project/importer.ts`: a detection rule so existing projects are recognised.

## Checking your change

There is no unit-test suite; CI scaffolds real projects and builds them. Before opening a pull request, run:

```bash
npx tsc --noEmit
npm run verify:templates     # starter files vs Dockerfiles, start scripts, README/.gitignore
```

Then generate a project with the CLI and build or run the app you touched:

```bash
npm run cli -- scaffold --preset fastapi-react --name demo --out /tmp/out
npm run cli -- add --dir /tmp/out/demo --tech <tech-id> --name app
```

`.github/workflows/ci.yml` shows the exact build and test commands used for each ecosystem.

## Pull requests

- Keep each pull request to one change, and describe how you checked it.
- Add a line to `CHANGELOG.md` under the unreleased version for anything user-visible.
- Don't commit generated output (`dist/`, `release/`, scaffolded projects) or secrets.
