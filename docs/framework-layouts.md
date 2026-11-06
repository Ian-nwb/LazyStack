# Framework-native project layouts

LazyStack has two separate layout decisions:

1. The selected architecture places each app at a service root such as `frontend/clients/<name>/`, `backend/services/<name>/`, `apps/<name>/`, or a custom app path.
2. The selected framework's starter files are written inside that root using that ecosystem's expected entrypoints and directories.

The architecture root does not turn every service into a JavaScript package. A Go app remains a Go module, a PHP app remains a Composer project, and so on. The Blueprint tree shows representative native paths for each selected app.

## Examples by ecosystem

| Ecosystem / framework | Native paths in the starter |
| --- | --- |
| Laravel | `artisan`, `app/`, `bootstrap/`, `config/`, `database/migrations/`, `public/`, `resources/views/`, `routes/`, `composer.json` |
| Symfony | `config/`, `public/index.php`, `src/Kernel.php`, `src/Controller/`, `composer.json` |
| Plain PHP | `composer.json`, `public/index.php` |
| Ruby on Rails | `Gemfile`, `config/`, `app/controllers/` |
| Django | `manage.py`, `<project_package>/settings.py`, `<project_package>/urls.py` |
| FastAPI | `main.py`, `requirements.txt`; the API service profile adds `app/`, `migrations/`, and `tests/` |
| Reflex / NiceGUI | `rxconfig.py` and an app package for Reflex; `main.py` for NiceGUI |
| Spring Boot | `pom.xml`, `src/main/java/`, `src/main/resources/` |
| Ktor / Kotlin-JS | Gradle build files and `src/main/kotlin/` or `src/jsMain/kotlin/` |
| ASP.NET Core / Blazor | `.csproj`, `Program.cs` and app settings, or the Blazor client entrypoints |
| Go frameworks and `net/http` | `go.mod` and Go source files |
| Rust Actix / Axum / Poem | `Cargo.toml`, `src/main.rs` |
| Rust Yew / Leptos | `Cargo.toml`, `Trunk.toml`, `index.html`, `src/main.rs` |
| Rust GPUI | `Cargo.toml`, `src/main.rs`; native desktop app run on the host |
| Swift Vapor / SwiftUI | `Package.swift`, `Sources/App/` or `Sources/<target>/` |
| React / Vue / Angular / Solid / Qwik | ecosystem package manifest and each framework's `src/` or route entrypoints |
| Next.js / Nuxt / Remix / SvelteKit / Astro | framework-specific `app/`, `pages/`, `src/routes/`, or `src/pages/` entrypoints |
| Deno / Zig / C++ / Haskell / OCaml / Scala / Clojure / Erlang / Crystal / Nim | native runtime/build manifests and language-specific source paths |
| Vanilla HTML, Node, Go, Python, Java | simple runtime entrypoints without a framework-imposed workspace |

This table describes starter output, not a claim that the generated app is a complete production application. Each app's README gives its selected framework's local run command. The API-service profile currently expands FastAPI with a model, CRUD routes, token auth, migration, and tests.

## Reverse proxy choices

The generated gateway can use Nginx, Apache HTTP Server, Caddy, or Traefik. Config files are written under the selected infrastructure root in a matching `nginx/`, `apache/`, `caddy/`, or `traefik/` directory.
