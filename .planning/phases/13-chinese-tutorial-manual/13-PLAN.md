---
phase: 13
plan: 13-PLAN
status: proposed
type: docs
wave: 1
depends_on: []
files_modified:
  - README.md
  - docs/
autonomous: false
requirements:
  - DOCS-01
  - DOCS-02
  - IA-02
---

<objective>
Create a Chinese tutorial manual and a README navigation/quick-start layer that together make ZenRequest’s current shipped capabilities understandable and approachable for new users.
</objective>

<scope>
- Refactor `README.md` into a cleaner quick-start and documentation entry surface
- Create the Chinese manual structure under `docs/`
- Cover HTTP, MCP, import flows, history/replay, and `stdio`
- Keep the manual tutorial-oriented, not a loose feature dump
- Ensure terminology and links match shipped UI and existing product wording

Out of scope:
- English manual
- Full screenshot pass
- Product behavior changes
- Exhaustive FAQ/reference encyclopedia
</scope>

<tasks>

### Task 13-01 — Refocus README as quick-start and docs hub
- **Type:** Docs IA
- **Files:** `README.md`
- **Action:** Restructure README so it remains concise and acts as the repo landing page: product summary, installation/run basics, core capability overview, and clear links into the Chinese manual.
- **Verify:** README still works as a standalone entry page and clearly routes readers to the Chinese manual.
- **Acceptance criteria:** `README` provides quick start and doc entry, satisfying `DOCS-01`.

### Task 13-02 — Create the Chinese manual skeleton with hybrid structure
- **Type:** Docs structure
- **Files:** `docs/` (new or updated Chinese manual files)
- **Action:** Create the Chinese manual with a hybrid information architecture: the first section follows a first-use workflow, later sections organize stable capabilities by module.
- **Verify:** The structure clearly separates flow-first onboarding from capability-specific chapters.
- **Acceptance criteria:** The manual reads like a tutorial and not a fragmented feature index.

### Task 13-03 — Author core Chinese manual content for shipped capabilities
- **Type:** Docs content
- **Files:** `docs/` Chinese manual files
- **Action:** Write grounded documentation for HTTP, MCP, import, history/replay, and `stdio`, using terminology aligned with current UI and product behavior.
- **Verify:** Each required capability from `IA-02` is explicitly covered.
- **Acceptance criteria:** Chinese manual covers the current mainline capabilities and reflects shipped behavior accurately.

### Task 13-04 — Align links and wording across README, docs, and product help
- **Type:** Docs integration
- **Files:** `README.md`, `docs/` Chinese manual files
- **Action:** Ensure README links correctly into the Chinese manual and that the manual acknowledges the in-app help/settings entry and `stdio` onboarding introduced in Phase 12.
- **Verify:** Manual link paths resolve and wording stays consistent with product labels.
- **Acceptance criteria:** README, docs, and in-product help form a coherent navigation path, satisfying `DOCS-01` and `IA-02`.

</tasks>

<verification>
- Review README and Chinese manual links for navigability
- Confirm required areas are covered: HTTP, MCP, import, history/replay, `stdio`
- Spot-check terminology against `src/lib/i18n.ts` and shipped UI surfaces
- Ensure the Chinese manual starts with a workflow section before moving to module sections
</verification>

<success_criteria>
- README offers clear quick-start and doc entry navigation
- Chinese tutorial manual exists under `docs/`
- Manual covers current shipped mainline capabilities
- Structure is hybrid: flow-first onboarding + module-based reference chapters
- Documentation and product help pathways are mutually reinforcing
</success_criteria>

<implementation_notes>
- Prefer a small number of well-structured docs over many shallow files
- Reuse product wording from `src/lib/i18n.ts` where it improves consistency
- Avoid promising future capabilities or screenshots not yet delivered
</implementation_notes>
