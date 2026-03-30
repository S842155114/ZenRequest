# Local API Workbench UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the ZenRequest workbench UI so it reads as a local-first developer API workbench with a light `Signal Light` visual system, while preserving the current workbench behavior.

**Architecture:** Keep the existing workbench structure and push the redesign through shared theme tokens in `src/style.css`, then restyle the four primary workbench surfaces: header, sidebar, request workspace, and response diagnostics. Implementation must happen on a GitFlow feature branch created from `develop`, with the finished work merged back into `develop` through a PR after verification.

**Tech Stack:** Vue 3, TypeScript, Vitest, Tailwind 4 utility classes, shared CSS tokens in `src/style.css`, pnpm, GitFlow

---

## GitFlow Preflight

Before any code changes, move implementation onto a dedicated feature branch and worktree. Do not implement this plan directly on `develop`.

Run:

```bash
git worktree add -b feature/local-api-workbench-ui-refresh ../ZenRequest-ui-refresh develop
cd ../ZenRequest-ui-refresh
git status --short
```

Expected:

- A new worktree exists at `../ZenRequest-ui-refresh`
- The active branch is `feature/local-api-workbench-ui-refresh`
- `git status --short` prints no tracked-file changes before implementation starts

Merge target after implementation:

- open a PR from `feature/local-api-workbench-ui-refresh` into `develop`

### Task 1: Refresh Shared Signal-Light Theme Tokens

**Files:**
- Create: `src/style.tokens.test.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing token guard**

Create `src/style.tokens.test.ts` with:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8')

describe('workbench theme tokens', () => {
  it('defines the signal-light palette and developer typography', () => {
    expect(css).toContain('--zr-accent-strong: #ca6f43;')
    expect(css).toContain('--zr-signal-strong: #17a57c;')
    expect(css).toContain('--zr-signal-soft: rgba(23, 165, 124, 0.12);')
    expect(css).toContain('font-family: "IBM Plex Sans", "Segoe UI", "Helvetica Neue", sans-serif;')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm vitest run src/style.tokens.test.ts
```

Expected: FAIL because `src/style.css` does not yet define the approved `Signal Light` token values.

- [ ] **Step 3: Write the minimal implementation**

Update the light and dark token blocks in `src/style.css` so they include the approved orange/teal split and calmer neutral surfaces. Apply this exact token block inside `:root`:

```css
  --zr-panel-bg: rgba(246, 248, 250, 0.94);
  --zr-header-bg: rgba(243, 246, 248, 0.94);
  --zr-elevated: rgba(255, 255, 255, 0.98);
  --zr-chip-bg: rgba(239, 243, 246, 0.96);
  --zr-soft-bg: rgba(236, 240, 244, 0.82);
  --zr-control-bg: rgba(251, 252, 253, 0.96);
  --zr-control-hover: rgba(30, 41, 59, 0.07);
  --zr-border: rgba(21, 31, 43, 0.11);
  --zr-border-soft: rgba(21, 31, 43, 0.07);
  --zr-text-primary: #16212b;
  --zr-text-secondary: #526170;
  --zr-text-muted: #7b8795;
  --zr-accent-soft: rgba(202, 111, 67, 0.1);
  --zr-accent-border: rgba(202, 111, 67, 0.28);
  --zr-accent-strong: #ca6f43;
  --zr-signal-soft: rgba(23, 165, 124, 0.12);
  --zr-signal-strong: #17a57c;
```

Apply this exact token block inside `[data-theme='dark']`:

```css
  --zr-panel-bg: rgba(15, 20, 27, 0.96);
  --zr-header-bg: rgba(18, 24, 31, 0.95);
  --zr-elevated: rgba(24, 31, 39, 0.98);
  --zr-chip-bg: rgba(25, 32, 41, 0.96);
  --zr-soft-bg: rgba(23, 30, 38, 0.88);
  --zr-control-bg: rgba(21, 28, 36, 0.94);
  --zr-control-hover: rgba(255, 255, 255, 0.08);
  --zr-border: rgba(255, 255, 255, 0.1);
  --zr-border-soft: rgba(255, 255, 255, 0.07);
  --zr-text-primary: #e8eef5;
  --zr-text-secondary: #bac4d1;
  --zr-text-muted: #8691a0;
  --zr-accent-soft: rgba(202, 111, 67, 0.14);
  --zr-accent-border: rgba(202, 111, 67, 0.34);
  --zr-accent-strong: #d17a4f;
  --zr-signal-soft: rgba(23, 165, 124, 0.16);
  --zr-signal-strong: #3ec49a;
```

- [ ] **Step 4: Run the token guard again**

Run:

```bash
pnpm vitest run src/style.tokens.test.ts
```

Expected: PASS with the new token values detected in `src/style.css`.

- [ ] **Step 5: Commit**

```bash
git add src/style.css src/style.tokens.test.ts
git commit -m "feat: add signal-light workbench theme tokens"
```

### Task 2: Rebuild the Header as a Context Bar

**Files:**
- Modify: `src/components/layout/AppHeader.vue`
- Modify: `src/components/layout/AppHeader.test.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing header behavior test**

Add this test to `src/components/layout/AppHeader.test.ts`:

```ts
  it('uses a wordmark-first desktop brand and a compact fallback mark', () => {
    const desktop = mountHeader()

    expect(desktop.get('[data-testid="header-brand-wordmark"]').text()).toBe('ZenRequest')
    expect(desktop.find('[data-testid="header-brand-compact-mark"]').exists()).toBe(false)

    const compact = mountHeader({
      isCompactLayout: true,
    })

    expect(compact.find('[data-testid="header-brand-wordmark"]').exists()).toBe(false)
    expect(compact.get('[data-testid="header-brand-compact-mark"]').text()).toBe('ZR')
  })
```

- [ ] **Step 2: Run the focused header test file and verify failure**

Run:

```bash
pnpm vitest run src/components/layout/AppHeader.test.ts
```

Expected: FAIL because the header still renders the old badge-only brand block and does not expose the new wordmark/compact-mark test IDs.

- [ ] **Step 3: Write the minimal implementation**

Replace the current brand block in `src/components/layout/AppHeader.vue` with:

```vue
          <div v-if="isCompactLayout" data-testid="header-brand-compact-mark" class="zr-brand-compact-mark">
            ZR
          </div>

          <div v-else class="min-w-0">
            <div
              data-testid="header-brand-wordmark"
              class="zr-brand-wordmark truncate"
            >
              ZenRequest
            </div>
            <div class="zr-brand-context mt-0.5 truncate">
              {{ activeWorkspaceName }}
            </div>
          </div>
```

Add these classes to `src/style.css`:

```css
  .zr-brand-wordmark {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--zr-text-primary);
  }

  .zr-brand-context {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--zr-text-muted);
  }

  .zr-brand-compact-mark {
    display: inline-flex;
    height: 2rem;
    width: 2rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.6rem;
    border: 1px solid color-mix(in srgb, var(--zr-accent-border) 78%, var(--zr-border));
    background: color-mix(in srgb, var(--zr-accent-soft) 78%, var(--zr-elevated));
    color: var(--zr-text-primary);
    font-size: 0.7rem;
    font-weight: 700;
  }
```

- [ ] **Step 4: Run the header test file again**

Run:

```bash
pnpm vitest run src/components/layout/AppHeader.test.ts
```

Expected: PASS with the desktop wordmark and compact fallback mark both covered.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppHeader.vue src/components/layout/AppHeader.test.ts src/style.css
git commit -m "feat: restyle workbench header as context bar"
```

### Task 3: Restyle the Sidebar as an Explorer with an Explicit Active Signal

**Files:**
- Modify: `src/components/layout/AppSidebar.vue`
- Modify: `src/components/layout/AppSidebar.test.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing sidebar chrome test**

Add this test to `src/components/layout/AppSidebar.test.ts`:

```ts
  it('renders workset pills and a dedicated active-row signal rail', () => {
    const wrapper = mountSidebar()

    expect(wrapper.get('[data-testid="sidebar-workset-open"]').classes()).toContain('zr-workset-pill')
    expect(wrapper.get('[data-testid="request-row-signal-request-orders-list"]').classes()).toContain(
      'zr-request-row-signal-active',
    )
  })
```

- [ ] **Step 2: Run the focused sidebar test file and verify failure**

Run:

```bash
pnpm vitest run src/components/layout/AppSidebar.test.ts
```

Expected: FAIL because the workset pills and request rows do not yet expose the new explorer-specific classes and signal rail.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/layout/AppSidebar.vue`, update the summary pills and request row template to:

```vue
        <span
          v-for="item in worksetSummaryItems"
          :key="item.key"
          :data-testid="`sidebar-workset-${item.key}`"
          class="zr-workset-pill rounded-full px-2 py-0.5 text-[10px] font-medium"
        >
          {{ item.label }} {{ item.value }}
        </span>
```

and:

```vue
                      <span
                        :data-testid="`request-row-signal-${getTestIdKey(request.id)}`"
                        :class="[
                          'zr-request-row-signal mt-0.5 shrink-0 rounded-full',
                          requestRowIsActive(request.id)
                            ? 'zr-request-row-signal-active'
                            : 'zr-request-row-signal-idle',
                        ]"
                      />
```

Add these classes to `src/style.css`:

```css
  .zr-workset-pill {
    border: 1px solid color-mix(in srgb, var(--zr-border) 84%, transparent);
    background: color-mix(in srgb, var(--zr-chip-bg) 94%, transparent);
    color: var(--zr-text-secondary);
  }

  .zr-request-row-signal {
    width: 0.25rem;
    min-height: 2rem;
    background: color-mix(in srgb, var(--zr-border-soft) 88%, transparent);
  }

  .zr-request-row-signal-active {
    background: linear-gradient(180deg, var(--zr-accent-strong), var(--zr-signal-strong));
  }

  .zr-request-row-signal-idle {
    opacity: 0.5;
  }
```

- [ ] **Step 4: Run the sidebar test file again**

Run:

```bash
pnpm vitest run src/components/layout/AppSidebar.test.ts
```

Expected: PASS with explorer pills and the active-row signal rail covered.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppSidebar.vue src/components/layout/AppSidebar.test.ts src/style.css
git commit -m "feat: refresh sidebar explorer styling"
```

### Task 4: Rebalance the Request Workspace Around Context and Actions

**Files:**
- Modify: `src/components/request/RequestPanel.vue`
- Modify: `src/components/request/RequestUrlBar.vue`
- Modify: `src/components/request/RequestUrlBar.test.ts`
- Modify: `src/components/request/RequestParams.vue`
- Modify: `src/components/request/RequestParams.test.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing request chrome tests**

Add this test to `src/components/request/RequestUrlBar.test.ts`:

```ts
  it('separates context chips from action controls and uses a signal pill for environment metadata', () => {
    const wrapper = mountUrlBar()

    expect(wrapper.find('[data-testid="request-command-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="request-command-actions"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="request-command-meta-environment"]').classes()).toContain(
      'zr-status-pill-signal',
    )
  })
```

Add this test to `src/components/request/RequestParams.test.ts`:

```ts
  it('uses a dedicated compose rail for primary and secondary request sections', () => {
    const wrapper = mountRequestParams()

    expect(wrapper.get('[data-testid="request-compose-rail"]').classes()).toContain('zr-compose-rail')
    expect(wrapper.get('[data-testid="request-section-trigger-mock"]').attributes('data-request-secondary')).toBe(
      'true',
    )
  })
```

- [ ] **Step 2: Run the focused request test files and verify failure**

Run:

```bash
pnpm vitest run src/components/request/RequestUrlBar.test.ts src/components/request/RequestParams.test.ts src/components/request/RequestPanel.test.ts
```

Expected: FAIL because the request command surface and compose rail do not yet expose the new context/action separation or compose-rail class.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/request/RequestUrlBar.vue`, change the identity and action sections to:

```vue
        <div data-testid="request-command-context" class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            data-testid="request-identity-origin"
            :class="['zr-status-pill', originBadgeClass]"
          >
            {{ originLabel }}
          </span>
          <span
            data-testid="request-identity-persistence"
            :class="['zr-status-pill', persistenceBadgeClass]"
          >
            {{ persistenceLabel }}
          </span>
          <span
            data-testid="request-identity-execution"
            :class="['zr-status-pill', executionBadgeClass]"
          >
            {{ executionLabel }}
          </span>
        </div>
```

and:

```vue
      <div data-testid="request-command-actions" class="flex items-center gap-2">
        <Button
          data-testid="request-command-send"
          @click="emit('send')"
          :disabled="isLoading || hasBlockingIssues"
          class="zr-primary-action h-9 rounded-md px-4 text-[13px] font-semibold disabled:opacity-50"
        >
          {{ isLoading ? text.request.sending : text.request.send }}
        </Button>

        <Button variant="ghost" size="icon" class="zr-secondary-action h-9 w-9 rounded-md" @click="emit('save')">
          <Save class="h-3.5 w-3.5" />
        </Button>
      </div>
```

Update the environment chip in `src/components/request/RequestUrlBar.vue` to:

```vue
      <span
        data-testid="request-command-meta-environment"
        class="zr-status-pill zr-status-pill-signal rounded-full px-2 py-0.5"
      >
        {{ text.request.environment }}: {{ environmentName }}
      </span>
```

Update `src/components/request/RequestParams.vue` so the rail starts with:

```vue
    <TabsList
      data-testid="request-compose-rail"
      class="zr-compose-rail mx-3 mt-3 w-fit shrink-0 rounded-lg p-0.5"
    >
```

Add these shared classes to `src/style.css`:

```css
  .zr-status-pill {
    border: 1px solid color-mix(in srgb, var(--zr-border) 84%, transparent);
    background: color-mix(in srgb, var(--zr-chip-bg) 94%, transparent);
    color: var(--zr-text-secondary);
  }

  .zr-status-pill-signal {
    border-color: color-mix(in srgb, var(--zr-signal-strong) 34%, var(--zr-border));
    background: color-mix(in srgb, var(--zr-signal-soft) 88%, var(--zr-chip-bg));
    color: color-mix(in srgb, var(--zr-signal-strong) 86%, white 14%);
  }

  .zr-compose-rail {
    border: 1px solid color-mix(in srgb, var(--zr-border-soft) 92%, transparent);
    background: color-mix(in srgb, var(--zr-panel-muted) 86%, var(--zr-elevated));
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--zr-elevated) 16%, transparent);
  }
```

- [ ] **Step 4: Run the request test files again**

Run:

```bash
pnpm vitest run src/components/request/RequestUrlBar.test.ts src/components/request/RequestParams.test.ts src/components/request/RequestPanel.test.ts
```

Expected: PASS with the request command lanes and compose rail covered.

- [ ] **Step 5: Commit**

```bash
git add src/components/request/RequestPanel.vue src/components/request/RequestUrlBar.vue src/components/request/RequestUrlBar.test.ts src/components/request/RequestParams.vue src/components/request/RequestParams.test.ts src/style.css
git commit -m "feat: rebalance request work surface hierarchy"
```

### Task 5: Convert the Response Area into a Lighter Diagnostic Surface

**Files:**
- Modify: `src/components/response/ResponsePanel.vue`
- Modify: `src/components/response/ResponsePanel.test.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing response diagnostic test**

Add this test to `src/components/response/ResponsePanel.test.ts`:

```ts
  it('renders response readouts and state badges with shared diagnostic chrome', () => {
    const wrapper = mount(ResponsePanel, {
      props: {
        locale: 'en',
      },
    })

    expect(wrapper.get('[data-testid="response-state-badge"]').classes()).toContain('zr-status-pill')
    expect(wrapper.get('[data-testid="response-readout-request"]').classes()).toContain('zr-response-readout')
    expect(wrapper.get('[data-testid="response-readout-time"]').classes()).toContain('zr-response-readout')
    expect(wrapper.get('[data-testid="response-readout-size"]').classes()).toContain('zr-response-readout')
  })
```

- [ ] **Step 2: Run the focused response test file and verify failure**

Run:

```bash
pnpm vitest run src/components/response/ResponsePanel.test.ts
```

Expected: FAIL because the response header does not yet expose shared status-pill chrome or dedicated readout test IDs.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/response/ResponsePanel.vue`, update the state badge classes in `stateMeta` to use shared pill classes:

```ts
        badgeClass: 'zr-status-pill zr-status-pill-neutral'
```

```ts
        badgeClass: 'zr-status-pill zr-status-pill-warn'
```

```ts
        badgeClass: 'zr-status-pill zr-status-pill-error'
```

```ts
        badgeClass: 'zr-status-pill zr-status-pill-success'
```

Update the three response readouts to:

```vue
        <span data-testid="response-readout-request" class="zr-response-readout inline-flex max-w-[320px] items-center gap-1.5 rounded-full px-1.5 py-0.5">
          <span class="font-semibold text-orange-700 dark:text-orange-300">{{ requestMethod }}</span>
          <span class="truncate font-mono text-[var(--zr-text-primary)]">{{ requestUrl }}</span>
        </span>
        <span data-testid="response-readout-time" class="zr-response-readout inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5">
          <Clock3 class="h-3.5 w-3.5 text-[var(--zr-signal-strong)]" />
          <span class="font-mono text-[var(--zr-text-primary)]">{{ time }}</span>
        </span>
        <span data-testid="response-readout-size" class="zr-response-readout inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5">
          <HardDrive class="h-3.5 w-3.5 text-[var(--zr-text-muted)]" />
          <span class="font-mono text-[var(--zr-text-primary)]">{{ size }}</span>
        </span>
```

Add these classes to `src/style.css`:

```css
  .zr-status-pill-neutral {
    background: color-mix(in srgb, var(--zr-chip-bg) 94%, transparent);
    color: var(--zr-text-secondary);
  }

  .zr-status-pill-warn {
    border-color: rgba(245, 158, 11, 0.28);
    background: rgba(245, 158, 11, 0.1);
    color: rgb(180 83 9);
  }

  .zr-status-pill-success {
    border-color: color-mix(in srgb, var(--zr-signal-strong) 34%, var(--zr-border));
    background: color-mix(in srgb, var(--zr-signal-soft) 88%, var(--zr-chip-bg));
    color: color-mix(in srgb, var(--zr-signal-strong) 84%, white 16%);
  }

  .zr-status-pill-error {
    border-color: rgba(244, 63, 94, 0.28);
    background: rgba(244, 63, 94, 0.1);
    color: rgb(190 24 93);
  }

  .zr-response-readout {
    border: 1px solid color-mix(in srgb, var(--zr-border) 84%, transparent);
    background: color-mix(in srgb, var(--zr-chip-bg) 94%, transparent);
    color: var(--zr-text-secondary);
  }
```

- [ ] **Step 4: Run the response test file again**

Run:

```bash
pnpm vitest run src/components/response/ResponsePanel.test.ts
```

Expected: PASS with the readout chips and shared diagnostic status chrome covered.

- [ ] **Step 5: Commit**

```bash
git add src/components/response/ResponsePanel.vue src/components/response/ResponsePanel.test.ts src/style.css
git commit -m "feat: restyle response panel as diagnostic surface"
```

### Task 6: Run Full Verification and Finish the GitFlow Branch

**Files:**
- Verify: `src/style.css`
- Verify: `src/components/layout/AppHeader.vue`
- Verify: `src/components/layout/AppSidebar.vue`
- Verify: `src/components/request/RequestPanel.vue`
- Verify: `src/components/request/RequestUrlBar.vue`
- Verify: `src/components/request/RequestParams.vue`
- Verify: `src/components/response/ResponsePanel.vue`
- Verify: `src/style.tokens.test.ts`

- [ ] **Step 1: Run the full frontend test suite**

Run:

```bash
pnpm test
```

Expected: PASS with the full Vitest suite green.

- [ ] **Step 2: Run the production build**

Run:

```bash
pnpm build
```

Expected: PASS with `vue-tsc --noEmit` and the Vite production build completing successfully.

- [ ] **Step 3: Manually review the approved UI states**

Run:

```bash
pnpm dev
```

Expected manual checks:

- light theme and dark theme both preserve the same Signal Light hierarchy
- widths `375`, `768`, `1024`, and `1440` keep request-first hierarchy
- header branding stays secondary to workspace/environment context
- sidebar active rows read through the signal rail instead of a heavy fill
- request command bar clearly separates context chips from actions
- response header reads as a diagnostic surface, not a competing primary panel

- [ ] **Step 4: Verify branch cleanliness before pushing**

Run:

```bash
git status --short
git log --oneline develop..HEAD
```

Expected:

- `git status --short` is empty
- `git log --oneline develop..HEAD` shows the feature commits from Tasks 1-5

- [ ] **Step 5: Push the feature branch and prepare the PR into `develop`**

Run:

```bash
git push -u origin feature/local-api-workbench-ui-refresh
```

Expected: PASS with the feature branch published to `origin` and ready for a PR into `develop`.

## Self-Review

- **Spec coverage:** Task 1 establishes the global visual system. Task 2 implements the context-bar header and optional compact mark. Task 3 implements the explorer-style sidebar and active signal rail. Task 4 rebalances the request workspace around context and actions. Task 5 turns the response area into a diagnostic surface. Task 6 verifies theme, layout, and GitFlow completion.
- **Plan hygiene:** No unresolved markers, vague implementation notes, or undefined commands remain.
- **Type consistency:** The shared class names introduced in the plan are consistent across test snippets and component snippets: `zr-status-pill`, `zr-status-pill-signal`, `zr-compose-rail`, `zr-response-readout`, `zr-workset-pill`, `zr-request-row-signal-active`.
