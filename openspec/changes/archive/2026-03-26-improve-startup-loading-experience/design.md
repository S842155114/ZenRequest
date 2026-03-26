## Context

The current Tauri window opens onto an `index.html` document that only contains an empty `#app` mount node. Because the initial body has no visible content, the user sees a white window until the browser loads the frontend bundles, executes `src/main.ts`, mounts Vue, and then finishes `refreshRuntimeState()` inside `App.vue`.

This creates two distinct startup phases:

1. Pre-mount: the WebView exists but Vue has not mounted yet.
2. Bootstrap: Vue is mounted, but runtime data is still loading or can fail.

The current app only models the second phase indirectly through `runtimeReady`, and bootstrap failures are surfaced as toasts after mount. That is enough for normal runtime flows, but it does not address the first blank frame and does not give startup its own visible, recoverable state.

## Goals / Non-Goals

**Goals:**
- Remove the visible white screen during application startup.
- Keep startup feedback inside the existing main window instead of introducing a second launch window.
- Provide a clean handoff from immediate placeholder content into an app-owned startup surface while runtime bootstrap is pending.
- Show a clear startup failure state with a retry path instead of leaving the user with a blank or ambiguous screen.
- Preserve the existing bootstrap command contract and avoid unnecessary backend or Tauri-native changes.

**Non-Goals:**
- Re-architect runtime bootstrap or change backend persistence behavior.
- Introduce a native Tauri splashscreen window or plugin as the default solution.
- Fully optimize startup performance in this change; this work focuses on perceived launch quality and feedback.
- Add complex onboarding, telemetry, or animated brand sequences.

## Decisions

### 1. Use a lightweight pre-mount launch placeholder in `index.html`

The app will render a minimal launch surface directly in `index.html` so content is visible as soon as the WebView paints the document. This placeholder should rely on a tiny amount of inline structure and styling instead of waiting for the bundled CSS and Vue runtime.

Why this approach:
- It is the only reliable way to remove the pre-mount blank frame in the current Tauri + Vite architecture.
- It avoids native-window orchestration complexity.
- It lets the startup look intentional even when bundle load time or machine performance varies.

Alternatives considered:
- Separate native splash window: rejected as the default because it adds window lifecycle coordination, dismissal timing, and theme synchronization overhead for a problem that currently appears to be dominated by the blank HTML document.
- App-only loading state in Vue: rejected because it still leaves a blank frame before Vue mounts.

### 2. Hand off to a Vue-owned startup state after mount

Once Vue mounts, the root app will take ownership of the startup experience. The app should expose an explicit startup phase model such as `booting`, `failed`, and `ready`, instead of relying only on `runtimeReady` plus toasts. While startup is `booting`, the root renders a dedicated startup panel instead of the full workbench. When startup becomes `ready`, the app removes the placeholder and reveals the workbench.

Why this approach:
- It keeps all longer-running startup behavior inside the normal app state tree.
- It allows localized copy, richer status text, retry controls, and consistent transitions with the rest of the UI.
- It makes startup errors first-class instead of side effects.

Alternatives considered:
- Continue using `runtimeReady` plus a toast on error: rejected because it gives poor startup feedback and no dedicated recovery state.
- Render the full workbench immediately with region-level busy overlays: rejected because startup blocks the entire app shell, so a dedicated launch state is clearer.

### 3. Keep the pre-mount placeholder intentionally minimal and theme-safe

The pre-mount placeholder should avoid complex copy or feature content. It should show a branded, non-white surface with a compact loading indicator. Theme behavior should avoid a white flash on dark systems, preferably by using a neutral dark-safe surface or a tiny inline system-theme check. Detailed loading and error text should live in the Vue-owned startup screen where i18n is available.

Why this approach:
- It keeps the pre-mount surface robust even before app settings are loaded.
- It avoids duplicating too much application UI outside the main bundle.
- It reduces the chance of inconsistent copy, layout, or theming between startup phases.

Alternatives considered:
- Full localized startup UI in raw HTML: rejected because it duplicates too much app logic before initialization.
- Plain colored background with no indicator: rejected because it still feels like a stalled window rather than intentional startup feedback.

### 4. Add an explicit startup failure surface with retry

If `refreshRuntimeState()` fails during launch, the app should render a startup failure state in the main window, explain that initialization did not complete, and offer a retry action that reruns bootstrap. Existing toast behavior can remain as supplemental feedback, but it should not be the only signal.

Why this approach:
- Startup errors are otherwise easy to miss or misinterpret.
- Retry is low-cost because bootstrap is already encapsulated in the existing runtime client flow.
- This improves recoverability without expanding scope into deep diagnostics.

Alternatives considered:
- Keep only a toast and blank shell: rejected because it fails the startup experience goal.
- Automatically retry forever: rejected because persistent failures need a stable visible state, not a loop.

## Risks / Trade-offs

- [Duplicated startup styling between raw HTML and Vue] → Keep the pre-mount placeholder visually simple and treat the Vue startup screen as the canonical detailed state.
- [Theme mismatch flash before settings load] → Use a neutral surface or a minimal system-theme-sensitive inline style so the first paint is never pure white.
- [Placeholder not being removed cleanly] → Give the launch placeholder a dedicated DOM id and remove or hide it explicitly once Vue takes over.
- [Startup state grows into a second shell implementation] → Limit the startup screen to branding, status, retry, and no normal workbench controls.

## Migration Plan

This is a frontend-only change with no persisted data migration.

1. Add the launch placeholder to the static document and ensure it is visible before bundle execution.
2. Introduce explicit startup state in the root app and render an application-owned startup screen during bootstrap.
3. Remove the placeholder when the app is ready or replace it with a failure state if bootstrap fails.
4. Verify startup behavior in both normal and failure flows, then ship as part of the normal desktop bundle.

Rollback is straightforward: remove the startup placeholder and startup state UI, returning to the current direct mount flow.

## Open Questions

No product-level open questions remain for this proposal. If implementation later shows that the dominant delay occurs before the HTML document paints at all, a native splash window can be reconsidered in a separate change backed by profiling evidence.
