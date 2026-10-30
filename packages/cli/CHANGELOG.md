# LazyStack CLI changelog

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
