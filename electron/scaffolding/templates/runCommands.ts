import { TECH_CATALOG } from '../../../src/data/frameworks'
import { v2ReadmeRunCommand } from './native/v2'
import { v3ReadmeRunCommand } from './native/v3'

/**
 * The commands that run one app on the host, from its own directory, with nothing pre-installed
 * beyond the toolchain: used by the project README and by every app README's "Run locally" section.
 */
/** Creates and activates the app's virtualenv, then installs its requirements (bash/zsh; Windows notes inline). */
export const PY_VENV = "python3 -m venv .venv            # Windows: py -m venv .venv\nsource .venv/bin/activate        # Windows: .venv\\Scripts\\activate\npip install -r requirements.txt"

/** Frameworks without a dedicated branch below: install, then the same launch command `lazystack dev` uses. */
const LOCAL: Record<string, (port: number) => string> = {
  'assembly-nasm': () => 'make run',
  'haskell-scotty': () => 'cabal update\ncabal run',
  'c-microhttpd': () => 'make run',
  'cpp-drogon': () => 'cmake -B build\ncmake --build build\n./build/drogon_service',
  'zig-http': () => 'zig build run',
  'vanilla-html-css-js': () => 'npm install\nnpm run dev',
  'html-htmx': () => 'npm install\nnpm run dev',
  'vanilla-java': () => 'javac Main.java\njava Main',
  'deno-native': () => 'deno task dev',
  'deno-fresh': () => 'deno task dev',
  'ts-elysia': () => 'bun install\nbun run dev',
  'csharp-aspnet': port => `dotnet run --urls=http://0.0.0.0:${port}`,
  'csharp-blazor': port => `dotnet run --urls=http://0.0.0.0:${port}`,
  'csharp-maui': () => 'dotnet workload install maui     # once\ndotnet build -t:Run -f net10.0-android\n# Windows: -f net10.0-windows10.0.19041.0 · macOS: -f net10.0-maccatalyst',
  'fullstack-laravel': port => `composer install\nphp artisan key:generate\nphp artisan migrate\nphp artisan serve --port=${port}`,
  'php-symfony': port => `composer install\nphp -S 0.0.0.0:${port} -t public`,
  'kotlin-js': () => 'gradle jsBrowserDevelopmentRun --continuous',
  'swiftui-client': () => 'swift build\nopen Package.swift                # opens in Xcode (macOS only)',
  'tauri-app': () => 'npm install\nnpm run dev',
  'dart-flutter': port => `flutter pub get\nflutter run -d web-server --web-port=${port}`,
  'elixir-phoenix': () => 'mix deps.get\nmix phx.server',
  'ruby-rails': port => `bundle install\nbundle exec rails server -p ${port} -b 0.0.0.0`,
  'bash-worker': () => 'bash worker.sh',
  'sql-migrations': () => 'psql "$DATABASE_URL" -f migrations/001_init.sql   # or your migration tool',
  'google-apps-script': () => 'npm install\nnpx clasp login                  # once\nnpm run push',
  'assemblyscript': () => 'npm install\nnpm run asbuild\nnpm start',
  'python-reflex': () => `${PY_VENV}\nreflex run`,
  'python-gradio': () => `${PY_VENV}\npython app.py`,
  'python-anvil': () => '# Anvil apps are built and run in the hosted Anvil editor (https://anvil.works).\n# Follow anvil-app-plan.md to recreate this app there.',
  'swift-vapor': () => 'swift run App serve',
  'scala-play': () => 'sbt run',
  'clojure-ring': () => 'clojure -M:run',
  'ocaml-dream': () => 'opam install . --deps-only\ndune exec ./bin/server.exe',
  'julia-genie': () => "julia --project=. -e 'using Pkg; Pkg.instantiate()'\njulia --project=. app.jl",
  'lua-lapis': () => 'lapis server',
  'r-plumber': port => `Rscript -e 'pr <- plumber::plumb("plumber.R"); pr$run(port=${port}, host="0.0.0.0")'`,
  'erlang-cowboy': () => 'rebar3 shell',
  'nim-happyx': () => 'nimble install -y --depsOnly\nnim c -r main.nim',
  'crystal-kemal': () => 'shards install\ncrystal run src/server.cr'
}

export function localRunCommand(techId: string, port: number, starterProfile?: string): string {
  const v3Run = v3ReadmeRunCommand(techId, port)
  if (v3Run) return v3Run
  const v2Run = v2ReadmeRunCommand(techId, port)
  if (v2Run) return v2Run
  if (techId === 'python-fastapi') return `${PY_VENV}${starterProfile === 'api-service' ? '\nalembic upgrade head' : ''}\nuvicorn main:app --reload --port ${port}`
  if (techId === 'python-django') return `${PY_VENV}\npython manage.py migrate\npython manage.py runserver 0.0.0.0:${port}`
  if (techId === 'python-flask') return `${PY_VENV}\ngunicorn --bind 0.0.0.0:${port} app:app`
  if (techId === 'python-streamlit') return `${PY_VENV}\nstreamlit run app.py --server.port ${port}`
  if (techId === 'hugo') return `hugo server --bind 0.0.0.0 --port ${port}`
  if (techId === 'jekyll') return `bundle install\nbundle exec jekyll serve --host 0.0.0.0 --port ${port}`
  if (techId === 'gleam-wisp') return 'gleam run'
  if (techId === 'v-vweb') return 'v run .'
  if (techId === 'dart-shelf') return 'dart pub get\ndart run bin/server.dart'
  if (techId === 'dart-serverpod') return './setup.sh'
  if (techId === 'dart-jaspr') return 'dart pub get\ndart run bin/main.dart'
  if (techId === 'goose-app') return 'goose src/main.goose'
  if (techId === 'goose-http') return 'goose build -o build/server src/main.goose\n./build/server'
  if (techId === 'bun-native') return 'bun install\nbun run dev'
  if (techId === 'meteor') return `npm install\nmeteor run --port ${port}`
  const local = LOCAL[techId]
  if (local) return local(port)
  if (techId.startsWith('python-')) return `${PY_VENV}\npython main.py`
  if (techId.startsWith('go-')) return 'go mod tidy\ngo run .'
  if (techId === 'rust-dioxus') return `cargo install dioxus-cli\ndx serve --port ${port}`
  if (techId === 'rust-yew' || techId === 'rust-leptos') return `rustup target add wasm32-unknown-unknown\ntrunk serve --port ${port}`
  if (techId === 'java-javafx') return 'mvn javafx:run'
  if (techId === 'java-swing') return 'mvn compile exec:java'
  if (techId.startsWith('rust-')) return 'cargo run'
  if (techId === 'java-springboot') return 'mvn spring-boot:run'
  if (techId === 'java-javafx') return 'mvn javafx:run'
  if (techId === 'java-swing') return 'mvn compile exec:java'
  if (techId === 'kotlin-ktor') return 'gradle run'
  if (techId === 'vanilla-php') return `php -S 0.0.0.0:${port} -t public`
  if (techId === 'vanilla-go') return 'go run .'
  if (techId === 'vanilla-python') return `${PY_VENV}\npython main.py`
  if (techId === 'vanilla-node') return 'npm install\nnpm run dev'
  const language = TECH_CATALOG.find(tech => tech.id === techId)?.language || ''
  if (/^(JS \/ TS|JavaScript|TypeScript|Node\.js)$/.test(language)) return 'npm install\nnpm run dev'
  return 'See the app-local README for framework-specific commands.'
}
