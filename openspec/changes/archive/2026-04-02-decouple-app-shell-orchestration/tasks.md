## 1. Freeze Current App-Shell Behavior

- [x] 1.1 Review `useAppShell.ts` responsibility boundaries and confirm the highest-risk flows that must remain stable during extraction
- [x] 1.2 Add or strengthen focused regression coverage for bootstrap, workspace switch, request send, request save, and OpenAPI import flows
- [x] 1.3 Keep the current `useAppShell()` outward component contract documented so internals can move without breaking consumers

## 2. Extract Framework-Neutral App-Shell Core

- [x] 2.1 Create the app-shell store module with initial state creation, selectors, and semantic mutations for bootstrap, session, send, and save flows
- [x] 2.2 Create app-shell service result types and service commands for bootstrap, workspace switching, request send, request save, and OpenAPI analyze or apply flows
- [x] 2.3 Move existing pure request and workspace transformation logic into the new store or service boundaries without changing runtime contracts

## 3. Extract Dialog And Adapter Layers

- [x] 3.1 Move dialog state, pending import payloads, and submit branching into a dedicated app-shell dialog workflow module
- [x] 3.2 Move lifecycle hooks, theme sync, viewport handling, persistence timers, and browser-only triggers into a dedicated app-shell effects module
- [x] 3.3 Move component-facing bindings and handler assembly into a dedicated app-shell view-model adapter and thin `useAppShell.ts` into composition glue

## 4. Verify And Stabilize The Refactor

- [x] 4.1 Update or add focused tests for the extracted store, service, dialog, and adapter boundaries while preserving current workbench regression coverage
- [x] 4.2 Run `pnpm test` and resolve any regressions introduced by the extraction
- [x] 4.3 Run `pnpm build` and manually verify workspace switch, request save or send, and OpenAPI import flows through the app shell
