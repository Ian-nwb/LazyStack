# Publish LazyStack CLI v1.2.0 to npm

This guide publishes the standalone CLI package in `packages/cli` as `lazystack@1.2.0`. The desktop app (AppImage and Windows portable `.exe`) is released separately on GitHub. Publishing the CLI does not touch that release.

## What is in 1.2.0

- `lazystack plan` prints the real project tree, and the generated `docs/architecture.md` has redrawn service and network diagrams.
- Architecture layouts reduced from 16 to 7 (monorepo, microservices, modular monolith, Polyglot, event-driven, serverless, custom). Blueprints that name a removed layout still scaffold and open as custom.
- `hybrid` database isolation now scopes data stores per service and shares caches and brokers.
- Fixes: Swagger UI and a database admin UI could share a host port; Compose and app `.env` could disagree on a database hostname; `add --dry-run` no longer edits `.env`.

Full notes: [`packages/cli/CHANGELOG.md`](../../packages/cli/CHANGELOG.md) and the root [`CHANGELOG.md`](../../CHANGELOG.md).

## 1. Log in

Run these in a normal terminal. `npm login` needs a keyboard, so it won't work inside a background or non-interactive shell.

```sh
node --version      # must be 20 or newer
npm login           # completes in the browser; approve any 2FA prompt there
npm whoami          # should print your npm username
```

If you'd rather use a token, create a **granular access token** with read and write access to the `lazystack` package on npmjs.com (Access Tokens). Then run:

```sh
npm config set //registry.npmjs.org/:_authToken=<your-token>
npm whoami
```

Never commit the token or paste it into a chat.

## 2. Check the name and your access

```sh
npm view lazystack version     # latest published version (if any)
npm owner ls lazystack         # your username should be listed
```

If `lazystack` belongs to someone else, stop. Switch to a scoped name (for example `@ian-nwb/lazystack`) in `packages/cli/package.json` and in the install commands, and publish with `--access public`.

## 3. Build and review the package

From the repository root, at the `v1.2.0` tag:

```sh
git checkout v1.2.0
npm ci
npx tsc --noEmit
npm run verify:templates
npm run build:cli
npm pack ./packages/cli --dry-run
```

The tarball should contain only `bin/`, `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE` and `package.json`. If the dry run shows the Electron app or repository source, stop.

## 4. Smoke-test the tarball before publishing

```sh
mkdir -p /tmp/lazystack-1.2.0 && cd /tmp/lazystack-1.2.0
npm pack <repo>/packages/cli
npm install --prefix ./smoke ./lazystack-1.2.0.tgz
CLI=./smoke/node_modules/.bin/lazystack

$CLI --version                                  # LazyStack CLI v1.2.0
$CLI search supabase
$CLI search maui                                # csharp-maui
$CLI scaffold --preset fastapi-react --name demo --out ./out
$CLI import --dir ./out/demo
$CLI add --dir ./out/demo --tech java-swing --name desktop --dry-run
grep -n "Manual setup" ./out/demo/README.md   # only present when the stack needs manual steps
head -1 ./out/demo/infra/docker-compose.yml       # name: demo

`import` should report `Source: lazystack.json`. The `add` dry run should list new files under `apps/desktop/` and write nothing.

## 5. Publish

```sh
cd <repo>/packages/cli
npm publish
```

`prepack` rebuilds the CLI bundle automatically. If npm asks for a one-time password, type it into the terminal (or pass `--otp <code>`). Versions can't be reused after publishing, so double-check that `packages/cli/package.json` says `1.2.0`.

## 6. Verify

```sh
npm view lazystack@1.2.0 version
npx lazystack@1.2.0 --version
npm install --global lazystack@latest
lazystack import --help
```

## Troubleshooting

| Error | Fix |
| --- | --- |
| `E401 Unauthorized` | You're not logged in in this terminal. Run `npm login` again or set the token. |
| `E403 ... You do not have permission` | Your account isn't an owner of `lazystack`. Ask the owner to run `npm owner add <you> lazystack`, or use a scoped name. |
| `EOTP` | 2FA is required. Retry with `npm publish --otp <code>`. |
| `cannot publish over the previously published versions` | 1.2.0 is already on npm. Bump the version in `packages/cli/package.json` and `CHANGELOG.md` first. |
