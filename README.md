# 🧘‍♂️ ZenRequest 

> A blazingly fast, local-first, and privacy-first API workbench. \
> Built for request authoring, runtime execution, history replay, and offline API engineering without forced cloud syncing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-yellow.svg)

## ✨ The Problem It Solves

Modern API tools (like Postman and Insomnia) have become increasingly bloated, consuming gigabytes of RAM. Worse, they are aggressively pushing forced logins, cloud synchronization, and tracking. 

**ZenRequest** is built for developers who want a local-first API workbench that just works:
- **Instant Startup:** Built with Rust and Tauri, it starts in milliseconds.
- **Featherweight:** Uses a fraction of the memory compared to Electron-based alternatives (< 50MB RAM).
- **100% Offline & Private:** No accounts, no telemetry, no cloud sync. Your data stays on your machine.
- **Local Runtime Ownership:** Request execution and persistence are owned by the local Rust runtime rather than a cloud account or remote control plane.
- **Local SQLite Storage:** User workspaces, requests, environments, history, and session state are stored locally in a runtime-managed SQLite database on your machine.

## Current Baseline

The current desktop baseline already includes:

- Multiple workspaces with persisted sessions
- Collections and saved requests
- Environment variables and template resolution
- Runtime-owned request execution, tests, and history replay
- Workspace and full-application import/export
- Curl import into editable request drafts
- Request-local mock templates
- Response HTML preview

For the canonical implementation and readiness summary, see [Project Baseline Readiness](docs/project-baseline-readiness.md).

## Scope Boundary

ZenRequest is currently a desktop-first Tauri application. Browser-mode mock adapters exist for tests and local component development, but they are not treated as feature-complete runtime parity with the desktop app.

## 🛠️ Tech Stack

This project leverages the modern web and systems programming ecosystem:

- **Core/Backend:** [Rust](https://www.rust-lang.org/) + [Tauri v2](https://v2.tauri.app/)
- **HTTP Engine:** `reqwest` (Asynchronous, high-performance HTTP client)
- **Persistence:** Local SQLite via `rusqlite`
- **Frontend:** [Vue 3](https://vuejs.org/) (Composition API) + [Vite](https://vitejs.dev/) + TypeScript
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn-vue](https://www.shadcn-vue.com/)

## 🚀 Getting Started (Development)

Want to build ZenRequest from source or contribute? Follow these steps:

### Prerequisites
1. **Node.js** (v18+) and **pnpm** (recommended)
2. **Rust** (Install via [rustup](https://rustup.rs/))
3. Tauri OS dependencies (See [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zen-request.git
   cd zen-request
