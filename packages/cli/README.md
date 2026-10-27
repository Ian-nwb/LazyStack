# LazyStack CLI

Create polyglot projects and monorepos from LazyStack blueprints or presets.

## Install

```sh
npm install --global lazystack
```

Or run a one-off command without a global install:

```sh
npx lazystack --help
```

Requires Node.js 20 or newer. Docker is optional for generating a project and is required only when you start generated container services.

Publishing status: this package manifest targets `lazystack@1.0.5`. Confirm package-name ownership and authenticate with npm before publishing; npm login is not required to install a public package.

## Commands

```sh
lazystack help
lazystack version
lazystack list
lazystack presets
lazystack search postgres
lazystack search playwright --json
lazystack init --preset fastapi-react --name my-api
lazystack validate --config lazystack.json
lazystack plan --config lazystack.json
lazystack doctor --config lazystack.json
lazystack export --preset fastapi-react --name my-api --out lazystack.json
lazystack scaffold --config lazystack.json --out ./generated
lazystack scaffold --preset modern-mern --name my-app --out ./generated
```

`init` creates a blueprint and refuses to replace an existing file. Edit the JSON to customize services, databases, and connections. `validate` checks the blueprint without creating files, `plan` previews its services and layout, and `doctor` checks local runtimes needed by the selected technologies. `doctor` reports available binaries; it does not install them or guarantee application builds.

Use `--native-only` to leave apps with their native language tooling and omit the root JavaScript workspace files. Use `--unified-workspace` to include the optional JavaScript/TypeScript workspace integration.

See the [main project README](https://github.com/Ian-nwb/LazyStack#readme) for supported technologies, options, and generated-project details.
