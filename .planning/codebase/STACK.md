# Technology Stack

**Analysis Date:** 2026-04-06

## Languages

**Primary:**
- TypeScript - Frontend application code in `src/main.ts`, `src/App.vue`, `src/features/`, `src/components/`, and `src/lib/`
- Rust - Desktop runtime, persistence, command handling, HTTP execution, and import runtimes in `src-tauri/src/lib.rs`, `src-tauri/src/core/`, `src-tauri/src/services/`, and `src-tauri/src/storage/`

**Secondary:**
- Vue Single File Components - UI composition in `src/App.vue`, `src/components/**/*.vue`, and `src/features/**/*.vue`
- JavaScript (ES modules) - Tooling config in `tailwind.config.js` and `postcss.config.js`
- JSON - App and tooling configuration in `package.json`, `components.json`, and `src-tauri/tauri.conf.json`
- Markdown - Product and contributor documentation in `README.md` and `docs/`

## Runtime

**Environment:**
- Node.js 18+ for frontend tooling and Tauri build hooks, documented in `README.md`
- Tauri 2 desktop runtime for packaged app execution, configured in `src-tauri/tauri.conf.json`
- Rust stable toolchain for native application layer, documented in `README.md` and configured in `src-tauri/Cargo.toml`

**Package Manager:**
- `pnpm` - JavaScript package manager implied by `pnpm-lock.yaml` and the scripts in `package.json`
- Cargo - Rust package manager via `src-tauri/Cargo.toml`
- Lockfile: present in `pnpm-lock.yaml` and `src-tauri/Cargo.lock`

## Frameworks

**Core:**
- Vue 3 (`vue`) - Frontend framework for the desktop UI in `package.json`, mounted from `src/main.ts`
- Tauri 2 (`tauri`, `@tauri-apps/api`, `@tauri-apps/cli`) - Desktop shell and frontend/native bridge in `src-tauri/Cargo.toml`, `package.json`, and `src/lib/tauri-client.ts`
- Vite 8 (`vite`) - Frontend dev server and bundler in `package.json` and `vite.config.ts`

**Testing:**
- Vitest (`vitest`) - Frontend/unit test runner in `package.json` and `vite.config.ts`
- Vue Test Utils (`@vue/test-utils`) - Vue component testing in `package.json` and test files such as `src/App.test.ts`
- jsdom (`jsdom`) - Browser-like test environment configured in `vite.config.ts`

**Build/Dev:**
- `vue-tsc` - Type checking in the `build` and `preview` scripts in `package.json`
- `@vitejs/plugin-vue` - Vue SFC support in `vite.config.ts`
- `@tailwindcss/vite` - Tailwind Vite integration in `vite.config.ts`
- PostCSS + Autoprefixer - CSS processing in `postcss.config.js`
- `tauri-build` - Native build integration in `src-tauri/Cargo.toml` and `src-tauri/build.rs`

## Key Dependencies

**Critical:**
- `reqwest` - Native HTTP engine for request execution and MCP-over-HTTP in `src-tauri/Cargo.toml`, `src-tauri/src/core/request_executor.rs`, and `src-tauri/src/core/mcp_runtime.rs`
- `rusqlite` - Local SQLite persistence with bundled SQLite in `src-tauri/Cargo.toml`, `src-tauri/src/storage/connection.rs`, and `src-tauri/src/storage/db.rs`
- `serde` and `serde_json` - Serialization across the Tauri boundary and persisted JSON payloads in `src-tauri/Cargo.toml` and `src-tauri/src/models/`
- `@tauri-apps/api` - Frontend invoke bridge in `src/lib/tauri-client.ts`

**Infrastructure:**
- `tauri-plugin-dialog` and `@tauri-apps/plugin-dialog` - Native save dialog support in `src-tauri/src/lib.rs` and `src/lib/tauri-client.ts`
- `tauri-plugin-opener` and `@tauri-apps/plugin-opener` - Native opener plugin registration in `src-tauri/src/lib.rs`
- `openapiv3` and `serde_yaml` - OpenAPI import parsing in `src-tauri/Cargo.toml` and `src-tauri/src/core/import_runtime.rs`
- `base64` - Binary payload and auth encoding in `src-tauri/src/core/request_executor.rs`
- `uuid` - Generated record identifiers in `src-tauri/src/storage/connection.rs`
- `chrono` - Time handling in Rust models and services referenced from `src-tauri/Cargo.toml`
- `dirs` - Filesystem/app data directory support in `src-tauri/Cargo.toml`
- `@vueuse/core` - Vue composable helpers in `package.json`
- `reka-ui`, `lucide-vue-next`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate` - UI composition stack referenced by `package.json`, `components.json`, and `src/components/ui/`
- CodeMirror packages (`@codemirror/*`) - Response and editor surfaces in `package.json` and `src/components/code/CodeEditorSurface.vue`

## Configuration

**Environment:**
- No `.env` or `.env.*` files are detected at the repository root during this scan
- Frontend dev host is read from `process.env.TAURI_DEV_HOST` in `vite.config.ts`
- App data location is resolved from Tauri runtime paths in `src-tauri/src/core/app_state.rs`, which stores SQLite at the app data path joined with `zenrequest.sqlite3`
- Runtime settings are persisted in SQLite and cached in `src-tauri/src/core/app_state.rs` rather than pulled from environment variables

**Build:**
- `package.json` defines `dev`, `build`, `preview`, `test`, and `tauri` commands
- `vite.config.ts` configures Vue, Tailwind, jsdom tests, alias `@`, and Tauri dev server behavior on port `1420`
- `tsconfig.json` enables strict TypeScript with bundler resolution and the `@/*` alias
- `src-tauri/tauri.conf.json` defines the desktop app identifier, build hooks, window options, bundle targets, and frontend dist path
- `components.json` configures shadcn-vue aliases, style flavor, and Tailwind CSS integration
- `tailwind.config.js` and `postcss.config.js` provide CSS pipeline configuration

## Platform Requirements

**Development:**
- Node.js 18+ and `pnpm`, documented in `README.md`
- Rust stable toolchain, documented in `README.md`
- Tauri system prerequisites, documented in `README.md`
- Frontend dev server runs on port `1420` with HMR on `1421` when `TAURI_DEV_HOST` is set in `vite.config.ts`

**Production:**
- Desktop bundle target is Tauri native packaging with `targets: "all"` in `src-tauri/tauri.conf.json`
- Application persists all workspace, settings, collection, environment, and history data into local SQLite initialized from `src-tauri/src/storage/db.rs`
- Network access is outbound only for user-triggered HTTP and MCP-over-HTTP requests handled by `src-tauri/src/core/request_executor.rs` and `src-tauri/src/core/mcp_runtime.rs`

---

*Stack analysis: 2026-04-06*
