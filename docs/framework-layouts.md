# Framework-native project layouts

LazyStack has two separate layout decisions:

1. The selected architecture places each app at a service root such as `frontend/clients/<name>/`, `backend/services/<name>/`, `apps/<name>/`, or a custom app path.
2. The selected framework's starter files are written inside that root using that ecosystem's expected entrypoints and directories.

The architecture root does not turn every service into a JavaScript package. A Go app remains a Go module, a PHP app remains a Composer project, and so on. The Blueprint tree, the README's directory tree and the `lazystack plan` output are all computed from the files the generator will write, so they cannot show a folder that is not created. Each architecture only promises root-level folders; the layout inside an app is always the framework's own.

## Examples by ecosystem

| Ecosystem / framework | Native paths in the starter |
| --- | --- |
| Laravel | `artisan`, `app/`, `bootstrap/`, `config/`, `database/migrations/`, `public/`, `resources/views/`, `routes/`, `composer.json` |
| Symfony | `config/`, `public/index.php`, `src/Kernel.php`, `src/Controller/`, `composer.json` |
| Plain PHP | `composer.json`, `public/index.php` |
| Ruby on Rails | `Gemfile`, `config/`, `app/controllers/` |
| Django | `manage.py`, `<project_package>/` (settings, urls, wsgi, asgi), `core/` app (views, urls, models, migrations, tests, templates), `templates/`, `static/` |
| FastAPI | `main.py`, `app/` (`main.py`, `config.py`, `schemas.py`, `routers/`), `tests/`; the API service profile adds SQLAlchemy models, CRUD routes, token auth and Alembic migrations |
| Flask | `app.py`, `<package>/` (`create_app` factory, blueprint routes, `templates/`, `static/`), `tests/` |
| Reflex / NiceGUI | `rxconfig.py`, `<app>/` (pages, `state.py`, `components/`), `assets/`; NiceGUI `main.py`, `app/pages.py`, `tests/` |
| Spring Boot | `pom.xml`, `src/main/java/<pkg>/` (`Application`, `web/`), `src/main/resources/` (`application.properties`, `static/`, `templates/`), `src/test/java/` |
| JavaFX | `pom.xml` (javafx-maven-plugin), `module-info.java`, `src/main/java/<pkg>/` (`App`, controllers), `src/main/resources/<pkg>/` (`*.fxml`, `styles.css`) |
| Java Swing | `pom.xml` (exec + jar manifest), `src/main/java/<pkg>/` (`App`, `ui/`, `model/`), `src/test/java/` |
| Ktor / Kotlin-JS | `settings.gradle.kts`, `build.gradle.kts`, `src/main/kotlin/<pkg>/` (`Application.kt`, `plugins/`), `src/test/kotlin/`; Kotlin/JS uses `src/jsMain/kotlin/` |
| Play (Scala) | `build.sbt`, `project/`, `app/controllers/`, `app/views/`, `conf/` (`routes`, `application.conf`), `public/`, `test/` |
| Clojure Ring | `deps.edn`, `build.clj`, `src/<ns>/` (`core`, `routes`), `test/`, `resources/` |
| ASP.NET Core / Blazor | `.csproj`, `Program.cs`, `Endpoints/`, `appsettings*.json`; Blazor adds `Pages/`, `Layout/`, `_Imports.razor`, `wwwroot/` |
| .NET MAUI | `<name>.csproj` (`UseMaui`, per-OS `TargetFrameworks`), `MauiProgram.cs`, `App.xaml`, `AppShell.xaml`, `MainPage.xaml`, `ViewModels/`, `Services/`, `Platforms/{Android,iOS,MacCatalyst,Windows}/`, `Resources/` (icon, splash, images, fonts, raw, styles), `tests/<Name>.Tests/` (xUnit); run on the host, Linux builds Android only |
| React Native (Expo) | `package.json` (`main: expo-router/entry`), `app.json`, `eas.json`, `app/` (`_layout`, `(tabs)/`, `+not-found`), `components/`, `constants/`, `assets/`, `__tests__/` (jest-expo); run on the host |
| Capacitor | Vite `index.html`, `src/` (`main`, `device`, `api` + Vitest test), `public/`, `capacitor.config.ts` (`.json` for JavaScript); `android/` and `ios/` come from `npx cap add`. The web build runs in Docker |
| Phoenix | `mix.exs`, `config/*.exs`, `lib/<app>/`, `lib/<app>_web/` (endpoint, router, controllers), `test/` |
| Go frameworks and `net/http` | `go.mod`, `main.go`, `internal/handlers/` (with `httptest` tests), `internal/config/` |
| Rust Actix / Axum / Poem | `Cargo.toml`, `src/main.rs`, `src/routes.rs` (with tests), `src/config.rs` |
| Rust Yew / Leptos | `Cargo.toml`, `Trunk.toml`, `index.html`, `style.css`, `src/main.rs`, `src/components/` |
| Rust Dioxus | `Cargo.toml` (web/desktop/mobile features), `Dioxus.toml`, `src/main.rs` (router), `src/views/`, `src/components/`, `assets/` |
| Rust Slint | `Cargo.toml`, `build.rs`, `ui/app-window.slint`, `src/main.rs`; native desktop app run on the host |
| Rust Bevy | `Cargo.toml` (Bevy dev profiles), `src/main.rs`, `src/plugins/`, `assets/`; game run on the host |
| Rust GPUI | `Cargo.toml`, `src/main.rs`; native desktop app run on the host |
| Swift Vapor / SwiftUI | `Package.swift`, `Sources/App/` (`entrypoint.swift`, `configure.swift`, `routes.swift`, `Controllers/`), `Tests/AppTests/`, `Public/`; SwiftUI uses `Sources/<target>/` |
| Deno / Fresh | `deno.json`, `main.ts`, `main_test.ts`; Fresh adds `routes/`, `islands/`, `components/`, `static/`, `fresh.gen.ts` |
| Erlang Cowboy / OCaml Dream / Crystal Kemal / Lua Lapis | rebar3 release layout (`src/`, `test/`, `config/`); dune project (`bin/`, `lib/`, `test/`, `*.opam`); `crystal init` layout (`src/`, `spec/`); `lapis new` layout (`app.lua`, `config.lua`, `nginx.conf`, `models/`, `views/`) |
| React / Vue / Angular / Solid / Qwik | ecosystem package manifest and each framework's `src/` or route entrypoints |
| Next.js / Nuxt / Remix / SvelteKit / Astro | framework-specific `app/`, `pages/`, `src/routes/`, or `src/pages/` entrypoints |
| Deno / Zig / C++ / Haskell / OCaml / Scala / Clojure / Erlang / Crystal / Nim | native runtime/build manifests and language-specific source paths |
| Svelte / Preact + Vite | `package.json`, `vite.config.js`, `index.html`, `src/` (`main`, `App`, `components/`), `public/` |
| Quasar | `quasar.config.ts`, `index.html`, `src/{boot,components,layouts,pages,router,stores,css}`, `public/` |
| Gatsby | `gatsby-config.js`, `gatsby-node.js`, `gatsby-browser.js`, `src/pages/`, `static/` |
| Vike | `vite.config.js`, `pages/+config.js`, `pages/+Layout.jsx`, `pages/<route>/+Page.jsx` (pre-rendered) |
| RedwoodJS | `redwood.toml`, `api/` (`db/schema.prisma`, `src/{functions,graphql,services,directives,lib}`), `web/` (`src/{pages,layouts,components}`, `Routes.jsx`) |
| Blitz.js | `blitz.config.ts`, `db/` (Prisma), `src/{app,pages,queries,mutations}`, `src/pages/api/rpc/[[...blitz]].ts` |
| Meteor | `.meteor/` (packages, platforms, release), `client/`, `server/`, `imports/`, `tests/`; host only |
| Next.js + tRPC | `src/app/` (App Router, `api/trpc/[trpc]/route.ts`), `src/server/` (`trpc.ts`, `routers/_app.ts`), `src/trpc/client.tsx` |
| AdonisJS | `adonisrc.ts`, `ace.js`, `bin/server.ts`, `start/{env,kernel,routes}.ts`, `app/{controllers,exceptions,models,middleware}/`, `config/` |
| Koa / Bun | `src/index.ts`, `src/app.ts` + `src/routes/` (Koa); `src/index.ts` + `src/routes.ts` with `bun test` (Bun) |
| Litestar / Starlette / Sanic / Tornado / Pyramid | `main.py` entry, `app/` package, `tests/`; Litestar adds `app/controllers/` |
| Streamlit / Gradio | `app.py`, `lib/`, `tests/`; Streamlit adds `pages/` and `.streamlit/config.toml` |
| Hugo | `hugo.toml`, `content/`, `layouts/`, `static/`, `assets/`, `data/`, `archetypes/`; Docker builds then serves with nginx |
| Jekyll | `Gemfile`, `_config.yml`, `_layouts/`, `_posts/`, `_includes/`, `_data/`, `assets/` |
| Eleventy / Docusaurus / VitePress | `eleventy.config.js` + `src/`; `docusaurus.config.js` + `docs/` + `src/pages/`; `.vitepress/config.mjs` + Markdown pages |
| Gleam (Wisp) | `gleam.toml`, `src/<app>.gleam`, `src/<app>/router.gleam`, `test/` |
| V (veb) | `v.mod`, `main.v`, `main_test.v` |
| Dart Shelf | `pubspec.yaml`, `bin/server.dart`, `lib/app.dart`, `test/` |
| Serverpod | `setup.sh` + README that runs `serverpod create`; host only |
| Dart Jaspr | `pubspec.yaml`, `bin/main.dart`, `lib/app.dart`, `lib/components/`, `test/` |
| Goose (vanilla) | `src/main.goose`; host only |
| Goose HTTP | `src/main.goose`, `src/http.c`, `src/main.build` (sidecar) |
| Quarkus / Micronaut / Javalin (2.0) | `pom.xml`, `src/main/java/<pkg>/` (resource, controller or `App`), `src/main/resources/application.properties` (`PORT`), `src/test/java/` (`@QuarkusTest`, `@MicronautTest`, `JavalinTest`) |
| Go templ + HTMX (2.0) | `go.mod`, `main.go`, `router.go`, `components.templ` (`templ generate` writes `*_templ.go`), `router_test.go` |
| Django Ninja (2.0) | `manage.py`, `config/` (settings, urls, wsgi), `api/` (`api.py` Ninja router, `tests.py`), `pytest.ini` |
| Plotly Dash / FastHTML (2.0) | `app.py` (layout, callbacks, `/health` on the Flask server), `test_app.py`; FastHTML `main.py`, `test_main.py` |
| MkDocs Material (2.0) | `mkdocs.yml`, `docs/` |
| Slim 4 (2.0) | `composer.json`, `public/index.php`, `src/AppFactory.php`, `tests/`, `phpunit.xml` |
| WordPress (2.0) | `wp-content/themes/<theme>/` (`style.css`, `functions.php`, `index.php`), `wp-content/plugins/`, `wp-content/mu-plugins/health.php`; core comes from the official image |
| Sinatra (2.0) | `Gemfile`, `app.rb`, `config.ru`, `Rakefile`, `test/` |
| Rocket (2.0) | `Cargo.toml`, `src/main.rs` (routes, launch, tests) |
| Mojolicious (2.0) | `cpanfile`, `app.pl` (Mojolicious::Lite), `t/` |
| R Shiny (2.0) | `app.R` |
| Hummingbird 2 (2.0) | `Package.swift`, `Sources/App/App.swift`, `Tests/AppTests/` |
| Dart Frog (2.0) | `pubspec.yaml`, `routes/` (file-based routes), `test/routes/` |
| F# Giraffe (2.0) | `<name>.fsproj`, `Program.fs` |
| Razor Pages (2.0) | `<name>.csproj`, `Program.cs`, `Pages/` (`.cshtml` + PageModel, `Shared/_Layout.cshtml`), `wwwroot/` |
| Alpine.js / Elm (2.0) | `index.html`, `src/main.js`, `vite.config.js`; Alpine `src/counter.js` + test; Elm `elm.json`, `src/Main.elm` |
| React + Tailwind + shadcn/ui (2.0) | `components.json`, `vite.config.ts`, `src/components/ui/`, `src/lib/utils.ts`, `src/index.css` (Tailwind v4 theme), `src/App.test.tsx` |
| Astro Starlight (2.0) | `astro.config.mjs`, `src/content.config.ts`, `src/content/docs/` |
| Cloudflare Workers (2.0) | `wrangler.jsonc`, `src/index.ts` (Hono), `src/index.test.ts` |
| WXT browser extension (2.0) | `wxt.config.ts`, `entrypoints/` (background, popup), `utils/`; host only |
| Vanilla HTML, Node, Go, Python, Java | simple runtime entrypoints without a framework-imposed workspace |
| Nitro / hapi (3.0) | `server/routes/` (file-based) + `nitro.config.*`; hapi: `src/server.*` factory, `src/index.*`, `src/server.test.*` (both have a JavaScript variant) |
| Directus / Strapi (3.0) | Directus: `package.json`, `.env.example`, `extensions/`, `data/`; Strapi 5: `config/` (server, database, admin, middlewares, plugins), `src/index.js`, `src/api/` |
| Payload 3 (3.0) | Next.js app: `src/payload.config.ts`, `src/collections/`, `src/app/(payload)/` (admin + REST/GraphQL routes), `src/app/(frontend)/` |
| Laravel + Inertia / Livewire (3.0) | `composer.json` + `setup.php` (copies the laravel/laravel skeleton after install), `routes/web.php`; Inertia: `resources/js/Pages/`, `HandleInertiaRequests`; Livewire: `app/Livewire/`, `resources/views/livewire/` |
| CodeIgniter 4 / CakePHP 5 (3.0) | `composer.json` + `setup.php` (copies the official skeleton); CodeIgniter: `app/Config/Routes.php`, `app/Controllers/`; CakePHP: `config/routes.php`, `src/Controller/` |
| Quart / Falcon (3.0) | `requirements.txt`, `app.py`, `tests/` (pytest) |
| Beego (3.0) | `go.mod`, `main.go`, `controllers/`, `conf/app.conf` |
| Vert.x / Jakarta EE / Vaadin (3.0) | `pom.xml`, `src/main/java/<pkg>/` (`App` router; JAX-RS `RestApplication` + resource packaged as `app.war`; Vaadin `Application` + `MainView` + `/health` controller) |
| Hanami 2 (3.0) | `Gemfile`, `config.ru`, `config/` (app, routes, settings, puma), `app/action.rb`, `app/actions/`, `spec/requests/` |
| Ember.js (3.0) | `ember-cli-build.js`, `config/environment.js`, `app/` (app, router, templates, components), built to `dist/` |
| Loco (3.0) | `Cargo.toml`, `src/app.rs` (Hooks), `src/controllers/`, `src/bin/main.rs`, `config/{development,production,test}.yaml` |
| Compose Multiplatform / Android (3.0) | `settings.gradle.kts`, `build.gradle.kts`, `src/main/kotlin/Main.kt` (desktop); Android: `app/build.gradle.kts`, `app/src/main/AndroidManifest.xml`, `app/src/main/java/<pkg>/MainActivity.kt`; host only |
| Feathers 5 (3.0) | `src/app.*` (Koa app factory with a `messages` service), `src/index.*`, `src/app.test.*` (JavaScript variant too) |
| Warp / Salvo (3.0) | `Cargo.toml`, `src/main.rs` (routes, server, Warp test module) |
| Iris (3.0) | `go.mod`, `main.go` (`newApp()`), `main_test.go` (`iris/httptest`) |
| aiohttp / Bottle (3.0) | `requirements.txt`, `app.py`, `tests/` (pytest-aiohttp, WebTest) |
| Roda (3.0) | `Gemfile`, `config.ru`, `app.rb` (routing tree), `test/app_test.rb`, `Rakefile` |
| Spring Boot, Kotlin (3.0) | `settings.gradle.kts`, `build.gradle.kts`, `src/main/kotlin/<pkg>/Application.kt`, `src/test/kotlin/`, `src/main/resources/application.properties` |

Desktop, mobile, browser-extension and hosted apps (GPUI, Slint, Bevy, Dioxus, JavaFX, Swing, Electron, Tauri, Flutter, SwiftUI, WXT, Anvil, Apps Script) always run on the host and never get a Docker service.

This table describes starter output, not a claim that the generated app is a complete production application. Each app's README gives its selected framework's local run command. The API-service profile currently expands FastAPI with a model, CRUD routes, token auth, migration, and tests.

## Reverse proxy choices

The generated gateway can use Nginx, Apache HTTP Server, Caddy, or Traefik. Config files are written under the selected infrastructure root in a matching `nginx/`, `apache/`, `caddy/`, or `traefik/` directory.
