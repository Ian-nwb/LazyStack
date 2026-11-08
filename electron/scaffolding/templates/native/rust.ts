import { Files, GITIGNORE, NativeContext, readme, shell } from './context'

const pkg = (c: NativeContext, extra = '') =>
  `[package]\nname = "${c.snake}"\nversion = "0.1.0"\nedition = "2021"\n${extra}`

const portFn = (c: NativeContext) => `/// Port comes from \`PORT\` (set by LazyStack's .env and Compose files) with a starter default.
pub fn port() -> u16 {
    std::env::var("PORT").ok().and_then(|value| value.parse().ok()).unwrap_or(${c.port || 8080})
}
`

function rustService(c: NativeContext, framework: 'axum' | 'actix' | 'poem'): Files {
  const files: Files = {}
  const label = { axum: 'Axum', actix: 'Actix Web', poem: 'Poem' }[framework]
  const deps = {
    axum: `axum = "0.8"\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\ntokio = { version = "1", features = ["full"] }\n`,
    actix: `actix-web = "4"\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\n`,
    poem: `poem = "3"\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\ntokio = { version = "1", features = ["full"] }\n\n[dev-dependencies]\npoem = { version = "3", features = ["test"] }\n`
  }[framework]
  files['Cargo.toml'] = pkg(c, `\n[dependencies]\n${deps}`)
  files['src/config.rs'] = portFn(c)

  if (framework === 'axum') {
    files['src/main.rs'] = `mod config;
mod routes;

#[tokio::main]
async fn main() {
    let port = config::port();
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("bind port");
    println!("[LazyStack] ${c.name} (Axum) listening on http://0.0.0.0:{port}");
    axum::serve(listener, routes::router()).await.expect("server error");
}
`
    files['src/routes.rs'] = `use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
pub struct Status {
    pub service: &'static str,
    pub framework: &'static str,
    pub status: &'static str,
}

#[derive(Serialize)]
pub struct Health {
    pub status: &'static str,
}

pub fn router() -> Router {
    Router::new().route("/", get(index)).route("/health", get(health))
}

pub async fn index() -> Json<Status> {
    Json(Status { service: "${c.name}", framework: "${label}", status: "online" })
}

pub async fn health() -> Json<Health> {
    Json(Health { status: "healthy" })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn health_reports_healthy() {
        let Json(body) = health().await;
        assert_eq!(body.status, "healthy");
    }

    #[tokio::test]
    async fn index_names_the_service() {
        let Json(body) = index().await;
        assert_eq!(body.service, "${c.name}");
    }
}
`
  } else if (framework === 'actix') {
    files['src/main.rs'] = `mod config;
mod routes;

use actix_web::{App, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = config::port();
    println!("[LazyStack] ${c.name} (Actix Web) listening on http://0.0.0.0:{port}");
    HttpServer::new(|| App::new().configure(routes::configure))
        .bind(("0.0.0.0", port))?
        .run()
        .await
}
`
    files['src/routes.rs'] = `use actix_web::{get, web, HttpResponse, Responder};
use serde_json::json;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(index).service(health);
}

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().json(json!({ "service": "${c.name}", "framework": "${label}", "status": "online" }))
}

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(json!({ "status": "healthy" }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn health_returns_ok() {
        let app = test::init_service(App::new().configure(configure)).await;
        let response = test::call_service(&app, test::TestRequest::get().uri("/health").to_request()).await;
        assert!(response.status().is_success());
    }
}
`
  } else {
    files['src/main.rs'] = `mod config;
mod routes;

use poem::{listener::TcpListener, Server};

#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    let port = config::port();
    println!("[LazyStack] ${c.name} (Poem) listening on http://0.0.0.0:{port}");
    Server::new(TcpListener::bind(format!("0.0.0.0:{port}"))).run(routes::app()).await
}
`
    files['src/routes.rs'] = `use poem::{get, handler, web::Json, Route};
use serde_json::{json, Value};

pub fn app() -> Route {
    Route::new().at("/", get(index)).at("/health", get(health))
}

#[handler]
fn index() -> Json<Value> {
    Json(json!({ "service": "${c.name}", "framework": "${label}", "status": "online" }))
}

#[handler]
fn health() -> Json<Value> {
    Json(json!({ "status": "healthy" }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use poem::test::TestClient;

    #[tokio::test]
    async fn health_returns_ok() {
        let client = TestClient::new(app());
        client.get("/health").send().await.assert_status_is_ok();
    }
}
`
  }

  files['.gitignore'] = GITIGNORE.rust
  files['README.md'] = readme(`${c.name} (${label})`, `Rust ${label} web service generated by LazyStack.`, [
    ['Layout', '- `src/main.rs`: server bootstrap\n- `src/routes.rs`: routes, handlers and unit tests\n- `src/config.rs`: runtime configuration (`PORT`)'],
    ['Develop', shell(`cargo run\ncargo test`)],
    ['Build', shell('cargo build --release')]
  ])
  return files
}

function dioxus(c: NativeContext): Files {
  return {
    'Cargo.toml': pkg(c, `authors = []

[dependencies]
dioxus = { version = "0.7", features = ["router"] }

[features]
default = ["web"]
web = ["dioxus/web"]
desktop = ["dioxus/desktop"]
mobile = ["dioxus/mobile"]

[profile.wasm-dev]
inherits = "dev"
opt-level = 1

[profile.server-dev]
inherits = "dev"

[profile.android-dev]
inherits = "dev"
`),
    'Dioxus.toml': `[application]\nname = "${c.snake}"\n\n[web.app]\ntitle = "${c.name}"\n\n[web.watcher]\nreload_html = true\nwatch_path = ["src", "assets"]\n`,
    'clippy.toml': `await-holding-invalid-types = [\n  "generational_box::GenerationalRef",\n  { path = "generational_box::GenerationalRef", reason = "Reads should not be held over an await point." },\n  "generational_box::GenerationalRefMut",\n  { path = "generational_box::GenerationalRefMut", reason = "Write should not be held over an await point." },\n  "dioxus_signals::Write",\n  { path = "dioxus_signals::Write", reason = "Write should not be held over an await point." },\n]\n`,
    'src/main.rs': `use dioxus::prelude::*;

mod components;
mod views;

use views::{About, Home, Navbar};

#[derive(Debug, Clone, Routable, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[layout(Navbar)]
        #[route("/")]
        Home {},
        #[route("/about")]
        About {},
}

const MAIN_CSS: Asset = asset!("/assets/main.css");

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    rsx! {
        document::Link { rel: "stylesheet", href: MAIN_CSS }
        Router::<Route> {}
    }
}
`,
    'src/components/mod.rs': `mod counter;\npub use counter::Counter;\n`,
    'src/components/counter.rs': `use dioxus::prelude::*;

#[component]
pub fn Counter(label: String) -> Element {
    let mut count = use_signal(|| 0);
    rsx! {
        div { class: "counter",
            span { "{label}: {count}" }
            button { onclick: move |_| count += 1, "Increment" }
            button { onclick: move |_| count -= 1, "Decrement" }
        }
    }
}
`,
    'src/views/mod.rs': `mod about;\nmod home;\nmod navbar;\n\npub use about::About;\npub use home::Home;\npub use navbar::Navbar;\n`,
    'src/views/navbar.rs': `use crate::Route;
use dioxus::prelude::*;

#[component]
pub fn Navbar() -> Element {
    rsx! {
        nav { id: "navbar",
            Link { to: Route::Home {}, "Home" }
            Link { to: Route::About {}, "About" }
        }
        Outlet::<Route> {}
    }
}
`,
    'src/views/home.rs': `use crate::components::Counter;
use dioxus::prelude::*;

#[component]
pub fn Home() -> Element {
    rsx! {
        main { class: "page",
            h1 { "${c.name}" }
            p { "Dioxus app generated by LazyStack. Edit src/views/home.rs to get started." }
            Counter { label: "Clicks" }
        }
    }
}
`,
    'src/views/about.rs': `use dioxus::prelude::*;

#[component]
pub fn About() -> Element {
    rsx! {
        main { class: "page",
            h1 { "About" }
            p { "One Rust codebase for web, desktop and mobile targets." }
        }
    }
}
`,
    'assets/main.css': `body { margin: 0; font-family: system-ui, sans-serif; background: #0f1116; color: #f4f4f5; }\n#navbar { display: flex; gap: 1rem; padding: 1rem 2rem; border-bottom: 1px solid #27272a; }\n#navbar a { color: #93c5fd; text-decoration: none; }\n.page { padding: 2rem; }\n.counter { display: flex; gap: .75rem; align-items: center; }\nbutton { padding: .4rem .8rem; border-radius: 6px; border: 1px solid #3f3f46; background: #18181b; color: inherit; cursor: pointer; }\n`,
    '.gitignore': GITIGNORE.rust + '/dist\n',
    'README.md': readme(`${c.name} (Dioxus)`, 'Cross-platform Rust UI generated by LazyStack, following the `dx new` layout.', [
      ['Prerequisites', shell('cargo install dioxus-cli   # provides `dx`\nrustup target add wasm32-unknown-unknown')],
      ['Develop', shell(`dx serve --port ${c.port || 8080}            # web (default feature)\ndx serve --platform desktop   # native desktop window`)],
      ['Bundle', shell('dx bundle --release')],
      ['Layout', '- `src/main.rs`: app entry and router\n- `src/views/`: routed pages\n- `src/components/`: reusable components\n- `assets/`: CSS, icons and other assets loaded with `asset!()`']
    ])
  }
}

function slint(c: NativeContext): Files {
  return {
    'Cargo.toml': pkg(c, `
[dependencies]
slint = "1.18"

[build-dependencies]
slint-build = "1.18"
`),
    'build.rs': `fn main() {\n    slint_build::compile("ui/app-window.slint").expect("Slint build failed");\n}\n`,
    'ui/app-window.slint': `import { Button, VerticalBox } from "std-widgets.slint";

export component AppWindow inherits Window {
    title: "${c.name}";
    preferred-width: 420px;
    preferred-height: 240px;

    in-out property <int> counter: 0;
    callback request-increase-value();

    VerticalBox {
        alignment: center;
        Text {
            text: "Counter: \\{root.counter}";
            font-size: 24px;
            horizontal-alignment: center;
        }
        Button {
            text: "Increase value";
            clicked => {
                root.request-increase-value();
            }
        }
    }
}
`,
    'src/main.rs': `// Prevent a console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::error::Error;

slint::include_modules!();

fn main() -> Result<(), Box<dyn Error>> {
    let ui = AppWindow::new()?;

    ui.on_request_increase_value({
        let ui_handle = ui.as_weak();
        move || {
            let ui = ui_handle.unwrap();
            ui.set_counter(ui.get_counter() + 1);
        }
    });

    ui.run()?;
    Ok(())
}
`,
    '.gitignore': GITIGNORE.rust,
    'README.md': readme(`${c.name} (Slint)`, 'Native Rust desktop UI using Slint, following the official `slint-rust-template` layout.', [
      ['Layout', '- `ui/`: `.slint` markup compiled at build time by `build.rs`\n- `src/main.rs`: Rust logic and callbacks'],
      ['Develop', shell('cargo run')],
      ['Tooling', 'Install the Slint editor extension (VS Code: `Slint.slint`) for live preview of `.slint` files.'],
      ['Linux prerequisites', 'Install fontconfig and a windowing backend (e.g. `libxkbcommon`, Wayland or X11 development packages).']
    ])
  }
}

function bevy(c: NativeContext): Files {
  return {
    'Cargo.toml': pkg(c, `
[dependencies]
bevy = "0.20"

# Small optimizations for our code, full optimizations for dependencies (recommended by Bevy).
[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3
`),
    'src/main.rs': `use bevy::prelude::*;

mod plugins;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "${c.name}".into(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins((plugins::CameraPlugin, plugins::PlayerPlugin))
        .run();
}
`,
    'src/plugins/mod.rs': `mod camera;\nmod player;\n\npub use camera::CameraPlugin;\npub use player::PlayerPlugin;\n`,
    'src/plugins/camera.rs': `use bevy::prelude::*;

pub struct CameraPlugin;

impl Plugin for CameraPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, spawn_camera);
    }
}

fn spawn_camera(mut commands: Commands) {
    commands.spawn(Camera2d);
}
`,
    'src/plugins/player.rs': `use bevy::prelude::*;

const SPEED: f32 = 300.0;

#[derive(Component)]
pub struct Player;

pub struct PlayerPlugin;

impl Plugin for PlayerPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, spawn_player)
            .add_systems(Update, move_player);
    }
}

fn spawn_player(mut commands: Commands) {
    commands.spawn((
        Player,
        Sprite::from_color(Color::srgb(0.25, 0.6, 1.0), Vec2::splat(48.0)),
        Transform::default(),
    ));
}

fn move_player(
    keys: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    mut players: Query<&mut Transform, With<Player>>,
) {
    let mut direction = Vec2::ZERO;
    if keys.any_pressed([KeyCode::ArrowLeft, KeyCode::KeyA]) { direction.x -= 1.0; }
    if keys.any_pressed([KeyCode::ArrowRight, KeyCode::KeyD]) { direction.x += 1.0; }
    if keys.any_pressed([KeyCode::ArrowUp, KeyCode::KeyW]) { direction.y += 1.0; }
    if keys.any_pressed([KeyCode::ArrowDown, KeyCode::KeyS]) { direction.y -= 1.0; }
    let step = direction.normalize_or_zero() * SPEED * time.delta_secs();
    for mut transform in &mut players {
        transform.translation += step.extend(0.0);
    }
}
`,
    'assets/.gitkeep': '',
    '.gitignore': GITIGNORE.rust,
    'README.md': readme(`${c.name} (Bevy)`, 'Data-driven Rust game generated by LazyStack. Move the square with WASD or the arrow keys.', [
      ['Layout', '- `src/main.rs`: app setup and plugin registration\n- `src/plugins/`: one Bevy plugin per feature (camera, player, ...)\n- `assets/`: textures, audio and fonts loaded by the `AssetServer`'],
      ['Develop', shell('cargo run')],
      ['Faster iteration', shell('cargo run --features bevy/dynamic_linking')],
      ['Linux prerequisites', 'Install the ALSA, udev, Wayland and xkbcommon development packages, e.g. Debian/Ubuntu: `sudo apt install pkg-config libasound2-dev libudev-dev libwayland-dev libxkbcommon-dev`; Fedora: `sudo dnf install alsa-lib-devel systemd-devel wayland-devel libxkbcommon-devel`. See https://bevy.org/learn/quick-start/getting-started/setup/.']
    ])
  }
}

function wasmFrontend(c: NativeContext, framework: 'yew' | 'leptos'): Files {
  const isYew = framework === 'yew'
  const label = isYew ? 'Yew' : 'Leptos'
  return {
    'Cargo.toml': isYew
      ? pkg(c, `rust-version = "1.85"\n\n[dependencies]\nyew = { version = "0.21", features = ["csr"] }\n`)
      : pkg(c, `rust-version = "1.88"\n\n[dependencies]\nleptos = { version = "0.8", features = ["csr"] }\n`),
    'Trunk.toml': `[build]\ntarget = "index.html"\ndist = "dist"\n\n[watch]\nwatch = ["src", "index.html", "style.css"]\n\n[serve]\naddresses = ["0.0.0.0"]\nport = ${c.port || 8080}\n`,
    'index.html': `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${c.name}</title>\n    <link data-trunk rel="css" href="style.css" />\n    <link data-trunk rel="rust" />\n  </head>\n  <body></body>\n</html>\n`,
    'style.css': `body { margin: 0; font-family: system-ui, sans-serif; background: #0f1116; color: #f4f4f5; }\nmain { padding: 2rem; }\nbutton { padding: .4rem .8rem; }\n`,
    'src/main.rs': isYew
      ? `mod components;

use components::Counter;
use yew::prelude::*;

#[function_component(App)]
fn app() -> Html {
    html! {
        <main>
            <h1>{ "${c.name}" }</h1>
            <p>{ "Yew WebAssembly app generated by LazyStack." }</p>
            <Counter />
        </main>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
`
      : `mod components;

use components::Counter;
use leptos::prelude::*;

#[component]
fn App() -> impl IntoView {
    view! {
        <main>
            <h1>"${c.name}"</h1>
            <p>"Leptos WebAssembly app generated by LazyStack."</p>
            <Counter />
        </main>
    }
}

fn main() {
    mount_to_body(App);
}
`,
    'src/components/mod.rs': `mod counter;\npub use counter::Counter;\n`,
    'src/components/counter.rs': isYew
      ? `use yew::prelude::*;

#[function_component(Counter)]
pub fn counter() -> Html {
    let count = use_state(|| 0);
    let onclick = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count + 1))
    };
    html! { <button {onclick}>{ format!("Clicked {} times", *count) }</button> }
}
`
      : `use leptos::prelude::*;

#[component]
pub fn Counter() -> impl IntoView {
    let (count, set_count) = signal(0);
    view! {
        <button on:click=move |_| set_count.update(|n| *n += 1)>
            "Clicked " {count} " times"
        </button>
    }
}
`,
    '.gitignore': GITIGNORE.rust + '/dist\n',
    'README.md': readme(`${c.name} (${label})`, `Rust-to-WebAssembly frontend using ${label} and Trunk.`, [
      ['Prerequisites', shell('rustup target add wasm32-unknown-unknown\ncargo install --locked trunk')],
      ['Develop', shell('trunk serve')],
      ['Build', shell('trunk build --release   # output in dist/')],
      ['Layout', '- `src/main.rs`: root component and mount\n- `src/components/`: reusable components\n- `index.html`, `style.css`: Trunk entry and styles']
    ])
  }
}

export const rustStarters: Record<string, (c: NativeContext) => Files> = {
  'rust-axum': c => rustService(c, 'axum'),
  'rust-actix': c => rustService(c, 'actix'),
  'rust-poem': c => rustService(c, 'poem'),
  'rust-dioxus': dioxus,
  'rust-slint': slint,
  'rust-bevy': bevy,
  'rust-yew': c => wasmFrontend(c, 'yew'),
  'rust-leptos': c => wasmFrontend(c, 'leptos')
}

export const rustExtras: Record<string, (c: NativeContext) => Files> = {
  'rust-gpui': () => ({ '.gitignore': GITIGNORE.rust })
}
