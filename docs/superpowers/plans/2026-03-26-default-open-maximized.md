# Default Open Maximized Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ZenRequest desktop window launch maximized while preserving the normal OS title bar, taskbar, and non-fullscreen window behavior.

**Architecture:** Implement this entirely in the Tauri shell configuration by setting the main window to start maximized in `src-tauri/tauri.conf.json`. Do not add frontend startup code or Rust runtime window-management logic unless config-based maximize proves unsupported.

**Tech Stack:** Tauri 2 config JSON, pnpm, Vite build validation

---

### Task 1: Update Main Window Startup State

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Write the failing configuration check**

```bash
node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8')); const win=config.app?.windows?.[0]; if (win?.maximized === true) { process.exit(0); } console.error('Expected app.windows[0].maximized to be true'); process.exit(1);"
```

Expected: FAIL with `Expected app.windows[0].maximized to be true`

- [ ] **Step 2: Run the check to verify it fails**

Run:

```bash
node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8')); const win=config.app?.windows?.[0]; if (win?.maximized === true) { process.exit(0); } console.error('Expected app.windows[0].maximized to be true'); process.exit(1);"
```

Expected: exit code `1` and the message `Expected app.windows[0].maximized to be true`

- [ ] **Step 3: Write the minimal implementation**

Update the first window entry in `src-tauri/tauri.conf.json` from:

```json
{
  "title": "zenrequest",
  "width": 800,
  "height": 600
}
```

to:

```json
{
  "title": "zenrequest",
  "width": 800,
  "height": 600,
  "maximized": true
}
```

- [ ] **Step 4: Run the check to verify it passes**

Run:

```bash
node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8')); const win=config.app?.windows?.[0]; if (win?.maximized === true) { console.log('maximized=true configured'); process.exit(0); } console.error('Expected app.windows[0].maximized to be true'); process.exit(1);"
```

Expected: PASS with `maximized=true configured`

- [ ] **Step 5: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: open desktop window maximized by default"
```

### Task 2: Validate Shell Behavior Still Builds Cleanly

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Verify: `dist/`

- [ ] **Step 1: Run the existing project build**

Run:

```bash
pnpm build
```

Expected: PASS with Vite production build completing successfully

- [ ] **Step 2: Validate the config still parses after the build**

Run:

```bash
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('tauri.conf.json parsed successfully');"
```

Expected: PASS with `tauri.conf.json parsed successfully`

- [ ] **Step 3: Manual desktop verification**

Run:

```bash
pnpm tauri dev
```

Expected:
- The main window opens maximized on launch
- The OS title bar remains visible
- The OS taskbar remains visible
- The app is not in true fullscreen mode

- [ ] **Step 4: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "test: verify maximized startup window behavior"
```

## Self-Review

- **Spec coverage:** The plan covers the only required behavior: startup maximization without fullscreen. It also includes the fallback-free implementation choice from the design.
- **Placeholder scan:** No TODO, TBD, or vague “handle later” steps remain.
- **Type consistency:** The configuration key is consistently named `maximized`, matching the intended Tauri window property throughout the plan.
