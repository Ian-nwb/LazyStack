# Publish the LazyStack CLI to npm

This guide builds and publishes the standalone CLI package at `packages/cli`. It does not build or publish the Electron desktop application. The desktop application remains v1.0.4; the CLI package version is v1.0.5.

## Release notes

LazyStack CLI v1.0.5 is the first standalone npm package. It adds guided or flag-driven blueprint setup, catalog search with JSON output, blueprint validation and planning, local prerequisite checks, and safer scaffolding with dry-run and explicit overwrite opt-in. It keeps preset and config-based scaffolding, export, catalog listing, help, and version commands. Node.js 20 or newer is required.

The package changelog is in [`packages/cli/CHANGELOG.md`](../../packages/cli/CHANGELOG.md).

## Start here: this device is not logged in

You do not need npm login to build the package. You do need to sign in on this device before publishing. Run the following from the repository root. npm opens its normal browser-based sign-in flow; finish the sign-in and any 2FA prompt there or in the terminal. Do not send your password, token, or one-time code in chat.

```sh
node --version
npm --version
npm login
npm whoami
```

LazyStack CLI requires Node.js 20 or newer. If `npm whoami` prints your npm username, this terminal is authenticated. If you do not have an npm account yet, create one on [npmjs.com](https://www.npmjs.com/signup), enable 2FA for publishing, then run `npm login` here.

## Confirm the package name and publishing access

The package currently declares the unscoped name `lazystack`. After login, check whether it is already published and whether your account has access:

```sh
npm view lazystack version
npm owner ls lazystack
```

The earlier unauthenticated registry lookup returned 404, which does not prove that the name is available or owned by your account. If `lazystack` is owned by someone else or npm rejects publishing access, stop before publishing. Choose a name in your npm user or organization scope, then update `packages/cli/package.json`, install instructions, and CI package naming before rebuilding. Public scoped packages require `npm publish --access public`.

For publishing, npm requires 2FA or an eligible granular access token. For this first release, use interactive 2FA. npm versions cannot be reused after publication, so confirm the name and version before the final command.

## Build and review the package

Run from the repository root:

```sh
npm ci
npm run build:cli
npx tsc --noEmit
npm pack ./packages/cli --dry-run
```

The package `prepack` script builds the CLI bundle. The tarball should contain only the launcher, bundled CLI, package manifest, README, changelog, and license. It should not include the Electron application or repository source tree.

To create a reviewable tarball without publishing:

```sh
mkdir -p /tmp/lazystack-cli-v1.0.5-release
npm pack ./packages/cli --pack-destination /tmp/lazystack-cli-v1.0.5-release
```

Review the generated `lazystack-1.0.5.tgz`. Test it before publishing:

```sh
mkdir -p /tmp/lazystack-cli-smoke
npm install --prefix /tmp/lazystack-cli-smoke /tmp/lazystack-cli-v1.0.5-release/lazystack-1.0.5.tgz
/tmp/lazystack-cli-smoke/node_modules/.bin/lazystack --version
/tmp/lazystack-cli-smoke/node_modules/.bin/lazystack --help
```

The version command should print `LazyStack CLI v1.0.5`.

## Publish the reviewed package

After login, account verification, and tarball review, publish from the package directory:

```sh
cd packages/cli
npm publish
```

The package is unscoped and its manifest declares public access. `npm publish` may prompt for your 2FA code. Enter it directly in the terminal. If you changed to a scoped name such as `@your-username/lazystack`, use `npm publish --access public` and update the install commands below.

## Verify publication and install

```sh
npm view lazystack@1.0.5 version
npx lazystack@1.0.5 --version
npm install --global lazystack@1.0.5
lazystack --help
```

To upgrade later, run `npm install --global lazystack@latest`. Uninstall with `npm uninstall --global lazystack`.

## Build and publish later versions

Before publishing another npm version, update `version` in `packages/cli/package.json` and add release notes to `packages/cli/CHANGELOG.md`. npm versions are immutable, so increment the version for every publication. Repeat the package review, tarball install, authentication, publish, and verification steps above.

The GitHub source push, npm CLI publication, and desktop GitHub release are separate actions. Publishing this CLI does not create or replace the desktop app release.
