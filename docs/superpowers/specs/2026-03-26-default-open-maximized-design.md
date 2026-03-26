## Context

The desktop shell is configured in `src-tauri/tauri.conf.json` with a fixed initial width and height only. On launch, the app opens as a normal 800x600 window. The requested behavior is to start maximized while still preserving the normal desktop window model, including the system title bar and taskbar.

This is explicitly not a fullscreen requirement. Fullscreen would hide more system chrome and change the interaction model in a way the user did not ask for.

## Goals / Non-Goals

**Goals:**
- Open the main application window maximized on startup.
- Preserve standard OS window chrome and taskbar visibility.
- Prefer the smallest possible change with the most predictable startup behavior.

**Non-Goals:**
- Do not enable true fullscreen mode.
- Do not add runtime toggles, persisted user preferences, or settings UI.
- Do not change multi-window behavior or introduce startup scripts unless configuration proves insufficient.

## Decisions

### 1. Configure the main Tauri window to start maximized

The preferred implementation is to update the main window entry in `src-tauri/tauri.conf.json` so the shell starts in a maximized state.

Why:
- It is the smallest and most stable solution.
- The window launches in the desired size immediately, without a visible resize after startup.
- It keeps the behavior in the shell layer where startup window defaults belong.

Alternative considered:
- Calling maximize from Rust on startup. Rejected because it adds runtime code for behavior that should be expressible as static window configuration.
- Calling maximize from the frontend after mount. Rejected because the user would briefly see the wrong window state before it resizes.

### 2. Keep existing width and height values only as fallback metadata unless the shell ignores them when maximized

The existing width and height values can remain unless they conflict with Tauri’s maximized startup behavior. This keeps the config readable and avoids unnecessary changes.

Why:
- They still document the non-maximized default window size.
- Removing unrelated fields does not improve the requested behavior.

## Risks / Trade-offs

- [Platform-specific startup behavior differs slightly] → Verify in development and packaged builds that maximized startup is honored on the target desktop platform.
- [Config key unsupported in this Tauri setup] → Fallback to a Rust-side startup maximize call only if config-based maximize is not honored.
- [Future user preference requirement conflicts with global default] → Add persisted window-state preferences in a separate change if needed.
