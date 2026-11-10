# v1.1.2 mobile frameworks plan

Status: **implemented in v1.1.2** (see [CHANGELOG](CHANGELOG.md)). Open questions were settled as: Capacitor ships TypeScript and JavaScript flavors without a UI framework; MAUI CI is not added yet (see section 3). Theme: first-class cross-platform mobile/desktop app frameworks.

## 1. Frameworks

| ID | Name | Language | Role | Run mode | Status today | Starter layout (mirrors official init) |
| --- | --- | --- | --- | --- | --- | --- |
| `react-native-expo` | React Native (Expo) | JS / TS | mobile | host only | exists, legacy template | `create-expo-app` default template: `app/` (Expo Router: `_layout`, `(tabs)/`, `+not-found`), `components/`, `constants/`, `hooks/`, `assets/`, `app.json`, `eas.json`, `tsconfig.json` |
| `capacitor-app` | Capacitor | JS / TS | mobile / PWA | Docker (web) or host (native) | **new** | `npm init @capacitor/app` layout: Vite web app (`index.html`, `src/`), `capacitor.config.ts`, `webDir: dist` |
| `csharp-maui` | .NET MAUI | C# | mobile / desktop | host only | **new** | `dotnet new maui`: `<Name>.csproj`, `MauiProgram.cs`, `App.xaml(.cs)`, `AppShell.xaml(.cs)`, `MainPage.xaml(.cs)`, `Platforms/{Android,iOS,MacCatalyst,Windows}/`, `Resources/{AppIcon,Splash,Fonts,Images,Styles,Raw}/` |

`ionic-framework` stays as-is (Ionic UI on top of Capacitor). `capacitor-app` is the plain option without Ionic components, for teams that bring their own UI (React/Vue/Svelte/vanilla flavor via `supportsFlavor`).

### 1a. Expo: move to a native starter

- Move the template out of the legacy `appTemplates.ts` branch into a `STARTERS` entry in `templates/native/javascript.ts` (the current `EXTRAS` entry only adds `.gitkeep` files).
- Upgrade the dependencies: the legacy template pins Expo SDK 51 / RN 0.74 / expo-router 3.5. Pin to the current SDK at implementation time and keep `react`/`react-native` at the versions that SDK expects (`npx expo install --check` should pass).
- Add `eas.json` (development / preview / production profiles) and a passing `jest-expo` test in `__tests__/`.
- Set `hostOnly: true` in `frameworks.ts`. The manual-setup text already says "Expo apps run on a phone or an emulator, not in Docker", but the catalog still lets it be a Docker service.
- Add `expo` CLI requirement hint (`npx expo`), plus `.expo/` and `ios/`/`android/` (prebuild output) to `.gitignore`.
- `nativeEnvironment.ts`: `EXPO_PUBLIC_API_URL` from connections, so the app can reach backends (use the host LAN IP note in README; `localhost` does not work from a phone).

### 1b. Capacitor (new)

- Catalog: `requires` node + npm; optional Android Studio / Xcode noted in manual setup, not as hard requirements.
- Starter: Vite app + `@capacitor/core`, `@capacitor/cli`, `@capacitor/app`, `capacitor.config.ts` (`appId: com.lazystack.<snake>`), one plugin call example (`App.getInfo()` guarded by `Capacitor.isNativePlatform()`), a Vitest test.
- Docker: same Vite build + preview Dockerfile as other Vite frontends (web target only).
- Dev orchestrator: `npm run dev`; README documents `npx cap add android|ios`, `npx cap sync`, `npx cap run android`.
- Manual setup: reuse the `ionic-framework` entry text (native shells need platform SDKs).
- Importer: detect `"@capacitor/core"` **without** `"@ionic/*"`, so the `capacitor-app` rule must be checked after the Ionic rule.

### 1c. .NET MAUI (new)

- Catalog: `hostOnly: true`, `requires` `dotnet` (.NET 10 SDK) with install hint `dotnet workload install maui` (`maui-android` on Linux).
- Starter: the `dotnet new maui` layout above, `TargetFrameworks` chosen per OS like the official template (Android + iOS + MacCatalyst, plus Windows when built on Windows), and a separate `<Name>.Tests` xUnit project for view-model logic (MAUI app projects can't be referenced directly by a plain test project, so the shared logic goes in a small class library or linked files).
- Connections: inject the backend URL through `appsettings.json` / `MauiProgram` and note `10.0.2.2` for the Android emulator.
- Dev orchestrator: `dotnet build -t:Run -f net10.0-android` on Linux, `-f net10.0-windows10.0.19041.0` on Windows, `-f net10.0-maccatalyst` on macOS.
- Manual setup: MAUI workload install, Android SDK / emulator, Xcode for iOS/Mac. **Linux can only target Android**; say so in the popup and README.
- Importer: detect `<UseMaui>true</UseMaui>` in `*.csproj` before the generic ASP.NET rule.
- Icon: devicon `dotnetcore` (no dedicated MAUI devicon).

## 2. Tables to update (per CLAUDE.md)

For each of the three IDs: `src/data/frameworks.ts`, `templates/native/{javascript,backend}.ts`, `templates/docker.ts` (Capacitor only), `templates/meta.ts` (launch command), `src/utils/nativeEnvironment.ts`, `src/data/manualSetup.ts`, `src/utils/techIcons.ts`, `electron/project/importer.ts`, `docs/framework-layouts.md`, README framework list, and the showcase framework count.

## 3. Verification

- `npm run verify:templates` and `npx tsc --noEmit` clean.
- Scaffold each via the CLI (`lazystack scaffold`) in both workspace modes and check that `hostOnly` techs get no Compose service.
- CI additions (native-project matrix, Node 22 for the JS apps): Expo `npm install && tsc --noEmit && npm test`; Capacitor `npm install && npm run build && npm test && npx cap ls`; MAUI `dotnet test` on the platform-free view-model test project. A full MAUI Android build (`maui-android` workload + Android SDK) is not in CI yet; it could be added as a manual or nightly job.
- Import round-trip: `lazystack import --dir` on each generated project recognizes the right techId.

## Open questions

- Should `capacitor-app` offer framework flavors (React / Vue / Svelte / vanilla) in 1.1.2, or ship vanilla + React first?
- MAUI CI on Linux needs the Android workload (~GBs). Gate it behind a manual/nightly workflow?
