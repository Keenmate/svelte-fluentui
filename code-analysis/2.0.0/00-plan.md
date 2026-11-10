# 2.0.0 revision — consolidated plan

Sources: [01-api-naming](01-api-naming.md) · [02-duplication](02-duplication.md) · [03-code-style](03-code-style.md) · [04-styling](04-styling.md) · [05-callbacks-events](05-callbacks-events.md) (KeenMate interaction model, Svelte adaptation — supersedes 01 §1). Audits 2026-11-10 at `aad5513`.
Every breaking change gets a CHANGELOG bullet + before→after row in `release-notes/2.0.0-rc01.md` as it lands.
**Remember:** `docs/` demo pages use these APIs — every rename must update the docs site in the same commit.

Verification notes: Textarea bind bug, Listbox `selected-options`, Progress tag mismatch and Menu/MenuItem/Tree/TreeItem stubs confirmed by hand. The styling audit's claim that Accordion still renders `<fluent-accordion>` is **false** (only comments/class names) — global `fluent-accordion-item` element selectors are dead.

## Current state (2026-11-10, end of planning session)

- **All decisions below are made.** Open questions for the user: [questions.md](questions.md). Next: **start Phase 1**, one commit per area; never `git push`.
- Uncommitted in the repo (planning work, commit together with the first Phase 1 commit or separately):
  - `release-notes/2.0.0-rc01.md` (empty template, web-multiselect structure)
  - `CHANGELOG.md` — new WIP heading `## [2.0.0-rc01] - 2026-11-10` + empty `### Changed — BREAKING`
  - `packages/svelte-fluentui/package.json` — `"release-notes"` in `files` (version still `1.6.0-rc07`; bump when releasing)
  - `packages/svelte-fluentui/scripts/post-package.js` — copies `release-notes/` into the package (not yet run/tested)
  - `.gitignore` — ignores the package copy `packages/svelte-fluentui/release-notes/`
  - `code-analysis/2.0.0/*` — this plan + audits 01–05 (decided: commit)
- Not yet done: add a release-notes check to `.claude/commands/publish.md`; update CLAUDE.md (Phase 6; the event section was rewritten to option B on 2026-11-11).
- The `docs/` app must be updated in the same commit as every API rename.

## Phase 1 — Bugs (no API decisions needed)

**Status 2026-11-11: done** (commits 1697ddf … 0910c9a, each with e2e coverage where testable; the suite
is at `e2e/`, fixtures at `docs/src/routes/test/*`). Outcomes that differ from the list below:
- Progress: removed (decision #1) instead of fixed. Stubs removed in 6752817.
- Dialog `trapFocus={false}`: **not a bug** (works via `setFocusTrap`; e2e proves it).
- Escape layering: fixed with the Phase 2 helper `helpers/layer-stack.ts`, already used by Dialog, Panel,
  Combobox, Select, Autocomplete, DatePicker, TimePicker, MenuButton, ContextMenu. Still on their own
  listeners (Phase 3): QuickGrid context menu, InputFile, Tabs overflow, CommandPalette, GridCellEditor.
- `--error-*` tokens: **deferred to Phase 5** — defining them globally would override the dark-mode
  fallbacks that are hard-coded per component.
- GridCellEditor scroll never worked at all (portalled dropdown looked up inside the editor).
- MultiSplitter: removing the Blazor CSS made the default content-height (documented intent) — logged
  under Behaviour changes.
- Autocomplete e2e had 9 stale failures (selectors from before the shared Chip) — fixed.
- Also added: `helpers/locale.ts`, `helpers/date.ts`, `utils/shadow-dom.ts#whenShadowRoot`.

- Textarea `bind:value` one-way (Textarea:85-88).
- Listbox: uncalled `$derived` fn on non-existent `selected-options` attr; `multiple={multi}` undefined.
- Progress renders `<fluent-progress-bar>` but registers `fluent-progress`.
- RadioGroup: arrow-key selection doesn't update bound `value`.
- MenuButton:244 `|| undefined` → `|| null`.
- SSR: `window.navigator.language` prop default (DatePicker:78, Calendar:63); top-level `customElements.get()` (Checkbox:5, Slider:5).
- Hydration: `Math.random()` ids (Checkbox:62, Switch:50) → `$props.id()`.
- Escape inside dropdown in Dialog/Panel probably closes the dialog too (verify in demo first).
- Autocomplete outside-click `.closest('.options-list, .positioning-region')` matches other components' popups; no stale-response guard / catch / unmount cleanup in async search.
- GridCellEditor scrolls previous highlighted row (scroll before DOM update).
- Type exports shadowed: stores `Toast`, `SiteSettings` vs components of same name.
- Dialog `trapFocus={false}` never sent.
- Leaks: ToastContainer timeouts, QuickGrid `rowActionHideTimeout`, MultiSplitter mid-drag listeners, Tabs rAF / late-added tabs not observed, shadow-DOM 10 ms infinite polls.
- Debug output: `console.log` in `data/selected-options.svelte.ts:49`, `stores/theme.ts:11,20,25`.
- CSS: MultiSplitter pane rule conflict from fc ~3125; global leaks (`.grid tr`, `div[part=label]`, `div[draggable]`, `a .stack-vertical`, `th.column-header`); undefined `--error-*` tokens (inconsistent fallbacks); CommandPalette wrong z fallback; `_toast` SCSS z-index not themable.
- `formatInputFileSize` "undefined" ≥ 1 TB; DatePicker min/max compares timestamps not days.

## Phase 2 — Foundations

- `svelte` peer `^5.0.0` → `^5.29` (BREAKING peer).
- Prettier pass over package (semicolons, broken `}: Props` indent) — separate commit, no logic.
- `SlotType = any` → `Snippet<[...]>` (68 files).
- Central, browser-guarded FluentUI element registration module.
- `lib/contexts.ts` with Symbol keys + typed getters.
- Stores (`lib/stores/*`) → `.svelte.ts` runes classes.
- `lib/actions/` — port of core `/actions` (ActionItem/MenuItem/MenuDivider types, `resolveActionItem`, `resolveMenuEntries`, `runAction`).
- Shared helpers: `helpers/attrs.ts`, `helpers/layer-stack.ts`, `attachments/dismissable.ts`, `attachments/floating.ts` (+ top-layer), `helpers/listbox-nav.svelte.ts` + `option-dom.ts`, `helpers/debounce.ts` + `async-search.svelte.ts`, `data/selection-context.svelte.ts`, `helpers/date.ts` / `time.ts` / `text.ts`, `attachments/observe.ts`, `attachments/roving-focus.ts`.
- Internal components: `FieldLabel`, `PickerField`, `MenuSurface`, internal Dismiss/Chevron icons.
- File convention: `X.types.ts` / `X.utils.ts` / `X.svelte.ts`; folder at ≥3 files.

## Phase 3 — Migrate components onto helpers (behaviour unification)

Order: popup layer (dismiss + Escape + floating + listbox nav) across Select, Combobox, Autocomplete, DatePicker, TimePicker, MenuButton, ContextMenu, Tabs overflow, InputFile, QuickGrid, Panel, Dialog, Tooltip → attrs() in all wrappers → async search → selection context → menus (QuickGrid → ContextMenu) → field labels / pickers → a11y (`aria-activedescendant`, picker ARIA, QuickGrid `aria-sort`, clickable spans → buttons, Tooltip describedby/Escape, Calendar roving focus).

## Phase 4 — Public API (BREAKING)

- Callbacks & events per [05-callbacks-events](05-callbacks-events.md): camelCase component events with one `ctx` (`onChange({ value })`), lowercase only for untouched native DOM events via `...rest`, `before*Callback` / `get*Callback` / `*Callback` contracts, `ActionItem` + one `onAction` for every menu/toolbar/dialog/palette/toast surface (port of core `/actions` into `lib/actions/`).
- Value casing: `two_digit`, `max_selectable_days_exceeded`, `moveUp/moveDown`, `oneditstart/ondropdownopen`, accent color keys, Stack enums.
- Concept renames: Dialog `visible` → `open` (Tooltip keeps `visible` — display-only, per 05 rule 10); `multi` → `multiple`; `selectedOptions` → `value`; `dismissable` → `dismissible`; `withIntermediate` → `threeState`/indeterminate; `use24Hours`/`useAmPm` → `hourCycle`; QuickGrid `is*` props → bare (`rowEditable`); AccordionItem `header` → `heading`; positions → `top/bottom/start/end`; intent palette `info/success/warning/danger` (rulebook: `danger`, not `error`); size scale; adornment snippets `start/end`; empty-state, debounce, close-behaviour names; limits `maxFileCount` (drop `maxFiles`); ARIA prop style.
- Types: export QuickGrid types (`QuickGrid.types.ts`, dedupe with GridCellEditor), all public prop types, one `Orientation`, generic `OptionItem<T>` with `label`; rename `InputFileUpload*`, `FieldValidationState`, `FluentDialogElement`.
- `...rest` passthrough on every component.
- Exports: drop `ProgressBar`/`AnchorButton` aliases, double Icon export; **remove** stub components Menu/MenuItem/Tree/TreeItem/Progress; **export Chip**; deprecated props (QuickGrid `showRowActions/rowActions/onrowaction`, Icon `primaryFill`, Tabs `overflow`).
- Wrapper props with no effect removed; wrapper attribute sets aligned.
- Bindable gaps.

## Phase 5 — CSS

Delete fc after moving live rules → dedupe compat → colour palette + dark variants in theme, drop per-component dark blocks → `--fluent-z-*` scale → shared primitives (field control, popup surface, required indicator, focus ring) → CSS var prefix/naming renames (BREAKING) → logical properties → remove demo/site CSS, reboot opt-in (BREAKING) → scope global-reaching rules → `prefers-reduced-motion`.

## Phase 6 — Splits & docs

- Split QuickGrid, InputFile, Tabs, MultiSplitter; GridCellEditor reuses real dropdown components.
- JSDoc on every prop (47 components have none).
- Remove dead/commented code (NavGroup 194 lines, `fluent-ui/setup.ts`, calendar comments).
- Update CLAUDE.md (paths, Tooltip no longer a wrapper, restProps claim), README What's New, release notes.

## Open decisions

1. ~~Stub components~~ — decided 2026-11-10: **remove** Menu / MenuItem / Tree / TreeItem / Progress for 2.0.
2. ~~Event casing + callbacks model~~ — decided 2026-11-10: option B (camelCase component events, lowercase only native passthrough) **and** the full 05 model adopted: one `ctx` arg, `before*Callback` / `get*Callback` / `*Callback`, `ActionItem` + one `onAction` + `beforeActionCallback`.
3. ~~Snippet naming~~ — decided 2026-11-10: **bare names** (`option`, `noData`, `label`, `item`, `empty`). Where a prop and a snippet would share a name, the prop accepts `string | Snippet` (e.g. `label`); a suffix (`labelContent`) only if that's impossible.
4. ~~Size scale~~ — decided 2026-11-10: one vocabulary `extra-small | small | medium | large | extra-large`, each component accepts its subset (Dialog adds `full`; InputFile `big` → `large`). Icon numeric px sizes unchanged.
5. ~~reboot~~ — decided 2026-11-10: **opt-in** — removed from the main bundle, separate export `svelte-fluentui/reboot` (BREAKING). Inspiration from core/base-css-variables: never restyle the consumer's page. Extending `window.components['svelte-fluentui']` (logging, locale) like core = possible 2.x topic, not now.
6. ~~Chip~~ — decided 2026-11-10: **make public** (the removable selection tag used by Combobox/Autocomplete multi-select).
7. ~~Stores~~ — decided 2026-11-10: move to `.svelte.ts` runes classes.
8. ~~code-analysis/~~ — decided 2026-11-10: commit it.
9. ~~BlissFramework rulebook~~ — D-NC-29 / C-NC-14 (Svelte native vs component event casing) fully applied 2026-11-11 (naming-conventions.md section, decisions.md D-NC-29 + summary line, checks.md C-NC-14 + checklist line + totals 9/4/1, checks.sh, guidelines CHANGELOG). Backup of the originals: `%TEMP%/bliss-naming-backup-20261110-215724`.
