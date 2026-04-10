---
phase: 14
plan: 14-PLAN
status: proposed
type: docs
wave: 1
depends_on:
  - 13
files_modified:
  - README.en.md
  - docs/
autonomous: false
requirements:
  - DOCS-03
  - DOCS-04
---

<objective>
Create an English tutorial manual that mirrors the Chinese manual structure and add a first-pass screenshot organization layer, without changing shipped product behavior.
</objective>

<scope>
- Create an English manual under `docs/` that mirrors `docs/zh-CN-manual.md`
- Update `README.en.md` so it acts as the English quick-start and manual entry hub
- Establish a lightweight screenshot folder/reference convention for the English docs
- Reuse existing Chinese screenshots or placeholders where needed

Out of scope:
- New product functionality
- Independent English screenshot production for every chapter
- Reworking the Chinese manual structure
- Full docs-site or localization automation work
</scope>

<tasks>

### Task 14-01 — Create the mirrored English manual
- **Type:** Docs content
- **Files:** `docs/` English manual files
- **Action:** Author an English manual that mirrors the Chinese manual’s chapter order, scope, and main section boundaries while using natural English prose.
- **Verify:** The English manual covers the same mainline areas as the Chinese manual: HTTP, MCP, import, history/replay, and `stdio`.
- **Acceptance criteria:** English manual structure corresponds to the Chinese manual, satisfying `DOCS-03`.

### Task 14-02 — Refocus `README.en.md` into an English doc hub
- **Type:** Docs IA
- **Files:** `README.en.md`
- **Action:** Keep `README.en.md` concise while adding clear links into the English manual and its key onboarding chapters.
- **Verify:** English readers can discover the tutorial manual directly from the repository landing page.
- **Acceptance criteria:** `README.en.md` routes into the English manual clearly, satisfying `DOCS-03`.

### Task 14-03 — Add first-pass screenshot organization
- **Type:** Docs assets
- **Files:** `docs/` screenshot-related files or folders
- **Action:** Create a simple screenshot directory and reference strategy for the English manual, reusing Chinese screenshots where possible and documenting that reuse implicitly through stable paths.
- **Verify:** Screenshot placement is organized and non-blocking even if only a subset is present in the first pass.
- **Acceptance criteria:** First-pass screenshot organization exists and English docs can point to it, satisfying `DOCS-04`.

### Task 14-04 — Align bilingual doc pathways
- **Type:** Docs integration
- **Files:** `README.en.md`, English manual files
- **Action:** Ensure English doc navigation mirrors the Chinese-side pathway philosophy: README as entry hub, manual as continuous tutorial, screenshots as supporting assets.
- **Verify:** Links resolve and the English docs do not invent a divergent help model.
- **Acceptance criteria:** English docs remain aligned with Chinese docs and product help flow.

</tasks>

<verification>
- Compare English manual section order against `docs/zh-CN-manual.md`
- Review `README.en.md` links into the English manual and key sections
- Confirm required areas are covered: HTTP, MCP, import, history/replay, `stdio`
- Confirm screenshot folder/reference organization exists and is reusable
</verification>

<success_criteria>
- English manual exists under `docs/`
- English manual mirrors the Chinese manual structure closely
- `README.en.md` provides quick-start plus English manual entry links
- Screenshot organization exists for a first pass without blocking on exhaustive assets
</success_criteria>

<implementation_notes>
- Prefer one primary English manual file over many fragmented files
- Reuse Chinese screenshots in this phase rather than creating a separate English screenshot set
- Keep English prose natural, but do not change chapter boundaries or coverage
</implementation_notes>
