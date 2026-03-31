# ZenRequest

> A blazingly fast, local-first API workbench built for developers who value privacy and speed.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-ffc131.svg)](https://v2.tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

[中文](README.md) | [Download Latest](https://github.com/S842155114/ZenRequest/releases/latest)

---

## Why ZenRequest?

Modern API tools like Postman and Insomnia have become bloated — forced logins, mandatory cloud sync, gigabytes of RAM, and telemetry you never asked for.

**ZenRequest** is the alternative: a desktop-first API workbench that starts in milliseconds, runs entirely offline, and keeps your data on your machine.

- **Instant startup** — Rust + Tauri, not Electron
- **Featherweight** — under 50 MB RAM at idle
- **100% offline & private** — no accounts, no telemetry, no cloud
- **Local SQLite storage** — workspaces, requests, history, and sessions stored on your machine

---

## Features

- Multiple workspaces with persisted sessions
- Collections and saved requests
- Environment variables with template resolution
- Request execution with test assertions
- History replay
- Workspace import / export
- cURL import into editable request drafts
- Request-local mock templates
- Response HTML preview

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop runtime | [Tauri v2](https://v2.tauri.app/) + [Rust](https://www.rust-lang.org/) |
| HTTP engine | `reqwest` (async) |
| Local storage | SQLite via `rusqlite` |
| Frontend | [Vue 3](https://vuejs.org/) + TypeScript + [Vite](https://vitejs.dev/) |
| UI | [Tailwind CSS](https://tailwindcss.com/) + [shadcn-vue](https://www.shadcn-vue.com/) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ and [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) (stable toolchain)
- Tauri system dependencies — see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install and Run

```bash
git clone https://github.com/S842155114/ZenRequest.git
cd ZenRequest
pnpm install
pnpm tauri dev
```

### Build for Production

```bash
pnpm tauri build
```

The installer will be output to `src-tauri/target/release/bundle/`.

---

## Project Structure

```
ZenRequest/
├── src/                        # Vue 3 frontend
│   ├── features/
│   │   ├── app-shell/          # Application shell, workspace, tab management
│   │   ├── request-compose/    # Request editor (method, URL, headers, body)
│   │   └── request-workbench/  # Response panel and test results
│   └── shared/                 # Shared types, utilities, UI primitives
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── commands/           # Tauri command handlers
│       ├── db/                 # SQLite schema and queries
│       └── http_client/        # reqwest-based HTTP engine
└── docs/                       # Architecture and design docs
```

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large pull request so we can discuss the approach.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a pull request against `main`

---

## License

ZenRequest is licensed under the [GNU General Public License v3.0](LICENSE).
