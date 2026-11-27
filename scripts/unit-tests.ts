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
import type { CartApp, HostingType, ProjectSettings, SelectedDatabase } from '../src/types'
import { planHosting, resolveGeneratedFiles, suggestHosting } from '../src/utils/hostingPlanner'
import { renderHostingMarkdown } from '../src/utils/hostingDoc'
import { upgradeProject } from '../electron/project/upgrade'
import { DEV_ORCHESTRATOR_RUNTIME, renderDevOrchestrator } from '../electron/scaffolding/templates/devOrchestrator'
import { spawn as spawnChild } from 'node:child_process'
import net from 'node:net'
import fsExtra from 'fs-extra'
import { HOSTING_OPTIONS, HOSTING_TYPES, isHostingType } from '../src/data/hosting'

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

// ---------------------------------------------------------------- hosting planner

const techOf = (id: string) => TECH_CATALOG.find(tech => tech.id === id)!
const suggest = (item: CartApp, settings: ProjectSettings = settingsWith([item])) => suggestHosting(item, techOf(item.techId), settings)
const altTypes = (item: CartApp, settings?: ProjectSettings) => suggest(item, settings).alternatives.map(alt => alt.type)

test('hosting: desktop, mobile and on-device apps are not hosted', () => {
  for (const techId of ['tauri-app', 'electron-app', 'react-native-expo', 'capacitor-app', 'wxt-extension']) {
    const result = suggest(app({ techId, role: techOf(techId).role }))
    assert.equal(result.type, null, techId)
    assert.deepEqual(result.alternatives, [], techId)
  }
  // Host-only *server* frameworks are still deployed somewhere.
  assert.equal(suggest(app({ techId: 'meteor', role: 'fullstack', runMode: 'host' })).type, 'paas')
})

test('hosting: static sites and SPA builds go to a CDN', () => {
  assert.equal(suggest(app({ techId: 'hugo', role: 'static-site' })).type, 'static')
  assert.equal(suggest(app({ techId: 'react-vite', role: 'frontend' })).type, 'static')
  assert.deepEqual(altTypes(app({ techId: 'react-vite', role: 'frontend' })), ['paas', 'vps'])
  // A frontend whose only backend is a BaaS also gets the BaaS alternative.
  const web = app({ techId: 'vue-vite', role: 'frontend' })
  assert.deepEqual(altTypes(web, settingsWith([web], [{ type: 'supabase', enabled: true, port: 0 }])), ['baas', 'paas', 'vps'])
})

test('hosting: workers and broker consumers need an always-on process', () => {
  assert.equal(suggest(app({ techId: 'bash-worker', role: 'worker' })).type, 'paas')
  const consumer = app({ techId: 'go-gin', role: 'backend' })
  const result = suggest(consumer, settingsWith([consumer], [{ type: 'kafka', enabled: true, port: 9092 }]))
  assert.equal(result.type, 'paas')
  assert.ok(result.reasons.some(reason => /Kafka/i.test(reason)), result.reasons.join(' '))
  assert.deepEqual(result.alternatives.map(alt => alt.type), ['containers', 'vps', 'cloud-vm'])
})

test('hosting: full-stack apps use serverless when the framework has an adapter', () => {
  const next = app({ techId: 'fullstack-nextjs', role: 'fullstack' })
  assert.equal(suggest(next).type, 'serverless')
  assert.deepEqual(altTypes(next), ['paas', 'containers', 'self-hosted-paas'])
  assert.equal(suggest(app({ techId: 'qwik-city', role: 'frontend' })).type, 'serverless')
  const django = app({ techId: 'python-django', role: 'fullstack' })
  assert.equal(suggest(django).type, 'paas')
  assert.deepEqual(altTypes(django), ['containers', 'self-hosted-paas', 'vps'])
})

test('hosting: an API with a database goes to a PaaS', () => {
  const api = app({ techId: 'python-fastapi', role: 'backend' })
  const settings = settingsWith([api], [{ type: 'postgres', enabled: true, port: 5432 }])
  assert.equal(suggest(api, settings).type, 'paas')
  assert.deepEqual(altTypes(api, settings), ['vps', 'cloud-vm', 'containers'])
  // A cache alone is not a database.
  assert.equal(suggest(api, settingsWith([api], [{ type: 'redis', enabled: true, port: 6379 }])).type, 'containers')
})

test('hosting: other Docker apps go to managed containers, or serverless when the runtime supports it', () => {
  const axum = app({ techId: 'rust-axum', role: 'backend' })
  assert.equal(suggest(axum).type, 'containers')
  assert.deepEqual(altTypes(axum), ['paas', 'kubernetes', 'vps'])
  assert.equal(suggest(app({ techId: 'ts-hono', role: 'backend' })).type, 'serverless')
  assert.equal(suggest(app({ techId: 'cloudflare-workers', role: 'backend' })).type, 'serverless')
})

test('hosting: every catalog tech gets a suggestion with a reason', () => {
  for (const tech of TECH_CATALOG) {
    const result = suggest(app({ techId: tech.id, role: tech.role, runMode: tech.hostOnly ? 'host' : 'docker' }))
    assert.ok(result.reasons.length > 0, tech.id)
    assert.ok(result.type === null || isHostingType(result.type), tech.id)
    for (const alt of result.alternatives) assert.notEqual(alt.type, result.type, `${tech.id} lists its own type as an alternative`)
  }
})

test('hosting: no hosting field means local, and the suggestion is still reported', () => {
  const plan = planHosting(settingsWith([app({ techId: 'react-vite', role: 'frontend', id: 'w', folderName: 'web', port: 5173 }), app({ id: 'd', folderName: 'desk', techId: 'tauri-app', role: 'desktop-mobile', port: 1420, runMode: 'host' })]))
  assert.equal(plan.apps[0].override, undefined)
  assert.equal(plan.apps[0].effective, 'local')
  assert.equal(plan.apps[0].suggestion.type, 'static')
  assert.equal(plan.apps[1].effective, null, 'device apps stay unhosted')
  assert.ok(plan.notes[0].startsWith('Everything is local only'))
})

test('hosting: every type is accepted and the saved choice wins over the suggestion', () => {
  assert.equal(HOSTING_TYPES.length, 11)
  assert.equal(new Set(HOSTING_TYPES).size, 11)
  for (const type of HOSTING_TYPES) {
    const plan = planHosting(settingsWith([app({ techId: 'react-vite', role: 'frontend', hosting: type })]))
    assert.equal(plan.apps[0].effective, type)
    assert.equal(plan.apps[0].suggestion.type, 'static')
    assert.ok(HOSTING_OPTIONS.find(option => option.id === type)!.examples.length > 0, type)
  }
  assert.ok(!isHostingType('mainframe'))
  assert.ok(!isHostingType(undefined))
})

test('hosting: stack notes', () => {
  const single = planHosting(settingsWith([app({ hosting: 'paas' })]))
  assert.equal(single.notes.length, 1, 'only the hyperscaler note for one app and no databases')
  assert.ok(single.notes.at(-1)!.startsWith('Already on AWS/GCP/Azure?'))
  const many = planHosting(settingsWith(['a', 'b', 'c', 'd'].map((id, index) => app({ id, folderName: id, techId: 'go-gin', port: 4000 + index }))))
  assert.ok(many.notes.some(note => note.startsWith('Whole stack on one bill')))
  assert.ok(many.notes.some(note => note.startsWith('Kubernetes fits')))
  assert.ok(many.notes.at(-1)!.startsWith('Already on AWS/GCP/Azure?'))
})

test('hosting: generated-file pointers name files the generator writes', async () => {
  const api = app({ techId: 'python-fastapi', role: 'backend', folderName: 'api', port: 8000 })
  const settings: ProjectSettings = { ...settingsWith([api], [{ type: 'postgres', enabled: true, port: 5432 }]), proxy: { type: 'caddy', httpPort: 8080 } }
  const result = await scaffoldProject(settings, { dryRun: true })
  assert.ok(result.success, result.error)
  const created = result.changes!.created
  const exists = (rel: string) => rel.endsWith('/') ? created.some(file => file.startsWith(rel)) : created.includes(rel)
  for (const type of HOSTING_TYPES) {
    for (const ref of resolveGeneratedFiles(type, settings, api)) {
      if (ref.path) assert.ok(exists(ref.path), `${type}: ${ref.path} is not generated`)
    }
  }
  assert.ok(exists('docs/hosting.md'))
})

test('hosting: validation rejects unknown values', async () => {
  const result = await scaffoldProject(settingsWith([app({ hosting: 'mainframe' as HostingType })]), { dryRun: true })
  assert.equal(result.success, false)
  assert.match(result.error || '', /Unknown hosting/)
})

test('hosting: docs/hosting.md lists every app and type', () => {
  const settings = settingsWith([app({ folderName: 'api', hosting: 'vps' }), app({ id: 'w', folderName: 'web', techId: 'react-vite', role: 'frontend', port: 5173 })])
  const doc = renderHostingMarkdown(settings)
  assert.match(doc, /\| api \| VPS \|/)
  assert.match(doc, /\| web \| Local only \(default\) \| Static \/ CDN \|/)
  for (const option of HOSTING_OPTIONS) assert.ok(doc.includes(`| ${option.label} |`), option.label)
  assert.ok(doc.includes('https://flaviocopes.com/where-to-host/'))
})

// ---------------------------------------------------------------- lazystack upgrade

test('upgrade: three-way merge of template changes into a generated project', async () => {
  const work = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'lazystack-upgrade-test-'))
  try {
    const api = app({ folderName: 'api', techId: 'ts-express', port: 3000 })
    const web = app({ id: 'w', folderName: 'web', techId: 'react-vite', role: 'frontend', port: 5173 })
    const settings: ProjectSettings = { ...settingsWith([api, web]), projectName: 'proj', parentDir: work, targetDir: path.join(work, 'proj') }
    assert.ok((await scaffoldProject(settings)).success)
    const project = path.join(work, 'proj')
    const read = (rel: string) => fsExtra.readFile(path.join(project, rel), 'utf8')
    const apiDocker = 'apps/api/Dockerfile'
    const webDocker = 'apps/web/Dockerfile'
    const readme = 'apps/api/README.md'

    // The "old template" is today's output with an older first line in both Dockerfiles and the README.
    const OLD = '# built by an older template\n'
    const renderBase = async (_version: string, base: ProjectSettings, parentDir: string) => {
      assert.ok((await scaffoldProject({ ...base, parentDir })).success)
      const root = path.join(parentDir, base.projectName)
      for (const rel of [apiDocker, webDocker, readme]) {
        const file = path.join(root, rel)
        await fsExtra.writeFile(file, OLD + await fsExtra.readFile(file, 'utf8'))
      }
      await fsExtra.remove(path.join(root, 'docs/hosting.md'))
      return root
    }
    // The project was generated by that old template; then the user edited it.
    for (const rel of [apiDocker, webDocker, readme]) await fsExtra.writeFile(path.join(project, rel), OLD + await read(rel))
    await fsExtra.remove(path.join(project, 'docs/hosting.md'))
    await fsExtra.appendFile(path.join(project, apiDocker), 'ENV USER_FLAG=1\n')                  // user edit far from the template change
    await fsExtra.writeFile(path.join(project, readme), '# my own first line\n' + (await read(readme)).split('\n').slice(1).join('\n')) // same line as the template change
    await fsExtra.appendFile(path.join(project, '.env'), 'MY_SECRET=keep-me\n')

    const dry = await upgradeProject(project, { from: '0.0.1', dryRun: true, renderBase })
    assert.ok(dry.success, dry.error)
    assert.equal(await read(webDocker).then(text => text.startsWith(OLD)), true, 'dry run writes nothing')

    const result = await upgradeProject(project, { from: '0.0.1', renderBase, allowDirty: true })
    assert.ok(result.success, result.error)
    const action = (rel: string) => result.files.find(file => file.path === rel)?.action
    assert.equal(action(webDocker), 'updated', 'untouched file takes the new template')
    assert.ok(!(await read(webDocker)).startsWith(OLD))
    assert.equal(action(apiDocker), 'merged', 'separate edits merge cleanly')
    assert.ok(!(await read(apiDocker)).startsWith(OLD))
    assert.ok((await read(apiDocker)).includes('ENV USER_FLAG=1'))
    assert.equal(action(readme), 'conflict', 'overlapping edits conflict')
    assert.match(await read(readme), /<<<<<<< yours\n# my own first line\n=======\n/)
    assert.equal(action('docs/hosting.md'), 'created')
    assert.ok((await read('.env')).includes('MY_SECRET=keep-me'), '.env keeps the user\'s keys and secrets')
    assert.equal(JSON.parse(await read('lazystack.json')).$generator, (await import('../package.json')).default.version)
    assert.ok(result.backupDir && await fsExtra.pathExists(path.join(project, result.backupDir, apiDocker)), 'originals are backed up')

    // Recorded version means a second run has nothing to do.
    const again = await upgradeProject(project, { renderBase, allowDirty: true })
    assert.ok(again.success)
    assert.equal(again.files.length, 0)
  } finally {
    await fsExtra.remove(work)
  }
})

test('upgrade: projects without a recorded version need --from', async () => {
  const work = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'lazystack-upgrade-test-'))
  try {
    const settings: ProjectSettings = { ...settingsWith([app()]), projectName: 'old', parentDir: work, targetDir: path.join(work, 'old') }
    assert.ok((await scaffoldProject(settings)).success)
    const file = path.join(work, 'old', 'lazystack.json')
    const { $generator: _ignored, ...legacy } = await fsExtra.readJson(file)
    await fsExtra.writeJson(file, legacy)
    const result = await upgradeProject(path.join(work, 'old'))
    assert.equal(result.success, false)
    assert.match(result.error || '', /--from/)
  } finally {
    await fsExtra.remove(work)
  }
})

// ---------------------------------------------------------------- dev orchestrator

test('dev orchestrator: runtime has no template placeholders and every preset generates valid JavaScript', async () => {
  assert.ok(!DEV_ORCHESTRATOR_RUNTIME.includes('`') && !DEV_ORCHESTRATOR_RUNTIME.includes('${'))
  const work = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'lazystack-orch-'))
  try {
    for (const preset of STACK_PRESETS) {
      const settings: ProjectSettings = { ...settingsWith(preset.apps.map((item, index) => ({ id: `p${index}`, ...item }) as CartApp), preset.databases as SelectedDatabase[]) }
      const result = await scaffoldProject({ ...settings, projectName: preset.id, parentDir: work, targetDir: path.join(work, preset.id) })
      assert.ok(result.success, result.error)
      const file = path.join(work, preset.id, 'scripts/dev-orchestrator.mjs')
      execFileSync(process.execPath, ['--check', file])
      const config = JSON.parse((await fsExtra.readFile(file, 'utf8')).match(/const CONFIG = ([\s\S]*?);\n/)![1])
      // Databases start in Docker; the apps themselves (and the gateway) run on the host.
      for (const app of preset.apps) assert.ok(!config.compose?.services.includes(app.folderName), `${preset.id}: ${app.folderName} must not start in Docker`)
      assert.ok(!config.compose?.services.includes('gateway'))
      for (const name of config.compose?.services || []) assert.ok(!/_net$|_data$/.test(name), `${preset.id}: '${name}' is a network or volume, not a service`)
      if (preset.databases.some(db => db.enabled)) assert.ok(config.compose.services.length > 0, `${preset.id}: databases start in Docker`)
    }
  } finally {
    await fsExtra.remove(work)
  }
})

const freePort = () => new Promise<number>(done => {
  const server = net.createServer().listen(0, () => { const port = (server.address() as net.AddressInfo).port; server.close(() => done(port)) })
})

test('dev orchestrator: apps start in dependency order once their dependencies are healthy', { skip: process.platform === 'win32', timeout: 30000 }, async () => {
  const work = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'lazystack-orch-run-'))
  const [apiPort, webPort] = [await freePort(), await freePort()]
  // The API takes a moment before it answers /health; the web app must wait for it.
  const server = (delay: number) => `setTimeout(() => require('http').createServer((q, s) => { s.statusCode = q.url === '/health' || q.url === '/' ? 200 : 404; s.end('ok') }).listen(Number(process.env.PORT), () => console.log('listening on ' + process.env.PORT)), ${delay})\n`
  for (const [dir, delay] of [['api', 800], ['web', 0]] as const) {
    await fsExtra.outputFile(path.join(work, 'apps', dir, 'server.cjs'), server(delay))
  }
  await fsExtra.outputFile(path.join(work, 'scripts/dev-orchestrator.mjs'), renderDevOrchestrator({
    project: 'orch-test',
    compose: null,
    services: [
      { name: 'web', role: 'frontend', port: webPort, path: 'apps/web', cmd: 'node server.cjs', dependsOn: ['api'], health: { type: 'tcp', port: webPort }, env: [{ key: 'API_URL', target: 'api' }], uses: [] },
      { name: 'api', role: 'backend', port: apiPort, path: 'apps/api', cmd: 'node server.cjs', dependsOn: [], health: { type: 'http', url: `http://localhost:${apiPort}/health` }, env: [], uses: [] }
    ]
  }))
  const child = spawnChild(process.execPath, ['scripts/dev-orchestrator.mjs', '--plain'], { cwd: work, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  try {
    const deadline = Date.now() + 20000
    while (!/\[web\]\S* healthy/.test(output.replace(/\x1b\[[0-9;]*m/g, ''))) {
      if (Date.now() > deadline) assert.fail(`web never became healthy:\n${output}`)
      await new Promise(done => setTimeout(done, 100))
    }
    const plain = output.replace(/\x1b\[[0-9;]*m/g, '')
    assert.ok(plain.indexOf('[web] waiting · for api') >= 0, plain)
    assert.ok(plain.indexOf('[api] healthy') < plain.indexOf('[web] starting'), plain)
  } finally {
    const exited = new Promise(done => child.once('exit', done))
    child.kill('SIGTERM')
    await exited
    await fsExtra.remove(work)
  }
  // Shutdown stops the app processes too, so their ports are free again.
  for (const port of [apiPort, webPort]) {
    await new Promise<void>((done, fail) => { const probe = net.createServer().once('error', fail).listen(port, () => probe.close(() => done())) })
  }
})

// ---------------------------------------------------------------- JavaScript flavor

test('javascript flavor: every emitted .js/.jsx file parses as plain JavaScript', async () => {
  const { transformSync } = await import('esbuild')
  const { getStarterFilesForTech } = await import('../electron/scaffolding/templates/appTemplates')
  const failures: string[] = []
  for (const tech of TECH_CATALOG.filter(item => item.supportsFlavor)) {
    const files = getStarterFilesForTech(tech.id, 'app', tech.defaultPort || 3000, 'javascript') as Record<string, unknown>
    for (const [file, content] of Object.entries(files)) {
      if (!/\.(js|jsx|mjs|cjs)$/.test(file) || typeof content !== 'string') continue
      try {
        // A JS loader rejects TypeScript-only syntax such as `x!`, `as const` or type annotations.
        transformSync(content, { loader: file.endsWith('x') ? 'jsx' : 'js', format: 'esm', logLevel: 'silent' })
      } catch (error) {
        failures.push(`${tech.id} ${file}: ${(error as Error).message.split('\n')[0]}`)
      }
    }
  }
  assert.deepEqual(failures, [])
})

test('javascript flavor: a framework that offers JavaScript writes no TypeScript source for it', async () => {
  const { getStarterFilesForTech } = await import('../electron/scaffolding/templates/appTemplates')
  const offenders: string[] = []
  for (const tech of TECH_CATALOG.filter(item => item.supportsFlavor)) {
    const files = getStarterFilesForTech(tech.id, 'app', tech.defaultPort || 3000, 'javascript') as Record<string, unknown>
    // Tool config files (vite.config.ts, capacitor.config.ts) are fine; app source is not.
    const ts = Object.keys(files).filter(file => /\.tsx?$/.test(file) && !/(\.config\.ts|\.d\.ts)$/.test(file))
    if (ts.length) offenders.push(`${tech.id}: ${ts.join(', ')}`)
  }
  assert.deepEqual(offenders, [], 'drop supportsFlavor for TypeScript-only starters, or give them a JavaScript variant')
})

test('app READMEs: every framework says how to run it locally, and Python ones set up a .venv', async () => {
  const { getStarterFilesForTech } = await import('../electron/scaffolding/templates/appTemplates')
  const { localRunCommand } = await import('../electron/scaffolding/templates/runCommands')
  const generic: string[] = [], silent: string[] = [], noVenv: string[] = []
  for (const tech of TECH_CATALOG) {
    const commands = localRunCommand(tech.id, tech.defaultPort || 3000, 'minimal')
    if (/app-local README/.test(commands)) generic.push(tech.id)
    const files = getStarterFilesForTech(tech.id, 'app', tech.defaultPort || 3000) as Record<string, string>
    const launch = commands.split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).pop()?.replace(/\s+#.*$/, '').trim()
    if (launch && !files['README.md'].includes(launch)) silent.push(tech.id)
    if ('requirements.txt' in files && !/python3? -m venv \.venv/.test(files['README.md'])) noVenv.push(tech.id)
  }
  assert.deepEqual(generic, [], 'give these frameworks a real command in runCommands.ts')
  assert.deepEqual(silent, [], 'these app READMEs never show their launch command')
  assert.deepEqual(noVenv, [], 'these Python READMEs skip the virtualenv')
})

test('dev orchestrator: sets up Python virtualenvs and installs app dependencies before migrations and launches', () => {
  const main = DEV_ORCHESTRATOR_RUNTIME.slice(DEV_ORCHESTRATOR_RUNTIME.indexOf('async function main()'))
  assert.ok(DEV_ORCHESTRATOR_RUNTIME.includes("' -m venv .venv'"), 'runtime creates .venv')
  assert.ok(DEV_ORCHESTRATOR_RUNTIME.includes('-m pip install -r requirements.txt'), 'runtime installs requirements')
  assert.ok(main.indexOf('preparePythonEnvs()') > -1 && main.indexOf('preparePythonEnvs()') < main.indexOf('runMigrations()'), 'venv is ready before Django migrations run')
  assert.ok(main.indexOf('prepareDependencies()') > -1 && main.indexOf('prepareDependencies()') < main.indexOf('runMigrations()'), 'dependencies are installed before Laravel/Prisma migrations run')
  for (const command of ["' install'", "'composer install'", "'bundle install'", "'mix deps.get'", "' pub get'"]) {
    assert.ok(DEV_ORCHESTRATOR_RUNTIME.includes(command), 'runtime installs dependencies with ' + command)
  }
})
