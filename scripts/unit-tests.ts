/**
 * Unit tests for installer helpers and generator invariants. Fast, no Docker or network.
 * Run with `npm run test:unit` (CI runs it on Linux and Windows).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { __test__ as installer } from '../electron/environment/installer'
import { MONITORED_BINARIES, parseRegQueryPath } from '../electron/environment/auditor'
import { generateDockerCompose } from '../electron/scaffolding/templates/docker'
import { keycloakRealmJson, isDevService, DEV_SERVICE_TYPES } from '../electron/scaffolding/templates/devServices'
import { generateDevcontainer, generateMiseToml, generateProjectTooling } from '../electron/scaffolding/templates/projectTooling'
import { scaffoldProject } from '../electron/scaffolding/generator'
import { getDbServiceName } from '../src/utils/stackTopology'
import { DATABASE_CATALOG } from '../src/data/databases'
import { TECH_CATALOG } from '../src/data/frameworks'
import { STACK_PRESETS } from '../src/data/presets'
import type { CartApp, ProjectSettings, SelectedDatabase } from '../src/types'

const app = (overrides: Partial<CartApp> = {}): CartApp => ({
  id: 'a1', folderName: 'api', role: 'backend', techId: 'ts-express', port: 3000, runMode: 'docker', routePrefix: '/', ...overrides
})

const settingsWith = (apps: CartApp[], databases: SelectedDatabase[] = []): ProjectSettings => ({
  projectName: 'unit-test', parentDir: os.tmpdir(), targetDir: path.join(os.tmpdir(), 'unit-test'),
  proxy: { type: 'none', httpPort: 0 }, databases, apps, useUnifiedWorkspace: false
})

// ---------------------------------------------------------------- installer

test('winget installs are exact and non-interactive', () => {
  assert.equal(
    installer.wingetCommand('winget install GoLang.Go'),
    'winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements --silent'
  )
  // Non-winget recipes on Windows (dart pub, cargo install) are left alone.
  assert.equal(installer.wingetCommand('cargo install --locked trunk'), 'cargo install --locked trunk')
})

test('only system package managers are treated as privileged', () => {
  for (const cmd of ['apt-get install -y nasm', 'dnf install -y go', 'pacman -S --noconfirm go', 'snap install zig --classic']) {
    assert.ok(installer.isSystemCommand(cmd), cmd)
  }
  for (const cmd of ['cargo install trunk', 'curl -fsSL https://bun.sh/install | bash', 'dart pub global activate jaspr_cli', 'npm install -g x']) {
    assert.ok(!installer.isSystemCommand(cmd), cmd)
  }
})

test('shQuote survives single quotes', { skip: process.platform === 'win32' }, () => {
  const value = `it's a "test" $HOME`
  const out = execFileSync('/bin/sh', ['-c', `printf %s ${installer.shQuote(value)}`], { encoding: 'utf8' })
  assert.equal(out, value)
})

test('Linux falls back to a user-level installer when the distro has no package', { skip: process.platform !== 'linux' }, () => {
  const dotnet = MONITORED_BINARIES.find(b => b.id === 'dotnet')!
  const apt = installer.plannedAttempts('apt', dotnet.installCommand!)
  assert.equal(apt.attempts.length, 1)
  assert.match(apt.attempts[0].command, /dotnet-install\.sh .*--channel 10\.0/)
  assert.equal(apt.attempts[0].system, false)

  const java = MONITORED_BINARIES.find(b => b.id === 'java')!
  const javaApt = installer.plannedAttempts('apt', java.installCommand!)
  assert.equal(javaApt.attempts[0].system, true)
})

test('winget recipes never fall back to Linux shell scripts', () => {
  const bun = MONITORED_BINARIES.find(b => b.id === 'bun')!
  const plan = installer.plannedAttempts('winget', { ...bun.installCommand!, windowsWinget: undefined })
  if (process.platform === 'win32') assert.equal(plan.attempts.length, 0)
  else assert.ok(plan.attempts.every(a => !a.command.startsWith('winget')))
})

test('every winget recipe names a package id, not a search term', () => {
  for (const binary of MONITORED_BINARIES) {
    const cmd = binary.installCommand?.windowsWinget
    if (cmd?.startsWith('winget ')) assert.match(cmd, /^winget install [A-Za-z0-9][\w.-]*\.[\w.-]+$/, `${binary.id}: ${cmd}`)
  }
})

test('reg query PATH output is parsed and %VAR% expanded case-insensitively', () => {
  const output = '\r\nHKEY_CURRENT_USER\\Environment\r\n    Path    REG_EXPAND_SZ    %USERPROFILE%\\.cargo\\bin;C:\\Tools;;%Missing%\\x\r\n\r\n'
  assert.deepEqual(parseRegQueryPath(output, { UserProfile: 'C:\\Users\\dev' }), ['C:\\Users\\dev\\.cargo\\bin', 'C:\\Tools', '%Missing%\\x'])
  assert.deepEqual(parseRegQueryPath('ERROR: The system was unable to find the specified registry key', {}), [])
})

// ---------------------------------------------------------------- generator invariants

test('Compose service names and ${VAR} names are interpolation-safe for every service', () => {
  for (const db of DATABASE_CATALOG.filter(item => !item.isCloud && item.defaultPort > 0)) {
    const settings = settingsWith([app({ folderName: 'my-api' })], [{ type: db.id, enabled: true, port: db.defaultPort, assignedAppId: 'a1' }])
    const service = getDbServiceName(settings.databases[0], 0, settings.apps)
    assert.match(service, /^[A-Za-z0-9_]+$/, `${db.id}: service name ${service}`)
    const yaml = generateDockerCompose(settings)
    for (const [, name] of yaml.matchAll(/\$\{([^}:]+)(:-[^}]*)?\}/g)) {
      assert.match(name, /^[A-Z0-9_]+$/, `${db.id}: variable \${${name}}`)
    }
    assert.match(yaml, new RegExp(`\\n  ${service}:\\n    image: `), `${db.id}: compose service with an image`)
    if (isDevService(db.id)) assert.match(yaml, /healthcheck:/, `${db.id}: dev service has a healthcheck`)
  }
})

test('every dev service is in the catalog with a container port the topology knows', () => {
  for (const type of DEV_SERVICE_TYPES) assert.ok(DATABASE_CATALOG.some(db => db.id === type), type)
})

test('Keycloak realm has one public client per app and a dev user', () => {
  const realm = JSON.parse(keycloakRealmJson(settingsWith([app(), app({ id: 'a2', folderName: 'web', role: 'frontend', techId: 'react-vite' })])))
  assert.equal(realm.realm, 'unit-test')
  assert.deepEqual(realm.clients.map((c: { clientId: string }) => c.clientId), ['api', 'web'])
  assert.ok(realm.clients.every((c: { publicClient: boolean }) => c.publicClient))
  assert.equal(realm.users[0].username, 'dev')
})

test('mise.toml and the dev container follow the selected toolchains', () => {
  const settings = settingsWith([app({ techId: 'python-fastapi' }), app({ id: 'a2', folderName: 'web', role: 'frontend', techId: 'react-vite', port: 5173 })])
  const mise = generateMiseToml(settings)!
  assert.match(mise, /^python = "3\.12"$/m)
  assert.match(mise, /^node = "24"$/m)
  const devcontainer = JSON.parse(generateDevcontainer(settings, true))
  assert.ok(devcontainer.features['ghcr.io/devcontainers/features/python:1'])
  assert.ok(devcontainer.features['ghcr.io/devcontainers/features/node:1'])
  assert.deepEqual(devcontainer.forwardPorts, [3000, 5173])
  const tooling = generateProjectTooling(settings)
  assert.ok(tooling['apps/api/fly.toml'] || Object.keys(tooling).some(f => f.endsWith('/fly.toml')), 'fly.toml per Docker app')
})

test('every catalog framework scaffolds in a dry run', async () => {
  for (const tech of TECH_CATALOG) {
    const settings = settingsWith([app({ techId: tech.id, role: tech.role, port: tech.defaultPort || 8080, folderName: 'app', runMode: tech.hostOnly ? 'host' : 'docker' })])
    const result = await scaffoldProject(settings, { dryRun: true })
    assert.ok(result.success, `${tech.id}: ${result.error}`)
  }
})

test('every stack preset scaffolds in a dry run', async () => {
  for (const preset of STACK_PRESETS) {
    const settings: ProjectSettings = { ...settingsWith(preset.apps.map((item, index) => ({ id: `p${index}`, ...item }) as CartApp), preset.databases as SelectedDatabase[]) }
    const result = await scaffoldProject(settings, { dryRun: true })
    assert.ok(result.success, `${preset.id}: ${result.error}`)
  }
})

test('update check compares versions numerically', async () => {
  const { isNewerVersion, isReleaseUrl } = await import('../electron/environment/updates')
  assert.ok(isNewerVersion('v2.0.1', '2.0.0'))
  assert.ok(isNewerVersion('2.10.0', '2.9.9'))
  assert.ok(!isNewerVersion('v2.0.0', '2.0.0'))
  assert.ok(!isNewerVersion('1.9.0', '2.0.0'))
  assert.ok(isReleaseUrl('https://github.com/Ian-nwb/LazyStack/releases/tag/v2.0.0'))
  assert.ok(!isReleaseUrl('https://evil.example/releases'))
})
