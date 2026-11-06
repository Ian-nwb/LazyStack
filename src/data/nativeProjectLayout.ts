export interface NativeProjectLayout {
  summary: string
  paths: string[]
}

/** Representative paths from the native starter templates for blueprint previews. */
export function getNativeProjectLayout(techId: string): NativeProjectLayout {
  if (techId === 'rust-gpui') return { summary: 'Rust desktop app', paths: ['Cargo.toml', 'src/main.rs'] }
  if (techId === 'rust-yew' || techId === 'rust-leptos') return { summary: 'Rust WebAssembly frontend', paths: ['Cargo.toml', 'Trunk.toml', 'index.html', 'src/main.rs'] }
  if (techId === 'rust-actix' || techId === 'rust-axum' || techId === 'rust-poem') return { summary: 'Rust web service', paths: ['Cargo.toml', 'src/main.rs'] }
  if (techId === 'fullstack-laravel') return { summary: 'Laravel application', paths: ['app/', 'bootstrap/', 'config/', 'database/migrations/', 'public/', 'resources/views/', 'routes/'] }
  if (techId === 'php-symfony') return { summary: 'Symfony application', paths: ['config/', 'public/', 'src/Controller/', 'src/Kernel.php'] }
  if (techId === 'vanilla-php') return { summary: 'Plain PHP service', paths: ['composer.json', 'public/index.php'] }
  if (techId === 'ruby-rails') return { summary: 'Rails application', paths: ['app/controllers/', 'config/', 'config/routes.rb'] }
  if (techId === 'python-django') return { summary: 'Django project', paths: ['manage.py', '<project_package>/', '<project_package>/settings.py', '<project_package>/urls.py'] }
  if (techId === 'python-fastapi' || techId === 'python-flask') return { summary: 'Python web service', paths: ['main.py', 'requirements.txt'] }
  if (techId === 'python-reflex') return { summary: 'Reflex application', paths: ['rxconfig.py', '<app_package>/'] }
  if (techId === 'python-nicegui') return { summary: 'NiceGUI application', paths: ['main.py', 'requirements.txt'] }
  if (techId === 'vanilla-python') return { summary: 'Python standard-library service', paths: ['main.py'] }
  if (techId === 'java-springboot') return { summary: 'Spring Boot application', paths: ['pom.xml', 'src/main/java/', 'src/main/resources/'] }
  if (techId === 'vanilla-java') return { summary: 'JDK HttpServer service', paths: ['Main.java'] }
  if (techId === 'kotlin-ktor') return { summary: 'Ktor application', paths: ['build.gradle.kts', 'src/main/kotlin/'] }
  if (techId === 'kotlin-js') return { summary: 'Kotlin/JS browser app', paths: ['build.gradle.kts', 'src/jsMain/kotlin/'] }
  if (techId === 'swiftui-client') return { summary: 'SwiftUI native client', paths: ['Package.swift', 'Sources/<target>/'] }
  if (techId === 'swift-vapor') return { summary: 'Vapor web service', paths: ['Package.swift', 'Sources/App/'] }
  if (techId === 'csharp-aspnet') return { summary: 'ASP.NET Core application', paths: ['<project>.csproj', 'Program.cs', 'appsettings.json'] }
  if (techId === 'csharp-blazor') return { summary: 'Blazor WebAssembly application', paths: ['<project>.csproj', 'Program.cs', 'App.razor', 'wwwroot/index.html'] }
  if (techId === 'go-goravel') return { summary: 'Goravel-style Go service', paths: ['go.mod', 'main.go', 'app/http/controllers/'] }
  if (techId.startsWith('go-') || techId === 'vanilla-go') return { summary: 'Go service', paths: ['go.mod', 'main.go'] }
  if (techId === 'ts-elysia') return { summary: 'Elysia service', paths: ['package.json', 'src/index.ts'] }
  if (techId.startsWith('ts-')) return { summary: 'TypeScript service', paths: ['package.json', 'src/'] }
  if (techId === 'vanilla-html-css-js') return { summary: 'Plain browser application', paths: ['index.html', 'style.css', 'app.js'] }
  if (techId.startsWith('react-') || techId === 'solidjs-vite' || techId === 'angular-cli' || techId === 'vue-vite' || techId === 'inferno-js') return { summary: 'Browser application', paths: ['package.json', 'index.html', 'src/'] }
  if (techId === 'qwik-city') return { summary: 'Qwik City application', paths: ['package.json', 'src/routes/'] }
  if (techId === 'html-htmx') return { summary: 'HTML / HTMX application', paths: ['index.html'] }
  if (techId === 'fullstack-nextjs') return { summary: 'Next.js full-stack app', paths: ['package.json', 'src/app/'] }
  if (techId === 'tanstack-start') return { summary: 'TanStack Start application', paths: ['package.json', 'src/routes/'] }
  if (techId === 'solid-start') return { summary: 'SolidStart application', paths: ['package.json', 'src/routes/'] }
  if (techId === 'fullstack-nuxt') return { summary: 'Nuxt full-stack app', paths: ['package.json', 'app.vue', 'pages/'] }
  if (techId === 'fullstack-remix') return { summary: 'Remix full-stack app', paths: ['package.json', 'app/routes/'] }
  if (techId === 'fullstack-sveltekit') return { summary: 'SvelteKit full-stack app', paths: ['package.json', 'src/routes/'] }
  if (techId === 'fullstack-astro') return { summary: 'Astro application', paths: ['package.json', 'src/pages/'] }
  if (techId === 'elixir-phoenix') return { summary: 'Phoenix application', paths: ['mix.exs', 'lib/', 'config/'] }
  if (techId === 'scala-play') return { summary: 'Play application', paths: ['build.sbt', 'app/', 'conf/'] }
  if (techId === 'clojure-ring') return { summary: 'Clojure service', paths: ['deps.edn', 'src/'] }
  if (techId === 'ocaml-dream') return { summary: 'OCaml Dream service', paths: ['dune-project', 'bin/', 'lib/'] }
  if (techId === 'julia-genie') return { summary: 'Genie application', paths: ['Project.toml', 'src/'] }
  if (techId === 'lua-lapis') return { summary: 'Lapis application', paths: ['.rocks/', 'app.lua'] }
  if (techId === 'erlang-cowboy') return { summary: 'Cowboy application', paths: ['rebar.config', 'src/'] }
  if (techId === 'nim-happyx') return { summary: 'HappyX application', paths: ['main.nim'] }
  if (techId === 'crystal-kemal') return { summary: 'Kemal application', paths: ['shard.yml', 'src/'] }
  if (techId === 'deno-fresh') return { summary: 'Fresh application', paths: ['deno.json', 'main.ts', 'routes/'] }
  if (techId.startsWith('deno-')) return { summary: 'Deno application', paths: ['deno.json', 'main.ts'] }
  if (techId === 'cpp-drogon') return { summary: 'Drogon application', paths: ['CMakeLists.txt', 'main.cc'] }
  if (techId === 'haskell-scotty') return { summary: 'Haskell application', paths: ['server.cabal', 'Main.hs'] }
  if (techId === 'zig-http') return { summary: 'Zig service', paths: ['build.zig', 'src/main.zig'] }
  if (techId === 'assembly-nasm') return { summary: 'NASM service', paths: ['Makefile', 'server.asm'] }
  if (techId === 'c-microhttpd') return { summary: 'C HTTP service', paths: ['CMakeLists.txt', 'main.c'] }
  if (techId === 'lit-element') return { summary: 'Lit web component app', paths: ['package.json', 'src/my-element.ts'] }
  if (techId === 'r-plumber') return { summary: 'R Plumber API', paths: ['plumber.R'] }
  if (techId === 'vanilla-node') return { summary: 'Node.js service', paths: ['package.json', 'server.js'] }
  if (techId === 'python-anvil') return { summary: 'Hosted Anvil app', paths: ['anvil-app-plan.md'] }
  if (techId === 'dart-flutter') return { summary: 'Flutter application', paths: ['pubspec.yaml', 'lib/main.dart'] }
  if (techId === 'react-native-expo') return { summary: 'Expo native application', paths: ['package.json', 'App.tsx', 'app.json'] }
  if (techId === 'ionic-framework') return { summary: 'Ionic application', paths: ['package.json', 'src/App.tsx', 'src/main.tsx'] }
  if (techId === 'google-apps-script') return { summary: 'Google Apps Script project', paths: ['appsscript.json', 'src/Code.ts'] }
  if (techId === 'assemblyscript') return { summary: 'AssemblyScript package', paths: ['asconfig.json', 'assembly/index.ts'] }
  if (techId === 'bash-worker') return { summary: 'Shell worker', paths: ['worker.sh'] }
  if (techId === 'sql-migrations') return { summary: 'SQL migration package', paths: ['migrations/'] }
  if (techId === 'electron-app') return { summary: 'Electron desktop application', paths: ['package.json', 'main.js', 'index.html'] }
  if (techId === 'tauri-app') return { summary: 'Tauri desktop application', paths: ['package.json', 'index.html', 'src/main.js'] }
  return { summary: 'Framework-native starter', paths: ['README.md'] }
}
