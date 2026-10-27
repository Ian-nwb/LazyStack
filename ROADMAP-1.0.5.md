# LazyStack 1.0.5 roadmap: CLI-first release

The v1.0.5 focus is a useful LazyStack CLI that can be installed and used independently of the desktop app. The package is prepared as `lazystack@1.0.5`; publication is pending npm package-name ownership and maintainer authentication. The desktop app remains at v1.0.4 in this work.

## Publishable npm package

- Decide and verify the npm package name and publishing owner before release. Use the unscoped `lazystack` name only if available and controlled by the LazyStack maintainer; otherwise choose a maintainer-owned public scope.
- [x] Build the CLI bundle as part of package preparation and include it, the launcher, required templates, and runtime dependencies in the npm tarball. Never rely on a gitignored local build output or an `npx tsx` source fallback after installation.
- Keep Electron UI dependencies and desktop build assets out of the CLI package where possible.
- [x] Add a package allowlist, repository metadata, Node engine requirements, and a `prepack` build step.
- Validate `npm pack --dry-run`, inspect the tarball contents, then install the tarball in a clean temporary project and run `lazystack --help`, `version`, `list`, `presets`, and scaffold.
- Publish from the maintainer's authorized npm account with 2FA. Never store npm credentials in the repository or paste them into chat. Consider npm trusted publishing from GitHub Actions for future automated releases.

## CLI command set

- [x] `init`: guided blueprint creation with an interactive flow and equivalent noninteractive flags for scripts and CI.
- `presets`, `list`, and `search`: inspect presets, frameworks, databases, testing tools, and compatibility.
- [x] `validate`: validate blueprint structure and key semantic constraints without writing project files; report actionable errors.
- [x] `plan`: preview services, connections, ports, databases, and the configured root layout without scaffolding.
- [x] `scaffold`: generate from a preset or blueprint, with dry-run, explicit overwrite opt-in, and workspace mode selection.
- [x] `doctor`: check selected native tool binaries and Docker when needed; report install guidance without changing the machine.
- Keep existing `export`, `version`, and `help` commands, with stable exit codes and a `--json` mode where output is intended for scripts.

## Reliability and user experience

- Support Windows, macOS, and Linux command shells and filesystem paths, independent of the desktop packaging targets.
- Avoid destructive overwrites by default; show the target path and require an explicit option to replace existing files.
- Give deterministic output and useful errors for malformed blueprints, unsupported feature combinations, missing prerequisites, and filesystem failures.
- Document install, upgrade, uninstall, CI use, examples, command reference, and troubleshooting in the README and npm package page.
- [x] Include a CI job that packs and installs the CLI artifact before invoking its commands.
- [ ] Add Windows and macOS CLI CI coverage and broader blueprint fixture coverage.

## Release acceptance

- `npm pack --dry-run` contains every required runtime file and excludes desktop-only dependencies/assets.
- A clean machine can install the package and run all documented commands without `tsx`, repository files, or undeclared global tools.
- Interactive and noninteractive `init` produce equivalent valid blueprints.
- `validate` and `plan` do not write project files; `scaffold` writes only after validating and confirming any overwrite.
- [x] Linux package smoke checks pass locally; the CI package-smoke job is configured. Desktop release packaging remains Linux and Windows only unless changed separately.
- Confirm package name ownership and npm account access before the one-time v1.0.5 publication. npm authentication is needed to publish, not to install a public package.
