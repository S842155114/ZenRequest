## 1. Header Structure

- [x] 1.1 Rework `AppHeader` into explicit brand/navigation, context-switching, and utility zones so the top shell no longer mixes all header controls in one undifferentiated strip.
- [x] 1.2 Replace the current large-screen-only visibility rule for workspace and environment controls with breakpoint-aware compressed layouts that keep both controls visible on desktop, medium, and compact widths.

## 2. Settings And Environment Context

- [x] 2.1 Move language and theme controls out of the primary header row and into a settings-owned surface that uses the existing header settings trigger.
- [x] 2.2 Add lightweight environment metadata to the header environment control and its selection surface so users can see runtime-relevant context such as enabled variable counts.

## 3. Header State And API Cleanup

- [x] 3.1 Update header interaction ownership so request sending does not mask or disable the header, while workspace reloads disable only the workspace/environment context controls.
- [x] 3.2 Remove stale header API surface such as the unused `openTabCount` path and add any required i18n-managed copy for the new header settings and environment metadata treatments.

## 4. Verification

- [x] 4.1 Add or update frontend tests covering header zone rendering, responsive workspace/environment visibility, settings-hosted language/theme access, environment metadata visibility, and scoped disabled-state behavior.
- [ ] 4.2 Run `pnpm test` plus targeted manual verification of desktop, medium, and compact header behavior to confirm both context controls stay visible, settings owns language/theme, and request sending leaves the header interactive.
