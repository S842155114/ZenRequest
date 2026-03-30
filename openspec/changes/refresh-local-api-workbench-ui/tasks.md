## 1. GitFlow Setup And Shared Theme Foundation

- [x] 1.1 Create a dedicated `feature/local-api-workbench-ui-refresh` worktree from `develop` before modifying implementation files
- [x] 1.2 Add or update focused token coverage for the approved `Signal Light` palette and developer typography
- [x] 1.3 Refresh shared workbench theme tokens and reusable status or signal classes in `src/style.css`

## 2. Header And Explorer Refresh

- [x] 2.1 Restyle `AppHeader` as a context-first workbench bar with a desktop wordmark and compact fallback mark
- [x] 2.2 Update `AppHeader.test.ts` to cover the approved header branding and context-bar behavior
- [x] 2.3 Restyle `AppSidebar` as a denser explorer with workset summary pills and explicit active-row signal treatment
- [x] 2.4 Update `AppSidebar.test.ts` to cover explorer workset summaries and active-row signal rendering

## 3. Request And Response Workbench Surfaces

- [x] 3.1 Rebalance `RequestUrlBar` and `RequestPanel` so request identity, primary actions, and context chips read as one focused authoring surface
- [x] 3.2 Update `RequestUrlBar.test.ts` and `RequestPanel.test.ts` to cover the new request command hierarchy
- [x] 3.3 Refresh `RequestParams` section-rail styling without changing the underlying request-compose workflow
- [x] 3.4 Update `RequestParams.test.ts` to cover the dedicated compose rail treatment
- [x] 3.5 Restyle `ResponsePanel` as a lighter diagnostic surface with shared lifecycle pills and readout chips
- [x] 3.6 Update `ResponsePanel.test.ts` to cover the new diagnostic readouts and shared status chrome

## 4. Verification And Merge Preparation

- [x] 4.1 Run the full frontend test suite and resolve any regressions introduced by the workbench refresh
- [x] 4.2 Run a production build and verify the refreshed workbench compiles cleanly
- [x] 4.3 Manually verify light and dark themes plus target widths `375`, `768`, `1024`, and `1440`
- [ ] 4.4 Confirm the feature branch is clean, push it, and prepare a PR back into `develop`
