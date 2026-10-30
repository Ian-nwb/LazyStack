/**
 * Maps technology/language names to Devicon CDN icon URLs.
 * Used to display recognizable framework and language icons throughout the UI.
 * 
 * Uses the Devicon project (https://devicon.dev/) for consistent, high-quality
 * technology icons. Falls back to a generic code icon when no match is found.
 */

const DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

// Map of language/framework identifiers to their devicon paths
const ICON_MAP: Record<string, string> = {
  // Systems & Low-level
  'assembly':     `${DEVICON_BASE}/linux/linux-original.svg`,
  'haskell':      `${DEVICON_BASE}/haskell/haskell-original.svg`,
  'c':            `${DEVICON_BASE}/c/c-original.svg`,
  'c++':          `${DEVICON_BASE}/cplusplus/cplusplus-original.svg`,
  'zig':          `${DEVICON_BASE}/zig/zig-original.svg`,
  'rust':         `${DEVICON_BASE}/rust/rust-original.svg`,

  // Runtimes
  'node.js':      `${DEVICON_BASE}/nodejs/nodejs-original.svg`,
  'deno (ts/js)': `${DEVICON_BASE}/denojs/denojs-original.svg`,
  'bun (ts/js)':  `${DEVICON_BASE}/bun/bun-original.svg`,

  // Go
  'go':           `${DEVICON_BASE}/go/go-original.svg`,

  // C# / .NET
  'c#':           `${DEVICON_BASE}/csharp/csharp-original.svg`,

  // Python
  'python':       `${DEVICON_BASE}/python/python-original.svg`,

  // JS / TS
  'js / ts':      `${DEVICON_BASE}/typescript/typescript-original.svg`,
  'typescript':   `${DEVICON_BASE}/typescript/typescript-original.svg`,
  'javascript':   `${DEVICON_BASE}/javascript/javascript-original.svg`,
  'html/css/js':  `${DEVICON_BASE}/html5/html5-original.svg`,
  'html/css':     `${DEVICON_BASE}/html5/html5-original.svg`,

  // PHP
  'php':          `${DEVICON_BASE}/php/php-original.svg`,

  // JVM
  'java':         `${DEVICON_BASE}/java/java-original.svg`,
  'kotlin':       `${DEVICON_BASE}/kotlin/kotlin-original.svg`,
  'scala':        `${DEVICON_BASE}/scala/scala-original.svg`,
  'clojure':      `${DEVICON_BASE}/clojure/clojure-original.svg`,

  // Functional
  'elixir':       `${DEVICON_BASE}/elixir/elixir-original.svg`,
  'erlang':       `${DEVICON_BASE}/erlang/erlang-original.svg`,
  'ocaml':        `${DEVICON_BASE}/ocaml/ocaml-original.svg`,

  // Other
  'ruby':         `${DEVICON_BASE}/ruby/ruby-original.svg`,
  'swift':        `${DEVICON_BASE}/swift/swift-original.svg`,
  'dart':         `${DEVICON_BASE}/dart/dart-original.svg`,
  'julia':        `${DEVICON_BASE}/julia/julia-original.svg`,
  'lua':          `${DEVICON_BASE}/lua/lua-original.svg`,
  'r':            `${DEVICON_BASE}/r/r-original.svg`,
  'nim':          `${DEVICON_BASE}/nimble/nimble-original.svg`,
  'crystal':      `${DEVICON_BASE}/crystal/crystal-original.svg`,
  'bash':         `${DEVICON_BASE}/bash/bash-original.svg`,
  'sql':          `${DEVICON_BASE}/azuresqldatabase/azuresqldatabase-original.svg`,

  // Frameworks & specific tech
  'rust / web':   `${DEVICON_BASE}/rust/rust-original.svg`,

  // React, Vue, Angular, Svelte, etc.
  'react':        `${DEVICON_BASE}/react/react-original.svg`,
  'vue':          `${DEVICON_BASE}/vuejs/vuejs-original.svg`,
  'angular':      `${DEVICON_BASE}/angular/angular-original.svg`,
  'svelte':       `${DEVICON_BASE}/svelte/svelte-original.svg`,

  // Docker / infra
  'docker':       `${DEVICON_BASE}/docker/docker-original.svg`,
}

// Framework ID -> icon overrides for specific frameworks
const FRAMEWORK_ICON_OVERRIDES: Record<string, string> = {
  'react-vite':       `${DEVICON_BASE}/react/react-original.svg`,
  'react-mui':        `${DEVICON_BASE}/react/react-original.svg`,
  'vue-vite':         `${DEVICON_BASE}/vuejs/vuejs-original.svg`,
  'angular-cli':      `${DEVICON_BASE}/angular/angular-original.svg`,
  'fullstack-nextjs':  `${DEVICON_BASE}/nextjs/nextjs-original.svg`,
  'fullstack-nuxt':    `${DEVICON_BASE}/nuxtjs/nuxtjs-original.svg`,
  'fullstack-sveltekit': `${DEVICON_BASE}/svelte/svelte-original.svg`,
  'fullstack-laravel': `${DEVICON_BASE}/laravel/laravel-original.svg`,
  'fullstack-astro':   `${DEVICON_BASE}/astro/astro-original.svg`,
  'fullstack-remix':   `${DEVICON_BASE}/react/react-original.svg`,
  'dart-flutter':      `${DEVICON_BASE}/flutter/flutter-original.svg`,
  'electron-app':      `${DEVICON_BASE}/electron/electron-original.svg`,
  'python-django':     `${DEVICON_BASE}/django/django-plain.svg`,
  'python-flask':      `${DEVICON_BASE}/flask/flask-original.svg`,
  'python-fastapi':    `${DEVICON_BASE}/fastapi/fastapi-original.svg`,
  'java-springboot':   `${DEVICON_BASE}/spring/spring-original.svg`,
  'ruby-rails':        `${DEVICON_BASE}/rails/rails-original-wordmark.svg`,
  'ts-nestjs':         `${DEVICON_BASE}/nestjs/nestjs-original.svg`,
  'tauri-app':         `${DEVICON_BASE}/tauri/tauri-original.svg`,
  'google-apps-script': `${DEVICON_BASE}/google/google-original.svg`,
  'assemblyscript':     `${DEVICON_BASE}/wasm/wasm-original.svg`,
  'react-native-expo':  `${DEVICON_BASE}/react/react-original.svg`,
  'inferno-js':         `${DEVICON_BASE}/react/react-original.svg`,
}

/**
 * Get the icon URL for a given technology.
 * Priority: framework ID override > language name match > null
 */
export function getTechIconUrl(techId: string, language: string): string | null {
  // Check framework-specific override first
  if (FRAMEWORK_ICON_OVERRIDES[techId]) {
    return FRAMEWORK_ICON_OVERRIDES[techId]
  }

  // Check language match (case-insensitive)
  const langKey = language.toLowerCase()
  if (ICON_MAP[langKey]) {
    return ICON_MAP[langKey]
  }

  return null
}
