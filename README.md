# 🧘‍♂️ ZenRequest 

> A blazingly fast, purely local, and privacy-first API client. \
> Say goodbye to bloated Electron apps and forced cloud syncing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-yellow.svg)

## ✨ The Problem It Solves

Modern API clients (like Postman and Insomnia) have become increasingly bloated, consuming gigabytes of RAM. Worse, they are aggressively pushing forced logins, cloud synchronization, and tracking. 

**ZenRequest** is built for developers who want a tool that just works:
- **Instant Startup:** Built with Rust and Tauri, it starts in milliseconds.
- **Featherweight:** Uses a fraction of the memory compared to Electron-based alternatives (< 50MB RAM).
- **100% Offline & Private:** No accounts, no telemetry, no cloud sync. Your data stays on your machine.
- **Git-Friendly:** Collections and environments are saved as plain text/JSON files in your file system, making it perfect for Git version control and team collaboration.

## 🛠️ Tech Stack

This project leverages the modern web and systems programming ecosystem:

- **Core/Backend:** [Rust](https://www.rust-lang.org/) + [Tauri v2](https://v2.tauri.app/)
- **HTTP Engine:** `reqwest` (Asynchronous, high-performance HTTP client)
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