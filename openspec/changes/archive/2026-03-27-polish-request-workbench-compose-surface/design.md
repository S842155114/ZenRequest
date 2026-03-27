## Context

The current request workbench compose surface already exposes richer lifecycle and readiness information, but its top-level composition is still carrying too many signals in too little vertical space. `RequestPanel` and `RequestUrlBar` both present active-request identity in expanded mode, primary request sections expose counts inconsistently, row-level enable controls are louder than the data they govern, and segmented controls in body/auth groups mix component variants with custom active classes in ways that leave inactive options looking selected.

This change is scoped to the request workbench presentation layer. It spans multiple Vue components and shared styling tokens, but it does not introduce new runtime behavior, data persistence, or backend contracts.

## Goals / Non-Goals

**Goals:**
- Make the expanded request workbench header read as one clear hierarchy instead of two competing identity bands.
- Reduce expanded-mode request-tab width so dense workspaces can keep more tabs visible before horizontal overflow.
- Expose comparable count/density cues across primary request sections.
- Replace noisy row-level enable pills with a quieter control that still communicates enabled vs disabled state clearly.
- Ensure body/auth segmented controls render exactly one active option at a time.

**Non-Goals:**
- Redesign the response workbench or sidebar information architecture.
- Change request lifecycle semantics, save/send behavior, or persistence rules.
- Introduce new request sections or alter request-body/auth data models.

## Decisions

### Decision: Split header responsibilities between navigation and compose identity
`RequestPanel` expanded-mode header will own tab navigation, panel title, and collapse affordance. `RequestUrlBar` will remain the single expanded-mode location for active request identity, provenance, persistence, execution status, and command-row context.

Rationale:
- The current overlap comes from two stacked surfaces both trying to answer “what am I editing?”
- The tab strip already provides request-name context; the compose header should not repeat it again one row above.
- Keeping one identity surface lowers visual competition and gives the URL/action lane more room.

Alternatives considered:
- Keep both surfaces and reduce font size only. Rejected because it preserves duplicated semantics.
- Remove identity from `RequestUrlBar` instead. Rejected because request-local actions and readiness are already anchored there.

### Decision: Compress request tabs into a denser single-line strip
Expanded-mode request tabs will collapse from a stacked metadata card into a denser single-line strip item that keeps only the method token, truncated request name, one compact lifecycle/status indicator, and the close affordance. Collection/provenance/persistence/execution detail remains available in `RequestUrlBar`, the active workbench body, and request-scoped menus instead of being repeated on every tab.

Rationale:
- The current tab cards spend too much horizontal space on metadata already visible elsewhere.
- In multi-tab workflows, width pressure matters more than per-tab descriptive depth.
- A single compact state indicator preserves glanceability without turning the strip into a wall of badges.

Alternatives considered:
- Keep the current two-line card and only reduce padding. Rejected because most of the width cost comes from duplicated metadata, not spacing alone.
- Preserve mini text labels for status in every tab. Rejected because even short labels widen the strip quickly when many tabs are open.

### Decision: Define one badge-count contract for primary request sections
Primary request sections will use count badges wherever the section has meaningful bounded content:
- `Params`, `Headers`, `Env`: count enabled rows.
- `Tests`: count total tests.
- `Body`: count active payload units using body-mode-aware rules.
  - `json`, `raw`, `binary`: `1` when content is meaningfully configured, otherwise `0`
  - `formdata`: count enabled fields with a non-empty key
- `Auth`: `0` for `none`, otherwise `1`

Rationale:
- Users should be able to scan section density without opening each surface.
- Enabled-item counts align with current request execution semantics better than total-row counts.

Alternatives considered:
- Show counts only for list-like sections. Rejected because `Body` and `Auth` still benefit from lightweight density cues.
- Count total rows regardless of enabled state. Rejected because disabled rows are intentionally out of effect.

### Decision: Replace textual enable pills with low-noise state toggles
The current `ON` badge-style control will be replaced by a quieter toggle treatment, such as a compact dot/switch indicator with enabled and disabled visual states but no textual label in every row. Row opacity and focus treatment remain the main affordance for disabled content.

Rationale:
- The left-most column should signal state without shouting over keys and values.
- Repeating `ON` in every row adds visual noise and makes the table feel heavier than necessary.

Alternatives considered:
- Keep the current pill and only recolor it. Rejected because the problem is density and repetition, not just color.
- Remove per-row toggle affordance entirely. Rejected because enabled state still needs direct manipulation.

### Decision: Normalize segmented controls onto one visual primitive
Body-mode selectors, auth-type selectors, and similar request-side segmented groups will stop mixing base button variants for default items. All options will share the same neutral base style, and the active option will be expressed exclusively through the active-state class/tokens.

Rationale:
- The current bug exists because one option starts from `secondary` while the rest start from `ghost`, so inactive defaults retain residual elevation.
- A single segmented primitive is easier to reason about and less likely to regress.

Alternatives considered:
- Keep variant mixing and patch only the `JSON`/`None` cases. Rejected because the same styling bug can reappear in other groups.

## Risks / Trade-offs

- [Risk] Body badge counts may feel approximate for non-list body modes. → Mitigation: keep the rule simple and explicitly content-based (`0` or `1`) for `json`, `raw`, and `binary`.
- [Risk] A quieter row toggle could become less discoverable. → Mitigation: preserve hover/focus affordances and keep disabled-row opacity tied to the same state.
- [Risk] Removing duplicate header content may make the request pane feel visually lighter than before. → Mitigation: keep the tab strip visually strong and retain request identity in the command bar.
- [Risk] Removing tab-level provenance and persistence text could make non-active tabs less self-descriptive. → Mitigation: keep method and request name prominent, map the most actionable state to a compact dot, and leave full detail in the active compose bar and request menus.
