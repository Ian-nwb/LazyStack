export type Files = Record<string, string>

export interface NativeContext {
  techId: string
  /** App folder name as chosen by the user (e.g. `billing-api`). */
  name: string
  port: number
  isTS: boolean
  starterProfile: 'minimal' | 'api-service'
  /** snake_case identifier usable for Python/Rust/Elixir modules and crates. */
  snake: string
  /** PascalCase identifier usable for classes, modules and assemblies. */
  pascal: string
  /** Java/Kotlin package, e.g. `com.lazystack.billingapi`. */
  javaPackage: string
  /** Java package as a path, e.g. `com/lazystack/billingapi`. */
  javaPath: string
}

export function createContext(
  techId: string,
  name: string,
  port: number,
  isTS: boolean,
  starterProfile: 'minimal' | 'api-service'
): NativeContext {
  const words = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  let snake = words.join('_').toLowerCase() || 'app'
  if (/^[0-9]/.test(snake)) snake = `app_${snake}`
  let pascal = words.map(word => word[0].toUpperCase() + word.slice(1)).join('') || 'App'
  if (/^[0-9]/.test(pascal)) pascal = `App${pascal}`
  const javaLeaf = snake.replace(/_/g, '')
  return {
    techId,
    name,
    port,
    isTS,
    starterProfile,
    snake,
    pascal,
    javaPackage: `com.lazystack.${javaLeaf}`,
    javaPath: `com/lazystack/${javaLeaf}`
  }
}

export const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'

/** Adds files that the starter does not already define; never overwrites. */
export function mergeMissing(target: Files, additions: Files) {
  for (const [file, content] of Object.entries(additions)) {
    if (!(file in target)) target[file] = content
  }
}

/** Applies a mutation to an existing package.json starter, leaving non-JSON files untouched. */
export function patchPackageJson(files: Files, patch: (pkg: Record<string, any>) => void) {
  if (!files['package.json']) return
  try {
    const pkg = JSON.parse(files['package.json'])
    patch(pkg)
    files['package.json'] = json(pkg)
  } catch {
    // Leave hand-written manifests that are not strict JSON untouched.
  }
}

export const readme = (title: string, intro: string, sections: Array<[string, string]>) =>
  `# ${title}\n\n${intro}\n\n` +
  sections.map(([heading, body]) => `## ${heading}\n\n${body.trim()}\n`).join('\n')

export const shell = (commands: string) => '```bash\n' + commands.trim() + '\n```'

export const GITIGNORE = {
  node: `node_modules/\ndist/\nbuild/\ncoverage/\n.env.local\n.env.*.local\n*.log\n.DS_Store\n`,
  python: `__pycache__/\n*.py[cod]\n.venv/\nvenv/\n.pytest_cache/\n.mypy_cache/\n.ruff_cache/\n*.egg-info/\ndist/\nbuild/\n*.sqlite3\n.env.local\n`,
  rust: `/target\n**/*.rs.bk\n.env.local\n`,
  go: `/bin/\n/tmp/\n*.test\n*.out\ncoverage.*\n.env.local\n`,
  maven: `target/\n.idea/\n*.iml\n.vscode/\n.env.local\n`,
  gradle: `.gradle/\nbuild/\n.kotlin/\n.idea/\n*.iml\n.env.local\n`,
  dotnet: `bin/\nobj/\n*.user\n.vs/\n.env.local\n`,
  php: `/vendor/\n/var/\n.phpunit.result.cache\n.env.local\n`,
  ruby: `/.bundle/\n/log/*\n/tmp/*\n/vendor/bundle/\n.env.local\n`,
  elixir: `/_build/\n/deps/\n/cover/\nerl_crash.dump\n*.ez\n.env.local\n`,
  generic: `.env.local\n*.log\n.DS_Store\n`
}
