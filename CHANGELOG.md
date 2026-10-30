# Changelog

All notable changes to LazyStack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
