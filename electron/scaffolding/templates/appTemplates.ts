import { LanguageFlavor } from '../../../src/types'

export function getStarterFilesForTech(
  techId: string,
  folderName: string,
  port: number,
  flavor?: LanguageFlavor,
  starterProfile: 'minimal' | 'api-service' = 'minimal'
): Record<string, string> {
  const files: Record<string, string> = {}
  const isTS = (flavor || 'typescript') === 'typescript'

  if (techId === 'assembly-nasm') {
    files['server.asm'] = `; ==============================================================================
; [EXPERIMENTAL / RESEARCH TEMPLATE]
; LazyStack Assembly (x86_64 NASM) Micro HTTP Service
; Low-latency bare-metal TCP socket server via direct Linux kernel syscalls.
;
; NOTE: Provided for systems curiosity and educational demonstration.
; It is intentionally stripped-down and NOT intended for production workloads.
; ==============================================================================
global _start

section .data
    msg_boot: db "[LazyStack] Assembly HTTP server listening on port ${port}...", 10
    msg_boot_len: equ $ - msg_boot

    response:
        db "HTTP/1.1 200 OK", 13, 10
        db "Content-Type: text/plain", 13, 10
        db "Content-Length: 47", 13, 10
        db "Connection: close", 13, 10, 13, 10
        db "Hello from LazyStack x86_64 Assembly Service!", 10
    response_len: equ $ - response

    sockaddr:
        dw 2                            ; sin_family: AF_INET
        dw ${(port >> 8) | ((port & 0xff) << 8)} ; sin_port
        dd 0                            ; sin_addr: INADDR_ANY
        dq 0                            ; sin_zero

section .bss
    server_fd: resq 1
    client_fd: resq 1
    recv_buf:  resb 1024

section .text
_start:
    mov rax, 1                  ; sys_write
    mov rdi, 1                  ; stdout
    mov rsi, msg_boot
    mov rdx, msg_boot_len
    syscall

    mov rax, 41                 ; sys_socket
    mov rdi, 2                  ; AF_INET
    mov rsi, 1                  ; SOCK_STREAM
    mov rdx, 0
    syscall
    mov [server_fd], rax

    mov rax, 49                 ; sys_bind
    mov rdi, [server_fd]
    mov rsi, sockaddr
    mov rdx, 16
    syscall

    mov rax, 50                 ; sys_listen
    mov rdi, [server_fd]
    mov rsi, 10
    syscall

loop_accept:
    mov rax, 43                 ; sys_accept
    mov rdi, [server_fd]
    xor rsi, rsi
    xor rdx, rdx
    syscall
    mov [client_fd], rax

    mov rax, 0                  ; sys_read
    mov rdi, [client_fd]
    mov rsi, recv_buf
    mov rdx, 1024
    syscall

    mov rax, 1                  ; sys_write
    mov rdi, [client_fd]
    mov rsi, response
    mov rdx, response_len
    syscall

    mov rax, 3                  ; sys_close
    mov rdi, [client_fd]
    syscall

    jmp loop_accept
`

    files['Makefile'] = `# Assembly Server Build (Experimental)
ASM=nasm
LD=ld
FLAGS=-f elf64

all: server

server.o: server.asm
	$(ASM) $(FLAGS) server.asm -o server.o

server: server.o
	$(LD) server.o -o server

release: server.o
	$(LD) -s server.o -o server

clean:
	rm -f server.o server
`
    files['README.md'] = `# Assembly (x86_64 NASM) Microservice [Experimental]

> **Disclaimer**: This bare-metal service is an educational / research template that issues raw Linux kernel system calls. It is designed for low-level systems exploration and binary size benchmarking, and is not recommended as a production web framework.

Runs on port **${port}**.
`
    return files
  }

  if (techId === 'cpp-drogon') {
    files['CMakeLists.txt'] = `cmake_minimum_required(VERSION 3.12)
project(drogon_service CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Drogon CONFIG REQUIRED)

add_executable(drogon_service main.cc)
target_link_libraries(drogon_service PRIVATE Drogon::Drogon)
`
    files['main.cc'] = `// LazyStack Drogon C++ Service
#include <drogon/drogon.h>
#include <iostream>

int main() {
    std::cout << "[LazyStack] Drogon C++ Service running on port ${port}..." << std::endl;

    drogon::app().registerHandler(
        "/",
        [](const drogon::HttpRequestPtr& req,
           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setBody("Hello from LazyStack C++ Drogon Framework!");
            callback(resp);
        },
        {drogon::Get}
    );

    drogon::app()
        .addListener("0.0.0.0", ${port})
        .setThreadNum(4)
        .run();

    return 0;
}
`
    return files
  }

  if (techId === 'haskell-scotty') {
    files['server.cabal'] = `cabal-version:      2.4
name:               server
version:            0.1.0.0
executable server
    main-is:          Main.hs
    build-depends:    base >= 4.14 && < 5, scotty, aeson, text
    hs-source-dirs:   .
    default-language: Haskell2010
`
    files['Main.hs'] = `{-# LANGUAGE OverloadedStrings #-}
module Main where

import Web.Scotty
import Data.Aeson (object, (.=))

main :: IO ()
main = do
  putStrLn "[LazyStack] Haskell Scotty service listening on :${port}..."
  scotty ${port} $ do
    get "/" $ do
      json $ object [ "service" .= ("${folderName}" :: String)
                    , "status"  .= ("online" :: String)
                    , "runtime" .= ("Haskell GHC / Warp" :: String)
                    ]
`
    return files
  }

  if (techId.startsWith('deno-')) {
    files['deno.json'] = `{
  "tasks": {
    "start": "deno run --allow-net --allow-read --allow-env main.ts",
    "dev": "deno run --watch --allow-net --allow-read --allow-env main.ts"
  }
}
`
    files['main.ts'] = `// LazyStack Deno 2.0 Native HTTP Server
const port = ${port};
console.log(\`[LazyStack] Deno service listening on http://0.0.0.0:\${port}\`);

Deno.serve({ port }, (req) => {
  return new Response(
    JSON.stringify({
      service: "${folderName}",
      runtime: "Deno 2.0",
      status: "online",
      url: req.url,
      timestamp: new Date().toISOString()
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
`
    return files
  }

  if (techId === 'vanilla-html-css-js') {
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${folderName} — LazyStack</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <h1>${folderName}</h1>
    <p>Vanilla HTML5 / CSS3 / JavaScript</p>
    <div id="status" class="badge">Static Frontend Online</div>
  </div>
  <script src="app.js"></script>
</body>
</html>
`
    files['style.css'] = `body {
  margin: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #09090b;
  color: #f4f4f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.card {
  padding: 2.5rem;
  background: #18181c;
  border: 1px solid #27272e;
  border-radius: 1rem;
  text-align: center;
}
.badge {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.25rem 0.75rem;
  background: #27272e;
  color: #38bdf8;
  border-radius: 9999px;
  font-size: 0.85rem;
}
`
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "serve . -p ${port}",
    "start": "serve . -p ${port}"
  },
  "devDependencies": {
    "serve": "^14.2.4"
  }
}
`
    files['app.js'] = `console.log("[LazyStack] ${folderName} Vanilla client loaded.");\n`
    files['README.md'] = `# ${folderName} (Vanilla HTML/CSS/JS)\n\n### Run Locally\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
    return files
  }

  if (techId === 'vanilla-php') {
    files['composer.json'] = `{
  "name": "lazystack/${folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}",
  "description": "${folderName} PHP Service",
  "type": "project",
  "require": {
    "php": ">=8.1"
  }
}
`
    files['index.php'] = `<?php
header('Content-Type: application/json');
echo json_encode([
    'service' => '${folderName}',
    'runtime' => 'PHP ' . phpversion(),
    'status' => 'online',
    'timestamp' => date('c')
]);
`
    files['README.md'] = `# ${folderName} (PHP Service)\n\n### Run Locally\n\`\`\`bash\nphp -S 0.0.0.0:${port} index.php\n\`\`\`\n`
    return files
  }

  if (techId === 'vanilla-go') {
    files['go.mod'] = `module ${folderName.toLowerCase().replace(/[^a-z0-9./-]/g, '-')}
go 1.22
`
    files['main.go'] = `package main
import ("encoding/json"; "log"; "net/http"; "os")
func main() {
  port := os.Getenv("PORT"); if port == "" { port = "${port}" }
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { w.Header().Set("Content-Type", "application/json"); _ = json.NewEncoder(w).Encode(map[string]string{"service":"${folderName}", "runtime":"Go net/http", "status":"online"}) })
  log.Fatal(http.ListenAndServe(":"+port, nil))
}
`
    files['README.md'] = `# ${folderName} (Vanilla Go)\n\nRun with \`go run .\`. Set \`PORT\` to override the default port ${port}.\n`
    return files
  }

  if (techId === 'vanilla-python') {
    files['main.py'] = `from http.server import BaseHTTPRequestHandler, HTTPServer
import json, os
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"service": "${folderName}", "runtime": "Python stdlib HTTP", "status": "online"}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
HTTPServer(("0.0.0.0", int(os.getenv("PORT", "${port}"))), Handler).serve_forever()
`
    files['README.md'] = `# ${folderName} (Vanilla Python)\n\nRun with \`python3 main.py\`. Set \`PORT\` to override the default port ${port}.\n`
    return files
  }

  if (techId === 'vanilla-java') {
    files['Main.java'] = `import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
public class Main {
  public static void main(String[] args) throws Exception {
    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "${port}"));
    var server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
    server.createContext("/", exchange -> { byte[] body = "{\\"service\\":\\"${folderName}\\",\\"runtime\\":\\"JDK HttpServer\\",\\"status\\":\\"online\\"}".getBytes(); exchange.getResponseHeaders().set("Content-Type", "application/json"); exchange.sendResponseHeaders(200, body.length); exchange.getResponseBody().write(body); exchange.close(); });
    server.start();
  }
}
`
    files['README.md'] = `# ${folderName} (Vanilla Java)\n\nBuild and run with \`javac Main.java && java Main\`. Set \`PORT\` to override the default port ${port}.\n`
    return files
  }

  if (techId === 'python-reflex') {
    files['requirements.txt'] = 'reflex\n'
    files['rxconfig.py'] = `import reflex as rx\n\nconfig = rx.Config(app_name="${folderName.replace(/[^a-zA-Z0-9_]/g, '_')}")\n`
    const appModule = folderName.replace(/[^a-zA-Z0-9_]/g, '_')
    files[`${appModule}/${appModule}.py`] = `import reflex as rx\n\nclass State(rx.State):\n    count: int = 0\n    def increment(self): self.count += 1\n\ndef index():\n    return rx.center(rx.vstack(rx.heading("${folderName}"), rx.text("Reflex Python full-stack starter"), rx.text(State.count), rx.button("Add", on_click=State.increment)), height="100vh")\n\napp = rx.App()\napp.add_page(index)\n`
    files['README.md'] = `# ${folderName} (Reflex)\n\nCreate a virtual environment, install \`requirements.txt\`, then run \`reflex run\`. Reflex serves the UI and Python backend. Docs: https://reflex.dev/docs/\n`
    return files
  }

  if (techId === 'python-nicegui') {
    files['requirements.txt'] = 'nicegui\n'
    files['main.py'] = `from nicegui import ui\n\nui.label("${folderName}").classes("text-2xl font-bold")\nui.label("NiceGUI Python web UI starter")\nui.run(host="0.0.0.0", port=${port}, title="${folderName}")\n`
    files['README.md'] = `# ${folderName} (NiceGUI)\n\nInstall with \`python3 -m pip install -r requirements.txt\`, then run \`python3 main.py\`. Open http://localhost:${port}. Docs: https://nicegui.io/documentation.\n`
    return files
  }

  if (techId === 'python-anvil') {
    files['README.md'] = `# ${folderName} (Anvil)\n\nThis is a hosted Anvil starter. Create or import the app in the Anvil editor at https://anvil.works/build, then add client UI and server modules there. Anvil provides browser-side Python, server-side Python, HTTP APIs, and optional built-in Data Tables. This generator does not claim a local Docker runtime for hosted Anvil apps.\n\nDocs: https://anvil.works/docs/overview\n`
    files['anvil-app-plan.md'] = `# App plan\n\n- Client form: Home\n- Client code: Python\n- Server module: API and business logic\n- Connect external services with Anvil HTTP APIs or server-side Python clients\n`
    return files
  }

  if (techId === 'kotlin-js') {
    files['settings.gradle.kts'] = `pluginManagement { repositories { gradlePluginPortal(); mavenCentral() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { mavenCentral() } }\nrootProject.name = "${folderName}"\n`
    files['build.gradle.kts'] = `plugins { kotlin("multiplatform") version "2.2.20" }\nkotlin { js { browser(); binaries.executable() } }\n`
    files['src/jsMain/kotlin/Main.kt'] = `import kotlinx.browser.document\n\nfun main() { document.body?.innerHTML = "<main style='font-family:sans-serif;padding:3rem'><h1>${folderName}</h1><p>Kotlin/JS browser frontend</p></main>" }\n`
    files['README.md'] = `# ${folderName} (Kotlin/JS)\n\nBuild the browser bundle with \`./gradlew jsBrowserDevelopmentWebpack\`. Serve the generated output under \`build/dist/js/developmentExecutable\`. Requires JDK and Gradle. Docs: https://kotlinlang.org/docs/js-get-started.html\n`
    return files
  }

  if (techId === 'swiftui-client') {
    files['Package.swift'] = `// swift-tools-version:5.9\nimport PackageDescription\n\nlet package = Package(name: "${folderName}", platforms: [.macOS(.v13), .iOS(.v16)], targets: [.target(name: "${folderName}")])\n`
    files['Sources/${folderName}/ContentView.swift'] = `import SwiftUI\n\nstruct ContentView: View {\n    var body: some View { VStack(spacing: 12) { Text("${folderName}").font(.largeTitle); Text("SwiftUI client starter") }.padding() }\n}\n`
    files['README.md'] = `# ${folderName} (SwiftUI)\n\nOpen this package in Xcode on macOS to select an iOS or macOS run destination. SwiftUI is a native Apple client UI and is not a browser frontend.\n`
    return files
  }

  if (techId === 'tauri-app') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^1.5.0"
  }
}
`
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${folderName}</title>
</head>
<body style="margin:0;display:flex;height:100vh;align-items:center;justify-content:center;background:#09090b;color:#fff;font-family:sans-serif;">
  <div style="border:1px solid #27272e;padding:2rem;border-radius:12px;background:#141418;text-align:center;">
    <h1 style="color:#22c55e;">Tauri Desktop App</h1>
    <p>${folderName} native shell is online</p>
  </div>
  <script src="/src/main.js"></script>
</body>
</html>
`
    files['src/main.js'] = `console.log('[LazyStack] Tauri webview initialized');\n`
    files['src-tauri/tauri.conf.json'] = `{
  "package": {
    "productName": "${folderName}",
    "version": "0.1.0"
  },
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "devPath": "../index.html",
    "distDir": "../"
  },
  "tauri": {
    "allowlist": {
      "all": false
    },
    "windows": [
      {
        "title": "${folderName}",
        "width": 1024,
        "height": 768
      }
    ]
  }
}
`
    files['src-tauri/Cargo.toml'] = `[package]
name = "${folderName.replace(/-/g, '_')}"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`
    files['src-tauri/src/main.rs'] = `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`
    files['.gitignore'] = `target\nnode_modules\n.env\n`
    files['README.md'] = `# ${folderName} (Tauri Desktop App)\n\n### Run in Development\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
    return files
  }

  if (techId === 'google-apps-script') {
    files['.clasp.json'] = `{\n  "scriptId": "YOUR_SCRIPT_ID_HERE",\n  "rootDir": "${isTS ? 'dist' : '.'}" \n}\n`
    files['.claspignore'] = `node_modules/\n*.lock\ntsconfig.json\n${isTS ? 'src/\n' : ''}README.md\n`
    if (isTS) {
      files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2019",
    "lib": ["ESNext"],
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["google-apps-script"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
`
      files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "description": "Google Apps Script automation — scaffolded by LazyStack",
  "scripts": {
    "build": "tsc",
    "push": "npm run build && clasp push",
    "open": "clasp open"
  },
  "devDependencies": {
    "@types/google-apps-script": "^1.0.0",
    "typescript": "^5.4.0",
    "@google/clasp": "^2.4.2"
  }
}
`
      files['src/Code.ts'] = `// Google Apps Script — ${folderName}
// Scaffolded by LazyStack | Docs: https://developers.google.com/apps-script

/**
 * Runs when the Google Sheet (or other bound document) is opened.
 * Add a custom menu to the spreadsheet UI.
 */
function onOpen(e: GoogleAppsScript.Events.SheetsOnOpen): void {
  SpreadsheetApp.getUi()
    .createMenu('${folderName}')
    .addItem('Run Sample', 'runSample')
    .addToUi();
}

/**
 * Sample function triggered from the custom menu.
 */
function runSample(): void {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const timestamp = new Date().toISOString();
  sheet.appendRow(['LazyStack', '${folderName}', timestamp]);
  SpreadsheetApp.getUi().alert('Row appended at ' + timestamp);
}

/**
 * HTTP GET handler — deploy as a Web App to enable this.
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ service: '${folderName}', status: 'ok', ts: new Date().toISOString() })
  ).setMimeType(ContentService.MimeType.JSON);
}
`
    } else {
      files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "description": "Google Apps Script automation — scaffolded by LazyStack",
  "scripts": {
    "push": "clasp push",
    "open": "clasp open"
  },
  "devDependencies": {
    "@google/clasp": "^2.4.2"
  }
}
`
      files['Code.js'] = `// Google Apps Script — ${folderName}
// Scaffolded by LazyStack | Docs: https://developers.google.com/apps-script

/**
 * Runs when the bound document (Sheets, Docs, etc.) is opened.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('${folderName}')
    .addItem('Run Sample', 'runSample')
    .addToUi();
}

/**
 * Sample function triggered from the custom menu.
 */
function runSample() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var timestamp = new Date().toISOString();
  sheet.appendRow(['LazyStack', '${folderName}', timestamp]);
  SpreadsheetApp.getUi().alert('Row appended at ' + timestamp);
}

/**
 * HTTP GET handler — deploy as a Web App to enable.
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ service: '${folderName}', status: 'ok', ts: new Date().toISOString() })
  ).setMimeType(ContentService.MimeType.JSON);
}
`
    }
    files['README.md'] = `# ${folderName} (Google Apps Script)

Scaffolded by LazyStack. Automates Google Workspace (Sheets, Docs, Drive, Gmail, etc.)
using ${isTS ? 'TypeScript (compiled to JS via tsc)' : 'JavaScript'} and pushed to Google with **clasp**.

## Quick start

\`\`\`bash
# 1. Install dependencies
${isTS ? 'npm install\n\n# 2. Log in to clasp\nnpx clasp login\n\n# 3. Create or link a script project\nnpx clasp create --type standalone --title "${folderName}"\n# or link an existing project:\n# npx clasp clone <SCRIPT_ID>\n\n# 4. Build TypeScript and push\nnpm run push' : '# Install clasp globally if needed\nnpm install\n\n# Log in\nnpx clasp login\n\n# Create or link a script project\nnpx clasp create --type standalone --title "${folderName}"\n# or: npx clasp clone <SCRIPT_ID>\n\n# Push to Google\nnpm run push'}
\`\`\`

## Resources

- Clasp docs: https://github.com/google/clasp
- Apps Script reference: https://developers.google.com/apps-script/reference
- Deploy as Web App: https://developers.google.com/apps-script/guides/web
`
    return files
  }

  if (techId === 'assemblyscript') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "description": "AssemblyScript WebAssembly module — scaffolded by LazyStack",
  "main": "index.js",
  "types": "index.d.ts",
  "scripts": {
    "asbuild:debug": "asc assembly/index.ts --target debug",
    "asbuild:release": "asc assembly/index.ts --target release",
    "asbuild": "npm run asbuild:debug && npm run asbuild:release",
    "build": "npm run asbuild",
    "start": "node index.js",
    "test": "node tests/index.js"
  },
  "devDependencies": {
    "assemblyscript": "^0.27.36"
  },
  "dependencies": {
    "@assemblyscript/loader": "^0.27.36"
  }
}
`
    files['asconfig.json'] = `{
  "targets": {
    "debug": {
      "outFile": "build/debug.wasm",
      "textFile": "build/debug.wat",
      "sourceMap": true,
      "debug": true
    },
    "release": {
      "outFile": "build/release.wasm",
      "textFile": "build/release.wat",
      "sourceMap": true,
      "optimizeLevel": 3,
      "shrinkLevel": 0,
      "converge": false,
      "noAssert": false
    }
  },
  "options": {
    "bindings": "esm"
  }
}
`
    files['assembly/tsconfig.json'] = `{
  "extends": "assemblyscript/std/assembly.json",
  "include": [
    "./**/*.ts"
  ]
}
`
    files['assembly/index.ts'] = `// AssemblyScript WebAssembly Module — ${folderName}
// Docs: https://www.assemblyscript.org

/**
 * Adds two 32-bit signed integers.
 */
export function add(a: i32, b: i32): i32 {
  return a + b;
}

/**
 * Computes the nth Fibonacci number in WebAssembly.
 */
export function fibonacci(n: i32): i32 {
  if (n <= 1) return n;
  let a: i32 = 0;
  let b: i32 = 1;
  for (let i: i32 = 2; i <= n; i++) {
    let c: i32 = a + b;
    a = b;
    b = c;
  }
  return b;
}
`
    files['index.js'] = `import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(__dirname, 'build', 'release.wasm');

async function main() {
  if (!fs.existsSync(wasmPath)) {
    console.log('⚡ WebAssembly binary not found. Please compile with:');
    console.log('   npm install && npm run asbuild\\n');
    return;
  }

  try {
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.instantiate(wasmBuffer, {});
    const { add, fibonacci } = wasmModule.instance.exports;

    console.log('⚡ AssemblyScript WebAssembly module loaded successfully:');
    console.log('   add(25, 17)      =', add(25, 17));
    console.log('   fibonacci(10)    =', fibonacci(10));
    console.log('   fibonacci(20)    =', fibonacci(20));
  } catch (err) {
    console.error('Error running WebAssembly module:', err);
  }
}

main();
`
    files['tests/index.js'] = `import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(__dirname, '..', 'build', 'debug.wasm');

if (!fs.existsSync(wasmPath)) {
  console.log('Debug wasm not found. Run "npm run asbuild:debug" first.');
  process.exit(1);
}

const wasmBuffer = fs.readFileSync(wasmPath);
const wasmModule = await WebAssembly.instantiate(wasmBuffer, {});
const { add, fibonacci } = wasmModule.instance.exports;

assert.strictEqual(add(1, 2), 3);
assert.strictEqual(fibonacci(7), 13);
console.log('✓ All AssemblyScript WebAssembly unit tests passed!');
`
    files['.gitignore'] = `node_modules/
build/
.env
`
    files['README.md'] = `# ${folderName} (AssemblyScript / WebAssembly)

Scaffolded by LazyStack. AssemblyScript compiles strictly typed TypeScript directly to high-performance **WebAssembly (Wasm)** binaries.

## Getting Started

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Compile to WebAssembly (builds build/release.wasm and build/debug.wasm)
npm run asbuild

# 3. Run the Node.js Wasm executor
npm start

# 4. Run tests
npm test
\`\`\`

## Project Structure

- \`assembly/index.ts\`: WebAssembly module source code (AssemblyScript)
- \`asconfig.json\`: AssemblyScript compiler configuration
- \`index.js\`: Node.js loader and executor for the compiled \`.wasm\` binary
- \`tests/index.js\`: Unit tests asserting WebAssembly exported functions

## Documentation

- AssemblyScript Documentation: https://www.assemblyscript.org
- WebAssembly MDN: https://developer.mozilla.org/en-US/docs/WebAssembly
`
    return files
  }

  if (techId === 'react-native-expo') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.3",
    "react-native-safe-area-context": "4.10.1",
    "react-native-screens": "3.31.1"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    ${isTS ? '"@types/react": "~18.2.0",\n    "@types/react-native": "~0.73.0",\n    "typescript": "~5.3.3",' : ''}
    "@expo/metro-config": "~0.18.0"
  }
}
`
    if (isTS) {
      files['tsconfig.json'] = `{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
`
    }
    files['app.json'] = `{
  "expo": {
    "name": "${folderName}",
    "slug": "${folderName}",
    "version": "1.0.0",
    "scheme": "${folderName.replace(/-/g, '')}",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#09090b"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": ${isTS ? 'true' : 'false'}
    },
    "android": {
      "package": "com.lazystack.${folderName.replace(/-/g, '')}"
    },
    "ios": {
      "bundleIdentifier": "com.lazystack.${folderName.replace(/-/g, '')}"
    },
    "web": {
      "bundler": "metro"
    }
  }
}
`
    files[`app/_layout.${isTS ? 'tsx' : 'jsx'}`] = `import { Stack } from 'expo-router'${isTS ? "\nimport { StatusBar } from 'expo-status-bar'" : "\nimport { StatusBar } from 'expo-status-bar'"}\n\nexport default function RootLayout() {\n  return (\n    <>\n      <Stack screenOptions={{ headerStyle: { backgroundColor: '#09090b' }, headerTintColor: '#fff', contentStyle: { backgroundColor: '#09090b' } }} />\n      <StatusBar style="light" />\n    </>\n  )\n}\n`
    files[`app/index.${isTS ? 'tsx' : 'jsx'}`] = `import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'\nimport { Link } from 'expo-router'\n\nexport default function HomeScreen() {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>${folderName}</Text>\n      <Text style={styles.sub}>React Native + Expo — scaffolded by LazyStack</Text>\n      <Link href="/about" asChild>\n        <TouchableOpacity style={styles.btn}>\n          <Text style={styles.btnText}>Go to About →</Text>\n        </TouchableOpacity>\n      </Link>\n    </View>\n  )\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center', padding: 24 },\n  title: { fontSize: 28, fontWeight: '700', color: '#f4f4f5', marginBottom: 8 },\n  sub: { fontSize: 14, color: '#71717a', marginBottom: 32, textAlign: 'center' },\n  btn: { backgroundColor: '#27272a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46' },\n  btnText: { color: '#e4e4e7', fontWeight: '600' },\n})\n`
    files[`app/about.${isTS ? 'tsx' : 'jsx'}`] = `import { View, Text, StyleSheet } from 'react-native'\n\nexport default function AboutScreen() {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>About</Text>\n      <Text style={styles.body}>${folderName} is a cross-platform React Native app built with Expo Router.</Text>\n    </View>\n  )\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, backgroundColor: '#09090b', padding: 24, paddingTop: 48 },\n  title: { fontSize: 22, fontWeight: '700', color: '#f4f4f5', marginBottom: 12 },\n  body: { fontSize: 15, color: '#a1a1aa', lineHeight: 22 },\n})\n`
    files['babel.config.js'] = `module.exports = function (api) {\n  api.cache(true);\n  return { presets: ['babel-preset-expo'] };\n};\n`
    files['.gitignore'] = `node_modules/\n.expo/\ndist/\nweb-build/\n*.jks\n*.p8\n*.p12\n*.key\n*.mobileprovision\n*.orig.*\n`
    files['README.md'] = `# ${folderName} (React Native + Expo)

Cross-platform iOS, Android, and Web app scaffolded by LazyStack using **Expo Router** (file-based routing).

## Quick start

\`\`\`bash
npm install
npm start        # Expo dev server + QR code
npm run android  # Android emulator / device
npm run ios      # iOS simulator (macOS + Xcode)
npm run web      # Browser (Metro + React DOM)
\`\`\`

Scan the QR code with the **Expo Go** app on your device, or press \`a\` / \`i\` / \`w\` in the terminal.

## Screens

- \`app/index.${isTS ? 'tsx' : 'jsx'}\` — Home screen
- \`app/about.${isTS ? 'tsx' : 'jsx'}\` — About screen
- \`app/_layout.${isTS ? 'tsx' : 'jsx'}\` — Root layout (Stack navigator)

## Resources

- Expo docs: https://docs.expo.dev/
- Expo Router: https://expo.github.io/router/docs
- React Native docs: https://reactnative.dev/
`
    return files
  }

  if (techId === 'python-fastapi') {
    if (starterProfile === 'api-service') {
      files['main.py'] = `from app.main import app\n\n__all__ = ["app"]\n`
      files['app/__init__.py'] = ''
      files['app/database.py'] = `import os\nfrom sqlalchemy import create_engine\nfrom sqlalchemy.orm import DeclarativeBase, sessionmaker\n\nurl = os.getenv("DATABASE_URL", "sqlite:///./data.db")\nif url.startswith(("postgresql://", "postgres://")):\n    url = url.replace("postgres://", "postgresql+psycopg2://", 1).replace("postgresql://", "postgresql+psycopg2://", 1)\nelif url.startswith(("mysql://", "mariadb://")):\n    url = url.replace("mariadb://", "mysql+pymysql://", 1).replace("mysql://", "mysql+pymysql://", 1)\nelif not url.startswith("sqlite:"):\n    raise RuntimeError("API service profile supports SQLite, PostgreSQL, MySQL, or MariaDB. Check DATABASE_URL.")\nengine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite:") else {})\nSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)\n\nclass Base(DeclarativeBase):\n    pass\n\ndef get_db():\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()\n`
      files['app/models.py'] = `from datetime import datetime\nfrom sqlalchemy import Boolean, DateTime, String, Text, func\nfrom sqlalchemy.orm import Mapped, mapped_column\nfrom .database import Base\n\nclass Item(Base):\n    __tablename__ = "items"\n    id: Mapped[int] = mapped_column(primary_key=True)\n    title: Mapped[str] = mapped_column(String(160), index=True)\n    description: Mapped[str | None] = mapped_column(Text, nullable=True)\n    completed: Mapped[bool] = mapped_column(Boolean, default=False)\n    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())\n`
      files['app/schemas.py'] = `from datetime import datetime\nfrom pydantic import BaseModel, ConfigDict, Field\n\nclass ItemCreate(BaseModel):\n    title: str = Field(min_length=1, max_length=160)\n    description: str | None = None\n\nclass ItemUpdate(BaseModel):\n    title: str | None = Field(default=None, min_length=1, max_length=160)\n    description: str | None = None\n    completed: bool | None = None\n\nclass ItemRead(BaseModel):\n    model_config = ConfigDict(from_attributes=True)\n    id: int\n    title: str\n    description: str | None\n    completed: bool\n    created_at: datetime\n`
      files['app/auth.py'] = `import os\nimport secrets\nfrom fastapi import Depends, HTTPException, status\nfrom fastapi.security import HTTPAuthorizationCredentials, HTTPBearer\n\nbearer = HTTPBearer(auto_error=False)\n\ndef require_api_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> None:\n    expected = os.getenv("API_TOKEN", "local-dev-token-change-me")\n    if not credentials or not secrets.compare_digest(credentials.credentials, expected):\n        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing bearer token", headers={"WWW-Authenticate": "Bearer"})\n`
      files['app/routes.py'] = `from fastapi import APIRouter, Depends, HTTPException, Response, status\nfrom sqlalchemy.orm import Session\nfrom .auth import require_api_token\nfrom .database import get_db\nfrom .models import Item\nfrom .schemas import ItemCreate, ItemRead, ItemUpdate\n\nrouter = APIRouter(prefix="/items", tags=["items"], dependencies=[Depends(require_api_token)])\n\n@router.get("", response_model=list[ItemRead])\ndef list_items(db: Session = Depends(get_db)):\n    return db.query(Item).order_by(Item.id).all()\n\n@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)\ndef create_item(data: ItemCreate, db: Session = Depends(get_db)):\n    item = Item(**data.model_dump())\n    db.add(item)\n    db.commit()\n    db.refresh(item)\n    return item\n\n@router.get("/{item_id}", response_model=ItemRead)\ndef get_item(item_id: int, db: Session = Depends(get_db)):\n    item = db.get(Item, item_id)\n    if item is None:\n        raise HTTPException(status_code=404, detail="Item not found")\n    return item\n\n@router.patch("/{item_id}", response_model=ItemRead)\ndef update_item(item_id: int, data: ItemUpdate, db: Session = Depends(get_db)):\n    item = db.get(Item, item_id)\n    if item is None:\n        raise HTTPException(status_code=404, detail="Item not found")\n    for field, value in data.model_dump(exclude_unset=True).items():\n        setattr(item, field, value)\n    db.commit()\n    db.refresh(item)\n    return item\n\n@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)\ndef delete_item(item_id: int, db: Session = Depends(get_db)):\n    item = db.get(Item, item_id)\n    if item is None:\n        raise HTTPException(status_code=404, detail="Item not found")\n    db.delete(item)\n    db.commit()\n    return Response(status_code=status.HTTP_204_NO_CONTENT)\n`
      files['app/main.py'] = `from fastapi import FastAPI\nfrom .routes import router as items_router\n\napp = FastAPI(title="${folderName}", version="0.1.0", description="CRUD API starter. See README for auth and migration steps.")\napp.include_router(items_router, prefix="/api")\n\n@app.get("/")\ndef root():\n    return {"service": "${folderName}", "profile": "api-service", "docs": "/docs"}\n\n@app.get("/health")\ndef health():\n    return {"status": "healthy"}\n`
      files['alembic.ini'] = `[alembic]\nscript_location = migrations\nprepend_sys_path = .\nsqlalchemy.url = sqlite:///./data.db\n\n[loggers]\nkeys = root,sqlalchemy,alembic\n[handlers]\nkeys = console\n[formatters]\nkeys = generic\n[logger_root]\nlevel = WARN\nhandlers = console\nqualname =\n[logger_sqlalchemy]\nlevel = WARN\nhandlers =\nqualname = sqlalchemy.engine\n[logger_alembic]\nlevel = INFO\nhandlers = console\nqualname = alembic\n[handler_console]\nclass = StreamHandler\nargs = (sys.stderr,)\nlevel = NOTSET\nformatter = generic\n[formatter_generic]\nformat = %(levelname)-5.5s [%(name)s] %(message)s\ndatefmt = %H:%M:%S\n`
      files['migrations/env.py'] = `from alembic import context\nfrom app.database import Base, engine\nfrom app import models  # noqa: F401 - register mapped models\n\nconfig = context.config\ntarget_metadata = Base.metadata\nconfig.set_main_option("sqlalchemy.url", str(engine.url).replace("%", "%%"))\n\ndef run_migrations_offline():\n    context.configure(url=str(engine.url), target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})\n    with context.begin_transaction():\n        context.run_migrations()\n\ndef run_migrations_online():\n    with engine.connect() as connection:\n        context.configure(connection=connection, target_metadata=target_metadata)\n        with context.begin_transaction():\n            context.run_migrations()\n\nif context.is_offline_mode():\n    run_migrations_offline()\nelse:\n    run_migrations_online()\n`
      files['migrations/versions/0001_create_items.py'] = `from alembic import op\nimport sqlalchemy as sa\n\nrevision = "0001_items"\ndown_revision = None\nbranch_labels = None\ndepends_on = None\n\ndef upgrade():\n    op.create_table(\n        "items",\n        sa.Column("id", sa.Integer(), primary_key=True),\n        sa.Column("title", sa.String(length=160), nullable=False),\n        sa.Column("description", sa.Text(), nullable=True),\n        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),\n        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),\n    )\n    op.create_index("ix_items_title", "items", ["title"])\n\ndef downgrade():\n    op.drop_index("ix_items_title", table_name="items")\n    op.drop_table("items")\n`
      files['tests/test_api.py'] = `import os\nimport pytest\nfrom fastapi.testclient import TestClient\nfrom sqlalchemy import create_engine\nfrom sqlalchemy.orm import sessionmaker\nfrom sqlalchemy.pool import StaticPool\nfrom app.database import Base, get_db\nfrom app.main import app\n\n@pytest.fixture\ndef client(monkeypatch):\n    monkeypatch.setenv("API_TOKEN", "test-token")\n    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)\n    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)\n    Base.metadata.create_all(bind=engine)\n    def override_get_db():\n        db = TestSession()\n        try:\n            yield db\n        finally:\n            db.close()\n    app.dependency_overrides[get_db] = override_get_db\n    with TestClient(app) as test_client:\n        yield test_client\n    app.dependency_overrides.clear()\n    Base.metadata.drop_all(bind=engine)\n    engine.dispose()\n\ndef auth():\n    return {"Authorization": "Bearer test-token"}\n\ndef test_auth_is_required(client):\n    assert client.get("/api/items").status_code == 401\n\ndef test_item_crud(client):\n    created = client.post("/api/items", headers=auth(), json={"title": "First task"})\n    assert created.status_code == 201\n    item_id = created.json()["id"]\n    assert client.get(f"/api/items/{item_id}", headers=auth()).json()["title"] == "First task"\n    updated = client.patch(f"/api/items/{item_id}", headers=auth(), json={"completed": True})\n    assert updated.json()["completed"] is True\n    assert client.delete(f"/api/items/{item_id}", headers=auth()).status_code == 204\n`
      files['requirements.txt'] = `fastapi>=0.115.0,<0.116\nuvicorn[standard]>=0.29.0,<1\npydantic>=2.6,<3\nSQLAlchemy>=2.0,<3\nalembic>=1.13,<2\npsycopg2-binary>=2.9\nPyMySQL>=1.1\npytest>=8.0,<9\nhttpx>=0.27,<0.29\n`
      files['README.md'] = `# ${folderName} · FastAPI API service\n\nThis starter includes a SQLAlchemy Item model, validated CRUD API, bearer-token protection, an Alembic migration, and API tests. The token is a local development default; set \`API_TOKEN\` before sharing or deploying.\n\n## Run locally\n\n\`\`\`bash\npython -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\nalembic upgrade head\nuvicorn main:app --reload --port ${port}\n\`\`\`\n\nSet \`DATABASE_URL\` to SQLite, PostgreSQL, MySQL, or MariaDB. If unset, the app uses \`./data.db\`. Run tests with \`pytest\`. OpenAPI docs are at \`/docs\`; CRUD routes are under \`/api/items\` and require \`Authorization: Bearer $API_TOKEN\`.\n`
      return files
    }
    files['main.py'] = `# LazyStack Python Service
from fastapi import FastAPI

app = FastAPI(title="${folderName}")

@app.get("/")
def read_root():
    return {
        "service": "${folderName}",
        "status": "online",
        "tech": "${techId}",
        "message": "Welcome to LazyStack Python Service"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
`
    files['requirements.txt'] = `fastapi>=0.110.0\nuvicorn>=0.29.0\n`
    return files
  }

  if (techId === 'go-echo') {
    files['main.go'] = `package main

import (
	"net/http"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"service": "${folderName}",
			"framework": "Echo",
			"status": "online",
		})
	})

	e.Logger.Fatal(e.Start(":${port}"))
}
`
    files['go.mod'] = `module ${folderName}

go 1.23

require github.com/labstack/echo/v4 v4.12.0
`
    return files
  }

  if (techId === 'go-chi') {
    files['main.go'] = `package main

import (
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(\`{"service":"${folderName}","framework":"Chi Router","status":"online"}\`))
	})

	http.ListenAndServe(":${port}", r)
}
`
    files['go.mod'] = `module ${folderName}

go 1.23

require github.com/go-chi/chi/v5 v5.1.0
`
    return files
  }

  if (techId.startsWith('go-')) {
    files['main.go'] = `package main

import (
	"fmt"
	"net/http"
)

func main() {
	port := "${port}"
	fmt.Printf("[LazyStack] Go service listening on :%s...\\n", port)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, \`{"service":"%s","status":"online","port":"%s"}\`, "${folderName}", port)
	})

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		panic(err)
	}
}
`
    files['go.mod'] = `module ${folderName}

go 1.23
`
    return files
  }

  if (techId === 'java-springboot') {
    files['pom.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>
    <groupId>com.lazystack</groupId>
    <artifactId>${folderName}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${folderName}</name>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`
    files['src/main/resources/application.properties'] = `server.port=${port}\n`
    files['src/main/java/com/lazystack/Application.java'] = `package com.lazystack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@SpringBootApplication
@RestController
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping("/")
    public Map<String, Object> index() {
        return Map.of(
            "service", "${folderName}",
            "framework", "Spring Boot 3",
            "status", "online"
        );
    }
}
`
    return files
  }

  if (techId === 'elixir-phoenix') {
    files['mix.exs'] = `defmodule ${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.MixProject do
  use Mix.Project

  def project do
    [
      app: :${folderName.replace(/-/g, '_')},
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.Application, []}
    ]
  end

  defp deps do
    [
      {:plug_cowboy, "~> 2.7"},
      {:jason, "~> 1.4"}
    ]
  end
end
`
    files['lib/application.ex'] = `defmodule ${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Plug.Cowboy, scheme: :http, plug: ${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.Router, options: [port: ${port}]}
    ]

    opts = [strategy: :one_for_one, name: ${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
`
    files['lib/router.ex'] = `defmodule ${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.Router do
  use Plug.Router

  plug :match
  plug :dispatch

  get "/" do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, Jason.encode!(%{service: "${folderName}", framework: "Phoenix/Plug", status: "online"}))
  end

  match _ do
    send_resp(conn, 404, "Not Found")
  end
end
`
    return files
  }

  if (techId === 'fullstack-nuxt') {
    files['package.json'] = `{
  "name": "${folderName}",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev --port ${port}",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "devDependencies": {
    "nuxt": "^3.13.0",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0"
  }
}
`
    files['nuxt.config.ts'] = `// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})
`
    files['app.vue'] = `<template>
  <div style="font-family: sans-serif; display: grid; place-items: center; min-height: 100vh; background: #09090b; color: #fff;">
    <div style="text-align: center; border: 1px solid #27272e; padding: 2rem; border-radius: 12px; background: #141418;">
      <h1 style="color: #10b981;">Nuxt 3 Fullstack</h1>
      <p>${folderName} is online</p>
    </div>
  </div>
</template>
`
    return files
  }

  if (techId === 'fullstack-sveltekit') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite dev --port ${port}",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "svelte": "^4.2.7",
    "vite": "^5.0.3"
  },
  "type": "module"
}
`
    files['svelte.config.js'] = `import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter()
  }
};

export default config;
`
    files['vite.config.js'] = `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
`
    files['src/routes/+page.svelte'] = `<script>
  let service = '${folderName}';
</script>

<main style="display: flex; height: 100vh; align-items: center; justify-content: center; background: #09090b; color: #fff; font-family: sans-serif;">
  <div style="border: 1px solid #27272e; padding: 2rem; border-radius: 12px; background: #141418; text-align: center;">
    <h1 style="color: #f97316;">SvelteKit App</h1>
    <p>{service} running on SvelteKit</p>
  </div>
</main>
`
    return files
  }

  if (techId === 'fullstack-remix') {
    files['package.json'] = `{
  "name": "${folderName}",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "scripts": {
    "build": "remix vite:build",
    "dev": "remix vite:dev --port ${port}",
    "start": "remix-serve ./build/server/index.js"
  },
  "dependencies": {
    "@remix-run/node": "^2.12.0",
    "@remix-run/react": "^2.12.0",
    "@remix-run/serve": "^2.12.0",
    "isbot": "^4.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@remix-run/dev": "^2.12.0",
    "@types/react": "^18.2.20",
    "@types/react-dom": "^18.2.7",
    "typescript": "^5.1.0",
    "vite": "^5.1.0",
    "vite-tsconfig-paths": "^4.2.1"
  }
}
`
    files['vite.config.ts'] = `import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix(),
    tsconfigPaths(),
  ],
});
`
    files['app/root.tsx'] = `import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0, background: '#09090b', color: '#fff', fontFamily: 'sans-serif' }}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
`
    files['app/routes/_index.tsx'] = `export default function Index() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ border: '1px solid #27272e', padding: '2rem', borderRadius: '12px', background: '#141418', textAlign: 'center' }}>
        <h1 style={{ color: '#38bdf8' }}>Remix / React Router</h1>
        <p>${folderName} fullstack app is ready</p>
      </div>
    </div>
  );
}
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // C# / .NET
  // ═══════════════════════════════════════════════════════
  if (techId === 'csharp-aspnet') {
    files[`${folderName}.csproj`] = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
`
    files['Program.cs'] = `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => new {
    service = "${folderName}",
    framework = "ASP.NET Core",
    status = "online",
    runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run("http://0.0.0.0:${port}");
`
    files['appsettings.json'] = `{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "AllowedHosts": "*"
}
`
    files['Properties/launchSettings.json'] = `{
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "http://localhost:${port}",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
`
    files['.gitignore'] = `bin/\nobj/\n*.user\n*.suo\n`
    files['README.md'] = `# ${folderName} (ASP.NET Core)

### Run Locally
\`\`\`bash
dotnet run
\`\`\`
`
    return files
  }

  if (techId === 'csharp-blazor') {
    files[`${folderName}.csproj`] = `<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" Version="9.0.0" />
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer" Version="9.0.0" PrivateAssets="all" />
  </ItemGroup>
</Project>
`
    files['Program.cs'] = `using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

await builder.Build().RunAsync();
`
    files['App.razor'] = `<h1>${folderName}</h1>
<p>Blazor WebAssembly is online.</p>
`
    files['wwwroot/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${folderName}</title>
  <base href="/" />
</head>
<body>
  <div id="app">Loading...</div>
  <script src="_framework/blazor.webassembly.js"></script>
</body>
</html>
`
    files['Properties/launchSettings.json'] = `{
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "applicationUrl": "http://localhost:${port}",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
`
    files['.gitignore'] = `bin/\nobj/\n`
    files['README.md'] = `# ${folderName} (Blazor WASM)

### Run Locally
\`\`\`bash
dotnet run
\`\`\`
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Rust
  // ═══════════════════════════════════════════════════════
  if (techId === 'rust-actix') {
    files['Cargo.toml'] = `[package]
name = "${folderName.replace(/-/g, '_')}"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
`
    files['src/main.rs'] = `use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use serde::Serialize;

#[derive(Serialize)]
struct Status {
    service: String,
    framework: String,
    status: String,
}

async fn index() -> impl Responder {
    HttpResponse::Ok().json(Status {
        service: "${folderName}".into(),
        framework: "Actix-Web 4".into(),
        status: "online".into(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("[LazyStack] ${folderName} (Actix-Web) listening on :${port}");
    HttpServer::new(|| App::new().route("/", web::get().to(index)))
        .bind(("0.0.0.0", ${port}))?
        .run()
        .await
}
`
    return files
  }

  if (techId === 'rust-axum') {
    files['Cargo.toml'] = `[package]
name = "${folderName.replace(/-/g, '_')}"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
`
    files['src/main.rs'] = `use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct Status {
    service: String,
    framework: String,
    status: String,
}

async fn index() -> Json<Status> {
    Json(Status {
        service: "${folderName}".into(),
        framework: "Axum 0.7".into(),
        status: "online".into(),
    })
}

#[tokio::main]
async fn main() {
    println!("[LazyStack] ${folderName} (Axum) listening on :${port}");
    let app = Router::new().route("/", get(index));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:${port}").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Kotlin
  // ═══════════════════════════════════════════════════════
  if (techId === 'kotlin-ktor') {
files['build.gradle.kts'] = `plugins {
    application
    kotlin("jvm") version "2.0.0"
    id("io.ktor.plugin") version "2.3.12"
    kotlin("plugin.serialization") version "2.0.0"
}

group = "com.lazystack"
version = "0.0.1"

application {
    mainClass.set("com.lazystack.ApplicationKt")
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")
    implementation("ch.qos.logback:logback-classic:1.4.14")
}
`
    files['src/main/kotlin/com/lazystack/Application.kt'] = `package com.lazystack

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.plugins.contentnegotiation.*

fun main() {
    embeddedServer(Netty, port = ${port}, host = "0.0.0.0") {
        install(ContentNegotiation) { json() }
        routing {
            get("/") {
                call.respond(mapOf(
                    "service" to "${folderName}",
                    "framework" to "Ktor",
                    "status" to "online"
                ))
            }
        }
    }.start(wait = true)
}
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Ruby on Rails
  // ═══════════════════════════════════════════════════════
  if (techId === 'ruby-rails') {
    files['Gemfile'] = `source "https://rubygems.org"
ruby ">= 3.2.0"

gem "rails", "~> 7.2"
gem "puma", ">= 5.0"
`
    files['config/boot.rb'] = `ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)
require "bundler/setup" if File.exist?(ENV["BUNDLE_GEMFILE"])
`
    files['config/environment.rb'] = `require_relative "application"
Rails.application.initialize!
`
    files['config.ru'] = `require_relative "config/environment"
run Rails.application
Rails.application.load_server
`
    files['config/application.rb'] = `require_relative "boot"
require "rails/all"

module ${folderName.replace(/-/g, '_').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}
  class Application < Rails::Application
    config.api_only = true
  end
end
`
    files['config/routes.rb'] = `Rails.application.routes.draw do
  root "health#index"
  get "health", to: "health#show"
end
`
    files['app/controllers/application_controller.rb'] = `class ApplicationController < ActionController::API
end
`
    files['app/controllers/health_controller.rb'] = `class HealthController < ApplicationController
  def index
    render json: { service: "${folderName}", framework: "Ruby on Rails 7", status: "online" }
  end

  def show
    render json: { status: "healthy" }
  end
end
`
    files['.gitignore'] = `/.bundle\n/vendor/bundle\n/log/*\n/tmp/*\n.env\n`
    files['README.md'] = `# ${folderName} (Ruby on Rails)\n\n### Run Locally\n\`\`\`bash\nbundle install\nbundle exec rails server -p ${port}\n\`\`\`\n`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Next.js (Fullstack)
  // ═══════════════════════════════════════════════════════
  if (techId === 'fullstack-nextjs') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p ${port}",
    "build": "next build",
    "start": "next start -p ${port}"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
`
    files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`
    files['src/app/layout.tsx'] = `export const metadata = { title: '${folderName}' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fff', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
`
    files['src/app/page.tsx'] = `export default function Home() {
  return (
    <main style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ border: '1px solid #27272e', padding: '2rem', borderRadius: '12px', background: '#141418', textAlign: 'center' }}>
        <h1 style={{ color: '#10b981' }}>Next.js 15</h1>
        <p>${folderName} fullstack app is online</p>
      </div>
    </main>
  );
}
`
    files['src/app/api/health/route.ts'] = `export async function GET() {
  return Response.json({ service: "${folderName}", framework: "Next.js 15", status: "online" });
}
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Astro (Fullstack)
  // ═══════════════════════════════════════════════════════
  if (techId === 'fullstack-astro') {
    files['package.json'] = `{
  "name": "${folderName}",
  "type": "module",
  "scripts": {
    "dev": "astro dev --port ${port}",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.15.0"
  }
}
`
    files['astro.config.mjs'] = `import { defineConfig } from 'astro/config';
export default defineConfig({});
`
    files['src/pages/index.astro'] = `---
const title = "${folderName}";
---
<html lang="en">
<head><meta charset="utf-8" /><title>{title}</title></head>
<body style="margin:0;display:flex;height:100vh;align-items:center;justify-content:center;background:#09090b;color:#fff;font-family:sans-serif;">
  <div style="border:1px solid #27272e;padding:2rem;border-radius:12px;background:#141418;text-align:center;">
    <h1 style="color:#a78bfa;">Astro 5</h1>
    <p>{title} is online</p>
  </div>
</body>
</html>
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Laravel (Fullstack PHP)
  // ═══════════════════════════════════════════════════════
  if (techId === 'fullstack-laravel') {
    files['composer.json'] = `{
  "name": "lazystack/${folderName}",
  "type": "project",
  "require": {
    "php": "^8.2",
    "laravel/framework": "^11.0"
  },
  "autoload": {
    "psr-4": { "App\\\\": "app/" }
  },
  "scripts": {
    "post-autoload-dump": [ "@php artisan package:discover --ansi" ]
  }
}
`
    files['artisan'] = `#!/usr/bin/env php
<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$status = $kernel->handle($input = new Symfony\\Component\\Console\\Input\\ArgvInput, new Symfony\\Component\\Console\\Output\\ConsoleOutput);
$kernel->terminate($input, $status);
exit($status);
`
    files['routes/api.php'] = `<?php
use Illuminate\\Support\\Facades\\Route;

Route::get('/', function () {
    return response()->json([
        'service' => '${folderName}',
        'framework' => 'Laravel 11',
        'status' => 'online',
        'php' => phpversion()
    ]);
});

Route::get('/health', function () {
    return response()->json(['status' => 'healthy']);
});
`
    files['bootstrap/app.php'] = `<?php

use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
    })
    ->withExceptions(function (Exceptions $exceptions) {
    })->create();
`
    files['routes/console.php'] = `<?php\n`
    files['public/index.php'] = `<?php

use Illuminate\\Http\\Request;

define('LARAVEL_START', microtime(true));

if (file_exists(__DIR__.'/../vendor/autoload.php')) {
    require __DIR__.'/../vendor/autoload.php';
    (require_once __DIR__.'/../bootstrap/app.php')->handleRequest(Request::capture());
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'service' => '${folderName}',
        'framework' => 'Laravel 11',
        'status' => 'online',
        'hint' => 'Run composer install to load vendor dependencies'
    ]);
}
`
    files['.gitignore'] = `/vendor\n.env\n.env.backup\n/storage/*.key\n`
    files['README.md'] = `# ${folderName} (Laravel 11)\n\n### Run in Development\n\`\`\`bash\ncomposer install\nphp artisan key:generate\nphp artisan serve --port ${port}\n\`\`\`\n`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Python — Django (override generic python- handler)
  // ═══════════════════════════════════════════════════════
  if (techId === 'python-django') {
    files['manage.py'] = `#!/usr/bin/env python
import os, sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', '${folderName.replace(/-/g, '_')}.settings')
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
`
    files[`${folderName.replace(/-/g, '_')}/settings.py`] = `import os
SECRET_KEY = 'dev-secret-change-me'
DEBUG = True
ALLOWED_HOSTS = ['*']
INSTALLED_APPS = ['django.contrib.contenttypes', 'django.contrib.auth']
ROOT_URLCONF = '${folderName.replace(/-/g, '_')}.urls'
DATABASES = { 'default': { 'ENGINE': 'django.db.backends.sqlite3', 'NAME': 'db.sqlite3' } }
`
    files[`${folderName.replace(/-/g, '_')}/urls.py`] = `from django.http import JsonResponse
from django.urls import path

def index(request):
    return JsonResponse({"service": "${folderName}", "framework": "Django 5", "status": "online"})

def health(request):
    return JsonResponse({"status": "healthy"})

urlpatterns = [
    path('', index),
    path('health/', health),
]
`
    files[`${folderName.replace(/-/g, '_')}/__init__.py`] = ``
    files['requirements.txt'] = `django>=5.0\ngunicorn>=22.0\n`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Python — Flask
  // ═══════════════════════════════════════════════════════
  if (techId === 'python-flask') {
    files['app.py'] = `from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    return jsonify(service="${folderName}", framework="Flask", status="online")

@app.route("/health")
def health():
    return jsonify(status="healthy")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=${port}, debug=True)
`
    files['requirements.txt'] = `flask>=3.0\ngunicorn>=22.0\n`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // C (libmicrohttpd)
  // ═══════════════════════════════════════════════════════
  if (techId === 'c-microhttpd') {
    files['main.c'] = `#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>

#define PORT ${port}
#define RESPONSE "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\\"service\\\":\\\"${folderName}\\\",\\\"lang\\\":\\\"C\\\",\\\"status\\\":\\\"online\\\"}"

int main() {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    struct sockaddr_in addr = { .sin_family = AF_INET, .sin_addr.s_addr = INADDR_ANY, .sin_port = htons(PORT) };
    bind(server_fd, (struct sockaddr*)&addr, sizeof(addr));
    listen(server_fd, 10);
    printf("[LazyStack] C server listening on :%d\\n", PORT);
    while(1) {
        int client = accept(server_fd, NULL, NULL);
        char buf[1024]; read(client, buf, sizeof(buf));
        write(client, RESPONSE, strlen(RESPONSE));
        close(client);
    }
}
`
    files['Makefile'] = `CC=gcc
CFLAGS=-Wall -O2

all: server

server: main.c
\t$(CC) $(CFLAGS) main.c -o server

clean:
\trm -f server
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Zig
  // ═══════════════════════════════════════════════════════
  if (techId === 'zig-http') {
    files['build.zig'] = `const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const exe = b.addExecutable(.{
        .name = "${folderName}",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(exe);
}
`
    files['src/main.zig'] = `const std = @import("std");

pub fn main() !void {
    const address = std.net.Address.parseIp("0.0.0.0", ${port}) catch unreachable;
    var server = try address.listen(.{});
    std.debug.print("[LazyStack] Zig server on :{d}\\n", .{${port}});
    while (true) {
        const conn = try server.accept();
        defer conn.stream.close();
        var buf: [1024]u8 = undefined;
        _ = try conn.stream.read(&buf);
        const resp = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\"service\\":\\"${folderName}\\",\\"lang\\":\\"Zig\\",\\"status\\":\\"online\\"}";
        _ = try conn.stream.write(resp);
    }
}
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Deno Fresh (override generic deno- handler)
  // ═══════════════════════════════════════════════════════
  if (techId === 'deno-fresh') {
    files['deno.json'] = `{
  "tasks": {
    "start": "deno run -A main.ts",
    "dev": "deno run -A --watch=static/,routes/ dev.ts"
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@1.7.3/",
    "preact": "https://esm.sh/preact@10.22.0",
    "preact/": "https://esm.sh/preact@10.22.0/"
  },
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "preact" }
}
`
    files['main.ts'] = `import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

await start(manifest, { port: ${port} });
`
    files['routes/index.tsx'] = `export default function Home() {
  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#09090b", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ border: "1px solid #27272e", padding: "2rem", borderRadius: "12px", background: "#141418", textAlign: "center" }}>
        <h1 style={{ color: "#fbbf24" }}>Deno Fresh</h1>
        <p>${folderName} is running on Islands architecture</p>
      </div>
    </div>
  );
}
`
    files['routes/api/health.ts'] = `import { Handlers } from "$fresh/server.ts";
export const handler: Handlers = {
  GET(_req) {
    return new Response(JSON.stringify({ service: "${folderName}", framework: "Deno Fresh", status: "online" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Vanilla Node.js
  // ═══════════════════════════════════════════════════════
  if (techId === 'vanilla-node') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
`
    files['server.js'] = `import http from 'http';

const port = process.env.PORT || ${port};
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: '${folderName}',
    runtime: 'Vanilla Node.js',
    status: 'online',
    port,
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, () => {
  console.log(\`[LazyStack] ${folderName} (Vanilla Node) on http://0.0.0.0:\${port}\`);
});
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // TypeScript Frameworks (Express, Fastify, NestJS, Hono, Elysia)
  // ═══════════════════════════════════════════════════════
  if (techId === 'ts-express') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts", "build": "tsc", "start": "node dist/index.js" },
  "dependencies": { "express": "^5.0.0" },
  "devDependencies": { "@types/express": "^5.0.0", "@types/node": "^22.0.0", "tsx": "^4.19.0", "typescript": "^5.6.0" }
}
`
    files['src/index.ts'] = `import express from 'express';
const app = express();
const port = process.env.PORT || ${port};

app.get('/', (req, res) => {
  res.json({ service: '${folderName}', framework: 'Express 5', status: 'online' });
});

app.listen(port, () => console.log(\`[LazyStack] ${folderName} (Express) on :\${port}\`));
`
    files['tsconfig.json'] = `{ "compilerOptions": { "target": "ESNext", "module": "NodeNext", "moduleResolution": "NodeNext", "outDir": "./dist", "rootDir": "./src", "strict": true, "esModuleInterop": true, "skipLibCheck": true }, "include": ["src/**/*"] }
`
    return files
  }

  if (techId === 'ts-fastify') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts", "build": "tsc", "start": "node dist/index.js" },
  "dependencies": { "fastify": "^5.0.0" },
  "devDependencies": { "@types/node": "^22.0.0", "tsx": "^4.19.0", "typescript": "^5.6.0" }
}
`
    files['src/index.ts'] = `import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

fastify.get('/', async () => ({ service: '${folderName}', framework: 'Fastify 5', status: 'online' }));

fastify.listen({ port: ${port}, host: '0.0.0.0' }).then(() => {
  console.log(\`[LazyStack] ${folderName} (Fastify) on :${port}\`);
});
`
    files['tsconfig.json'] = `{ "compilerOptions": { "target": "ESNext", "module": "NodeNext", "moduleResolution": "NodeNext", "outDir": "./dist", "rootDir": "./src", "strict": true, "esModuleInterop": true, "skipLibCheck": true }, "include": ["src/**/*"] }
`
    return files
  }

  if (techId === 'ts-nestjs') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "scripts": { "build": "nest build", "start:dev": "nest start --watch", "start:prod": "node dist/main" },
  "dependencies": { "@nestjs/common": "^10.0.0", "@nestjs/core": "^10.0.0", "@nestjs/platform-express": "^10.0.0", "reflect-metadata": "^0.2.0", "rxjs": "^7.8.1" },
  "devDependencies": { "@nestjs/cli": "^10.0.0", "@types/node": "^22.0.0", "typescript": "^5.6.0" }
}
`
    files['src/main.ts'] = `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(${port});
  console.log(\`[LazyStack] ${folderName} (NestJS) on :${port}\`);
}
bootstrap();
`
    files['src/app.module.ts'] = `import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({ controllers: [AppController] })
export class AppModule {}
`
    files['src/app.controller.ts'] = `import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  index() { return { service: '${folderName}', framework: 'NestJS 10', status: 'online' }; }
}
`
    return files
  }

  if (techId === 'ts-hono') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts" },
  "dependencies": { "hono": "^4.0.0", "@hono/node-server": "^1.12.0" },
  "devDependencies": { "tsx": "^4.19.0", "typescript": "^5.6.0" }
}
`
    files['src/index.ts'] = `import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();
app.get('/', (c) => c.json({ service: '${folderName}', framework: 'Hono', status: 'online' }));

serve({ fetch: app.fetch, port: ${port} }, () => {
  console.log(\`[LazyStack] ${folderName} (Hono) on :${port}\`);
});
`
    return files
  }

  if (techId === 'ts-elysia') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "bun run --watch src/index.ts", "start": "bun src/index.ts" },
  "dependencies": { "elysia": "^1.1.0" }
}
`
    files['src/index.ts'] = `import { Elysia } from 'elysia';

new Elysia()
  .get('/', () => ({ service: '${folderName}', framework: 'Elysia (Bun)', status: 'online' }))
  .listen(${port});

console.log(\`[LazyStack] ${folderName} (Elysia) on :${port}\`);
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Frontend Frameworks
  // ═══════════════════════════════════════════════════════
  if (techId === 'react-vite' || techId === 'react-mui') {
    files['package.json'] = `{
  "name": "${folderName}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port ${port} --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"${techId === 'react-mui' ? ',\n    "@mui/material": "^6.1.0",\n    "@emotion/react": "^11.13.0",\n    "@emotion/styled": "^11.13.0"' : ''}
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0"${isTS ? ',\n    "typescript": "^5.6.0",\n    "@types/react": "^19.0.0",\n    "@types/react-dom": "^19.0.0"' : ''}
  }
}
`
    files[`vite.config.${isTS ? 'ts' : 'js'}`] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: ${port},
    host: '0.0.0.0'
  }
});
`
    if (isTS) {
      files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
`
    }
    files['src/index.css'] = `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #0c0d12;
  color: #f4f4f5;
  min-height: 100vh;
}
`
    files[`src/App.${isTS ? 'tsx' : 'jsx'}`] = `import React from 'react';

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ border: '1px solid #27272e', padding: '2.5rem', borderRadius: '16px', background: '#141418', textAlign: 'center', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚛️</div>
        <h1 style={{ color: '#38bdf8', margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700 }}>React + Vite</h1>
        <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Service: <strong>${folderName}</strong></p>
        <div style={{ display: 'inline-block', padding: '0.35rem 0.85rem', background: '#0284c720', color: '#38bdf8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
          Port ${port} • Online
        </div>
      </div>
    </div>
  );
}
`
    files[`src/main.${isTS ? 'tsx' : 'jsx'}`] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${folderName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.${isTS ? 'tsx' : 'jsx'}"></script>
</body>
</html>
`
    files['.gitignore'] = `node_modules
dist
dist-ssr
*.local
.env
`
    files['README.md'] = `# ${folderName} — React + Vite

### Getting Started

Install dependencies:
\`\`\`bash
npm install
\`\`\`

Start development server:
\`\`\`bash
npm run dev
\`\`\`
`
    return files
  }

  if (techId === 'vue-vite') {
    files['package.json'] = `{
  "name": "${folderName}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port ${port} --host",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^6.0.0"${isTS ? ',\n    "typescript": "^5.6.0",\n    "vue-tsc": "^2.0.0"' : ''}
  }
}
`
    files[`vite.config.${isTS ? 'ts' : 'js'}`] = `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: ${port},
    host: '0.0.0.0'
  }
});
`
    if (isTS) {
      files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"]
}
`
    }
    files['src/App.vue'] = `<template>
  <div style="display:flex;height:100vh;align-items:center;justify-content:center;background:#09090b;color:#fff;font-family:sans-serif;">
    <div style="border:1px solid #27272e;padding:2rem;border-radius:12px;background:#141418;text-align:center;">
      <h1 style="color:#10b981;">Vue 3 + Vite</h1>
      <p>${folderName} is online on port ${port}</p>
    </div>
  </div>
</template>
`
    files[`src/main.${isTS ? 'ts' : 'js'}`] = `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${folderName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.${isTS ? 'ts' : 'js'}"></script>
</body>
</html>
`
    files['.gitignore'] = `node_modules\ndist\n.env\n`
    return files
  }

  if (techId === 'angular-cli') {
    files['angular.json'] = `{ "projects": { "${folderName}": { "root": "", "sourceRoot": "src", "architect": { "serve": { "options": { "port": ${port} } } } } } }
`
    files['src/main.ts'] = `import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';

@Component({ selector: 'app-root', standalone: true, template: '<h1>Angular — ${folderName}</h1><p>Online</p>' })
export class AppComponent {}

bootstrapApplication(AppComponent);
`
    files['package.json'] = `{
  "name": "${folderName}",
  "scripts": { "start": "ng serve --port ${port}", "build": "ng build" },
  "dependencies": { "@angular/core": "^19.0.0", "@angular/platform-browser": "^19.0.0", "rxjs": "^7.8.0", "zone.js": "~0.15.0" },
  "devDependencies": { "@angular/cli": "^19.0.0", "@angular/compiler-cli": "^19.0.0", "typescript": "^5.6.0" }
}
`
    return files
  }

  if (techId === 'solidjs-vite') {
    files['package.json'] = `{
  "name": "${folderName}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port ${port} --host",
    "build": "vite build",
    "serve": "vite preview"
  },
  "dependencies": {
    "solid-js": "^1.9.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vite-plugin-solid": "^2.11.0"${isTS ? ',\n    "typescript": "^5.6.0"' : ''}
  }
}
`
    files[`vite.config.${isTS ? 'ts' : 'js'}`] = `import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: ${port},
    host: '0.0.0.0'
  }
});
`
    if (isTS) {
      files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true
  },
  "include": ["src"]
}
`
    }
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${folderName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.${isTS ? 'tsx' : 'jsx'}"></script>
</body>
</html>
`
    files[`src/index.${isTS ? 'tsx' : 'jsx'}`] = `/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';

render(() => <App />, document.getElementById('root')!);
`
    files[`src/App.${isTS ? 'tsx' : 'jsx'}`] = `export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', 'align-items': 'center', 'justify-content': 'center', background: '#09090b', color: '#fff', 'font-family': 'sans-serif' }}>
      <div style={{ border: '1px solid #27272e', padding: '2rem', 'border-radius': '12px', background: '#141418', 'text-align': 'center' }}>
        <h1 style={{ color: '#38bdf8' }}>SolidJS + Vite</h1>
        <p>${folderName} is online on port ${port}</p>
      </div>
    </div>
  );
}
`
    files['.gitignore'] = `node_modules\ndist\n.env\n`
    files['README.md'] = `# ${folderName} (SolidJS)\n\n### Run in Development\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
    return files
  }

  if (techId === 'inferno-js') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite --port ${port} --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "inferno": "^8.2.5"${isTS ? '' : ''}
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "@vitejs/plugin-react": "^4.3.0"${isTS ? `,\n    "typescript": "~5.4.0",\n    "@types/node": "^20.0.0"` : ''}
  }
}
`
    if (isTS) {
      files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react",
    "jsxFactory": "createElement",
    "jsxFragmentFactory": "Fragment",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
`
    }
    files['vite.config.js'] = `import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
    jsxInject: \`import { createElement, Fragment } from 'inferno'\`
  },
  server: {
    port: ${port},
    host: true
  }
})
`
    files[`src/main.${isTS ? 'tsx' : 'jsx'}`] = `import { render } from 'inferno'
import App from './App'

render(<App />, document.getElementById('root'))
`
    files[`src/App.${isTS ? 'tsx' : 'jsx'}`] = `import { Component } from 'inferno'

${isTS ? `interface State { count: number }\n\n` : ''}export default class App extends Component${isTS ? '<{}, State>' : ''} {
  state${isTS ? ': State' : ''} = { count: 0 }

  increment = () => this.setState(({ count }) => ({ count: count + 1 }))
  decrement = () => this.setState(({ count }) => ({ count: count - 1 }))

  render() {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ border: '1px solid #27272e', padding: '2rem', borderRadius: '12px', background: '#141418', textAlign: 'center', minWidth: '280px' }}>
          <h1 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Inferno</h1>
          <p style={{ color: '#71717a', marginBottom: '1.5rem' }}>${folderName} on port ${port}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={this.decrement} style={btnStyle}>−</button>
            <span style={{ fontSize: '1.5rem', fontWeight: '700', minWidth: '3rem', textAlign: 'center' }}>{this.state.count}</span>
            <button onClick={this.increment} style={btnStyle}>+</button>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#52525b' }}>React-compatible · zero virtual DOM overhead</p>
        </div>
      </div>
    )
  }
}

const btnStyle = {
  background: '#27272a',
  border: '1px solid #3f3f46',
  color: '#e4e4e7',
  borderRadius: '8px',
  width: '2.25rem',
  height: '2.25rem',
  fontSize: '1.25rem',
  cursor: 'pointer',
} as const
`
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${folderName}</title>
</head>
<body style="margin:0">
  <div id="root"></div>
  <script type="module" src="/src/main.${isTS ? 'tsx' : 'jsx'}"></script>
</body>
</html>
`
    files['.gitignore'] = `node_modules\ndist\n.env\n`
    files['README.md'] = `# ${folderName} (Inferno)

Blazing-fast React-compatible frontend scaffolded by LazyStack.

### Run in Development
\`\`\`bash
npm install
npm run dev
\`\`\`

Inferno uses the same JSX syntax as React but renders with near-native DOM speed and ~9 KB bundle size.

- Docs: https://infernojs.org/docs/guides/getting-started
- API: https://infernojs.org/docs/api/inferno
`
    return files
  }

  if (techId === 'qwik-city') {
    files['package.json'] = `{
  "name": "${folderName}",
  "private": true,
  "scripts": {
    "dev": "vite --port ${port} --host",
    "build": "qwik build"
  },
  "dependencies": {
    "@builder.io/qwik": "^1.10.0",
    "@builder.io/qwik-city": "^1.10.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "@builder.io/qwik/optimizer": "^1.10.0"
  }
}
`
    files['vite.config.ts'] = `import { defineConfig } from 'vite';
import { qwikCity } from '@builder.io/qwik-city/vite';
import { qwikVite } from '@builder.io/qwik/optimizer';

export default defineConfig({
  plugins: [qwikCity(), qwikVite()],
  server: {
    port: ${port},
    host: '0.0.0.0'
  }
});
`
    files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@builder.io/qwik",
    "strict": true
  }
}
`
    files['src/routes/index.tsx'] = `import { component$ } from '@builder.io/qwik';
export default component$(() => (
  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#fff', fontFamily: 'sans-serif' }}>
    <div style={{ border: '1px solid #27272e', padding: '2rem', borderRadius: '12px', background: '#141418', textAlign: 'center' }}>
      <h1 style={{ color: '#006ce9' }}>Qwik City — ${folderName}</h1>
      <p>Resumable by default on port ${port}</p>
    </div>
  </div>
));
`
    files['.gitignore'] = `node_modules\ndist\n.env\n`
    files['README.md'] = `# ${folderName} (Qwik City)\n\n### Run in Development\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
    return files
  }

  if (techId === 'html-htmx') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "serve . -p ${port}",
    "start": "serve . -p ${port}"
  },
  "devDependencies": {
    "serve": "^14.2.4"
  }
}
`
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${folderName}</title>
  <script src="https://unpkg.com/htmx.org@2.0.0"></script>
</head>
<body style="margin:0;display:flex;height:100vh;align-items:center;justify-content:center;background:#09090b;color:#fff;font-family:sans-serif;">
  <div style="border:1px solid #27272e;padding:2rem;border-radius:12px;background:#141418;text-align:center;">
    <h1>HTMX — ${folderName}</h1>
    <button hx-get="/api/health" hx-target="#result" hx-swap="innerHTML" style="padding:0.5rem 1rem;cursor:pointer;">Check Health</button>
    <div id="result" style="margin-top:1rem;"></div>
  </div>
</body>
</html>
`
    files['.gitignore'] = `node_modules\n.env\n`
    files['README.md'] = `# ${folderName} (HTMX App)\n\n### Run in Development\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Desktop / Mobile / Cross-Platform
  // ═══════════════════════════════════════════════════════
  if (techId === 'dart-flutter') {
    files['pubspec.yaml'] = `name: ${folderName.replace(/-/g, '_')}
description: "LazyStack Flutter application"
version: 0.1.0
environment:
  sdk: ">=3.2.0 <4.0.0"
  flutter: ">=3.16.0"
dependencies:
  flutter:
    sdk: flutter
`
    files['lib/main.dart'] = `import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${folderName}',
      theme: ThemeData.dark(),
      home: Scaffold(
        appBar: AppBar(title: const Text('${folderName}')),
        body: const Center(child: Text('Flutter App Online', style: TextStyle(fontSize: 24))),
      ),
    );
  }
}
`
    return files
  }

  if (techId === 'ionic-framework') {
    files['package.json'] = `{
  "name": "${folderName}",
  "scripts": { "start": "ionic serve --port ${port}", "build": "ionic build" },
  "dependencies": { "@ionic/react": "^8.0.0", "react": "^18.2.0", "react-dom": "^18.2.0" },
  "devDependencies": { "@ionic/cli": "^7.0.0", "typescript": "^5.6.0" }
}
`
    files['src/App.tsx'] = `import { IonApp, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/react';

export default function App() {
  return (
    <IonApp>
      <IonHeader><IonToolbar><IonTitle>${folderName}</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding"><h2>Ionic Framework App Online</h2></IonContent>
    </IonApp>
  );
}
`
    return files
  }

  if (techId === 'electron-app') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": { "start": "electron .", "dev": "electron ." },
  "devDependencies": { "electron": "^35.0.0" }
}
`
    files['main.js'] = `const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1024, height: 768, webPreferences: { nodeIntegration: true } });
  win.loadFile('index.html');
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`
    files['index.html'] = `<!DOCTYPE html>
<html><head><title>${folderName}</title></head>
<body style="margin:0;display:flex;height:100vh;align-items:center;justify-content:center;background:#09090b;color:#fff;font-family:sans-serif;">
  <div style="text-align:center;"><h1>Electron — ${folderName}</h1><p>Desktop app is online</p></div>
</body></html>
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Utility: Bash Worker / SQL Migrations
  // ═══════════════════════════════════════════════════════
  if (techId === 'bash-worker') {
    files['worker.sh'] = `#!/usr/bin/env bash
set -euo pipefail

echo "[LazyStack] ${folderName} bash worker started"

while true; do
  echo "[$(date -Iseconds)] Heartbeat from ${folderName}"
  sleep 60
done
`
    files['README.md'] = `# ${folderName} — Bash Worker
A background shell worker process. Runs inside a Docker container.
`
    return files
  }

  if (techId === 'sql-migrations') {
    files['migrations/001_init.sql'] = `-- LazyStack SQL Migration: 001_init
-- Service: ${folderName}
-- Created: $(date)

CREATE TABLE IF NOT EXISTS health_checks (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy',
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_checks (status) VALUES ('initialized');
`
    files['README.md'] = `# ${folderName} — SQL Migrations
Place numbered migration files in the \`migrations/\` directory.
`
    return files
  }

  // ═══════════════════════════════════════════════════════
  // Fallback: Generic Node TS/JS (only for truly generic Node projects)
  // ═══════════════════════════════════════════════════════
  if (isTS) {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
`
    files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
`
    files['src/index.ts'] = `import http from 'http';

const port = process.env.PORT || ${port};
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: '${folderName}',
    dialect: 'TypeScript',
    status: 'online',
    port,
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, () => {
  console.log(\`[LazyStack] ${folderName} (TypeScript) running on http://0.0.0.0:\${port}\`);
});
`
  } else if (techId === 'swift-vapor') {
    files['Package.swift'] = `// swift-tools-version:5.10
import PackageDescription

let package = Package(
    name: "${folderName}",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.99.0")
    ],
    targets: [
        .executableTarget(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor")
            ]
        )
    ]
)
`
    files['Sources/App/main.swift'] = `import Vapor

var env = try Environment.detect()
try LoggingSystem.bootstrap(from: &env)

let app = Application(env)
defer { app.shutdown() }

app.http.server.configuration.port = Int(Environment.get("PORT") ?? "${port}") ?? ${port}
app.http.server.configuration.hostname = "0.0.0.0"

app.get { req in
    return ["service": "${folderName}", "language": "Swift", "framework": "Vapor 4", "status": "online"]
}

app.get("health") { req in
    return ["status": "healthy", "timestamp": Date().description]
}

try app.run()
`
  } else if (techId === 'scala-play') {
    files['build.sbt'] = `name := "${folderName}"
version := "1.0"
scalaVersion := "2.13.14"

enablePlugins(PlayScala)

libraryDependencies ++= Seq(
  guice
)
`
    files['conf/routes'] = `GET     /               controllers.HomeController.index
GET     /health         controllers.HomeController.health
`
    files['app/controllers/HomeController.scala'] = `package controllers

import javax.inject._
import play.api.mvc._
import play.api.libs.json.Json

@Singleton
class HomeController @Inject()(val controllerComponents: ControllerComponents) extends BaseController {
  def index() = Action { implicit request: Request[AnyContent] =>
    Ok(Json.obj("service" -> "${folderName}", "language" -> "Scala", "status" -> "online"))
  }
  def health() = Action { implicit request: Request[AnyContent] =>
    Ok(Json.obj("status" -> "healthy"))
  }
}
`
  } else if (techId === 'clojure-ring') {
    files['deps.edn'] = `{:paths ["src"]
 :deps {org.clojure/clojure {:mvn/version "1.11.1"}
        ring/ring-core {:mvn/version "1.11.0"}
        ring/ring-jetty-adapter {:mvn/version "1.11.0"}
        ring/ring-json {:mvn/version "0.5.1"}
        compojure/compojure {:mvn/version "1.7.1"}}}
`
    files['src/app/core.clj'] = `(ns app.core
  (:require [ring.adapter.jetty :refer [run-jetty]]
            [compojure.core :refer [defroutes GET]]
            [compojure.route :as route]
            [ring.middleware.json :refer [wrap-json-response]]))

(defroutes app-routes
  (GET "/" [] {:body {:service "${folderName}" :language "Clojure" :status "online" :port ${port}}})
  (GET "/health" [] {:body {:status "healthy"}})
  (route/not-found {:body {:error "Not found"}}))

(def app (wrap-json-response app-routes))

(defn -main [& args]
  (let [port (Integer/parseInt (or (System/getenv "PORT") "${port}"))]
    (println (str "[LazyStack] ${folderName} (Clojure) running on port " port))
    (run-jetty app {:port port :join? false})))
`
  } else if (techId === 'ocaml-dream') {
    files['dune-project'] = `(lang dune 3.0)`
    files['bin/dune'] = `(executable
 (name server)
 (libraries dream))`
    files['bin/server.ml'] = `let () =
  Dream.run ~port:${port} ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router [
    Dream.get "/" (fun _ ->
      Dream.json "{\\"service\\": \\"${folderName}\\", \\"language\\": \\"OCaml\\", \\"framework\\": \\"Dream\\", \\"status\\": \\"online\\"}");
    Dream.get "/health" (fun _ ->
      Dream.json "{\\"status\\": \\"healthy\\"}");
  ]
`
  } else if (techId === 'julia-genie') {
    files['Project.toml'] = `[deps]
Genie = "c43e77cb-5708-574b-8984-7cba7802a881"
JSON3 = "0f5b7848-d4d8-4252-b635-c83753799f63"
`
    files['app.jl'] = `using Genie, Genie.Renderer.Json

Genie.config.server_port = parse(Int, get(ENV, "PORT", "${port}"))
Genie.config.server_host = "0.0.0.0"

route("/") do
  json(Dict("service" => "${folderName}", "language" => "Julia", "framework" => "Genie.jl", "status" => "online"))
end

route("/health") do
  json(Dict("status" => "healthy"))
end

up()
`
  } else if (techId === 'lua-lapis') {
    files['app.lua'] = `local lapis = require("lapis")
local app = lapis.Application()

app:get("/", function(self)
  return { json = { service = "${folderName}", language = "Lua", runtime = "OpenResty/LuaJIT", status = "online", port = ${port} } }
end)

app:get("/health", function(self)
  return { json = { status = "healthy" } }
end)

return app
`
  } else if (techId === 'r-plumber') {
    files['plumber.R'] = `#* @apiTitle ${folderName} Plumber API
#* @get /
function() {
  list(service = "${folderName}", language = "R", runtime = "R 4.4", status = "online", port = ${port})
}

#* @get /health
function() {
  list(status = "healthy")
}
`
  } else if (techId === 'erlang-cowboy') {
    files['rebar.config'] = `{erl_opts, [debug_info]}.
{deps, [
    {cowboy, "2.10.0"},
    {jsone, "1.8.1"}
]}.
`
    files['src/server_app.erl'] = `-module(server_app).
-behaviour(application).
-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    Port = ${port},
    Dispatch = cowboy_router:compile([
        {'_', [
            {"/", server_handler, []},
            {"/health", health_handler, []}
        ]}
    ]),
    {ok, _} = cowboy:start_clear(http_listener,
        [{port, Port}],
        #{env => #{dispatch => Dispatch}}
    ),
    io:format("[LazyStack] ~s (Erlang Cowboy) running on port ~p~n", ["${folderName}", Port]),
    server_sup:start_link().

stop(_State) ->
    ok.
`
  } else if (techId === 'nim-happyx') {
    files['main.nim'] = `import happyx

serve "0.0.0.0", ${port}:
  get "/":
    return {"service": "${folderName}", "language": "Nim", "framework": "HappyX", "status": "online"}
  get "/health":
    return {"status": "healthy"}
`
  } else if (techId === 'crystal-kemal') {
    files['shard.yml'] = `name: ${folderName}
version: 0.1.0
dependencies:
  kemal:
    github: kemalcr/kemal
`
    files['src/server.cr'] = `require "kemal"

get "/" do |env|
  env.response.content_type = "application/json"
  {service: "${folderName}", language: "Crystal", framework: "Kemal", status: "online"}.to_json
end

get "/health" do |env|
  env.response.content_type = "application/json"
  {status: "healthy"}.to_json
end

port = ENV["PORT"]?.try(&.to_i?) || ${port}
Kemal.run(port)
`
  } else if (techId === 'qwik-city') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@builder.io/qwik": "^1.5.0",
    "@builder.io/qwik-city": "^1.5.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "typescript": "^5.4.0"
  }
}
`
    files['src/routes/index.tsx'] = `import { component$ } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>LazyStack ⚡ ${folderName}</h1>
      <p>Powered by <strong>Qwik & QwikCity</strong> with instant resumability and zero hydration!</p>
    </div>
  );
});
`
  } else if (techId === 'tanstack-start') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.31.0",
    "@tanstack/start": "^1.31.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "typescript": "^5.4.0"
  }
}
`
    files['app/routes/index.tsx'] = `import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>${folderName}</h1>
      <p>Powered by TanStack Start and TanStack Router with Vite SSR.</p>
    </main>
  );
}
`
  } else if (techId === 'solid-start') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start"
  },
  "dependencies": {
    "@solidjs/start": "^1.0.0",
    "solid-js": "^1.8.0",
    "vinxi": "^0.3.0"
  }
}
`
    files['src/routes/index.tsx'] = `export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>${folderName}</h1>
      <p>Powered by SolidStart with fine-grained reactivity and streaming SSR.</p>
    </main>
  );
}
`
  } else if (techId === 'lit-element') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lit": "^3.1.2"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "typescript": "^5.4.0"
  }
}
`
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${folderName} - Lit</title>
    <script type="module" src="/src/my-element.ts"></script>
  </head>
  <body>
    <my-element name="${folderName}"></my-element>
  </body>
</html>
`
    files['src/my-element.ts'] = `import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-element')
export class MyElement extends LitElement {
  static styles = css\`
    :host { display: block; font-family: system-ui, sans-serif; padding: 2rem; }
    h1 { color: #00adb5; }
  \`;

  @property()
  name = '${folderName}';

  render() {
    return html\`
      <h1>\${this.name}</h1>
      <p>Google Lit Web Component running standard native Custom Elements!</p>
    \`;
  }
}
`
  } else if (techId === 'hono-api') {
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@hono/node-server": "^1.11.0",
    "hono": "^4.3.0"
  },
  "devDependencies": {
    "tsx": "^4.9.0",
    "typescript": "^5.4.0"
  }
}
`
    files['src/index.ts'] = `import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => c.json({ service: '${folderName}', framework: 'Hono', status: 'online', port: ${port} }));
app.get('/health', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT) || ${port};
console.log(\`[LazyStack] ${folderName} (Hono) listening on http://0.0.0.0:\${port}\`);
serve({ fetch: app.fetch, port });
`
  } else if (techId === 'go-fiber') {
    files['go.mod'] = `module ${folderName}

go 1.23

require (
    github.com/gofiber/fiber/v2 v2.52.4
)
`
    files['main.go'] = `package main

import (
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"service": "${folderName}",
			"framework": "Fiber v3",
			"language": "Go",
			"status": "online",
		})
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "${port}"
	}

	fmt.Printf("[LazyStack] ${folderName} (Go Fiber) running on http://0.0.0.0:%s\\n", port)
	app.Listen(":" + port)
}
`
  } else if (techId === 'rust-poem') {
    files['Cargo.toml'] = `[package]
name = "${folderName}"
version = "0.1.0"
edition = "2021"

[dependencies]
poem = "3.0"
poem-openapi = { version = "5.0", features = ["swagger-ui"] }
tokio = { version = "1.38", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`
    files['src/main.rs'] = `use poem::{listener::TcpListener, Route, Server};
use poem_openapi::{payload::Json, OpenApi, OpenApiService};
use serde::Serialize;

#[derive(Serialize, poem_openapi::Object)]
struct StatusResponse {
    service: String,
    framework: String,
    status: String,
}

struct Api;

#[OpenApi]
impl Api {
    #[oai(path = "/", method = "get")]
    async fn index(&self) -> Json<StatusResponse> {
        Json(StatusResponse {
            service: "${folderName}".to_string(),
            framework: "Poem OpenAPI".to_string(),
            status: "online".to_string(),
        })
    }
}

#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    let api_service = OpenApiService::new(Api, "${folderName}", "1.0")
        .server(format!("http://0.0.0.0:${port}"));
    let ui = api_service.swagger_ui();
    let app = Route::new().nest("/", api_service).nest("/docs", ui);

    println!("[LazyStack] ${folderName} (Rust Poem) running on port ${port} with Swagger on /docs");
    Server::new(TcpListener::bind(format!("0.0.0.0:${port}")))
        .run(app)
        .await
}
`
  } else {
    // Pure JavaScript
    files['package.json'] = `{
  "name": "${folderName}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}
`
    files['index.js'] = `import http from 'http';

const port = process.env.PORT || ${port};
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: '${folderName}',
    dialect: 'JavaScript',
    status: 'online',
    port,
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, () => {
  console.log(\`[LazyStack] ${folderName} (JavaScript) running on http://0.0.0.0:\${port}\`);
});
`
  }

  return files
}
