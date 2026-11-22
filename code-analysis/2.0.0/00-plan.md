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

**Status 2026-11-11:** done — svelte peer ^5.29, `Snippet` types, `fluent-ui/register.ts` (module-level
registration), `lib/contexts.ts`, `helpers/attrs.ts` (+ all wrappers migrated), `helpers/layer-stack.ts`,
`helpers/date.ts`, `helpers/locale.ts`, `lib/action-items/` (port of core `/actions`; folder name = Q2),
`types RestProps<Own>`. Not done: Prettier pass (Q5), stores → runes (needs an API shape), the
floating / listbox-nav / async-search / selection-context helpers and FieldLabel / PickerField /
MenuSurface internals (Phase 3 work).

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

Status 2026-11-13: dropdown helpers done — `helpers/dismiss.ts`, `listbox-nav.svelte.ts`,
`option-dom.ts`, `text.ts`, `debounce.ts`, `async-search.svelte.ts`, used by Select, Combobox,
Autocomplete, GridCellEditor. **Next:** DatePicker / TimePicker (`dismissOnOutside`, gains focus-out
close), MenuButton / ContextMenu (`dismissOnOutside` + `ListNav` for menu arrows), Tabs overflow,
InputFile, QuickGrid (context menu + 5 permanent document listeners), CommandPalette (`ListNav` +
`text.ts`), Search (`debounce`); then attrs() in all wrappers, selection context, field labels, a11y.

## Phase 4 — Public API (BREAKING)

**Status 2026-11-11 (in progress):**
- Events/callbacks per 05: done for every form, picker, surface, display, layout and nav component,
  DataGrid, QuickGrid columns/editor/grid events. ActionItem model: **done everywhere** — MenuButton,
  ContextMenu, Dialog actions, CommandPalette, Toast links, TopNav items, QuickGrid row toolbar +
  context menu (`lib/action-items`, incl. `createLinkActivation` for vetoable links).
- Renames done: `visible`→`open` (Dialog), `multi`→`multiple`, `selectedOptions`→`value`,
  `dismissable`→`dismissible`, `threeState`, `hourCycle`, AccordionItem `heading`, `start`/`end`
  snippets, kebab values (`2-digit`, `edit-start`, `move-up`), `maxFiles` dropped, stub components removed.
- Done 2026-11-11: positions → logical (Tooltip, PositioningRegion, Toast, Panel start/end only),
  size scale (Badge/Label extra-small…extra-large, InputFile cardSize), QuickGrid `is*` props, aliases +
  deprecated props dropped, `...rest` on every rendering component, bindable gaps, QuickGrid types
  exported, generic `OptionItem<T>` with `label`, `FieldValidationState`, Escape on the layer stack
  everywhere, docs svelte-check at 0 errors.
- **Left:** intent palette (Q11), limits (Q8), empty-state / debounce / close-behaviour names,
  `InputFileUpload*` / `FluentDialogElement` renames, one `Orientation`, decisions Q13–Q22.

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

Status 2026-11-13: logical properties done across components and SCSS (left physical:
floating-ui coordinates, Tooltip arrow, `left: 50%` centring, Tabs scroll buttons/indicator — the Tabs
JS scroll logic is physical and broken in RTL, needs a script fix); status colours on
`--fluent-color-*` with a `-foreground` role + dark values. **Next:** Icon `colorMap` (`--error`,
`--warning`, … from constructed-stylesheet) → palette; one warning hue (Q23) then drop SCSS `$color-*`;
`--badge-fill-*` into the palette; delete `fluent-components.scss` after moving live Calendar /
tab-close rules, dedupe compat; `--fluent-z-*` scale; QuickGrid non-error dark blocks; prefix renames,
reboot opt-in, `prefers-reduced-motion`.

## Phase 6 — Splits & docs

Status 2026-11-15: InputFile / Tabs / MultiSplitter split, no API or behaviour change — internals in `components/inputfile/` (upload-queue.svelte.ts, summary.ts, dom.ts, selector + list / row / chips / footer / card-content components), `components/tabs/` (tabs.types.ts, order.ts, measure.ts, swipe.ts, TabsScrollButton, TabsOverflowMenu), `components/layout/multi-splitter/` (splitter.svelte.ts engine, drag.ts, size-math.ts, persistence.ts); new e2e `multi-splitter`, `tabs-behaviour`, `inputfile-behaviour`; docs screenshots pixel-identical light/dark. JSDoc / dead code / docs items still open.

Status 2026-11-15 (later): JSDoc + dead code done, no type/behaviour change — every prop of every exported component (~90 files, ~1000 props) has a `/** */` comment and each has an `<!-- @component -->` block (internal inputfile/ quickgrid/ tabs/ sub-components not covered); docs API tables corrected where they disagreed with the code (Toast topCTAType casing, Button disabled type, Calendar defaults, Switch phantom slots, TextField phantom `setValidity`, missing rows on Stack/TopNav/Dialog/InputFile/Search/…). Dead code removed: NavGroup Blazor HTML (196 lines), `fluent-ui/setup.ts`, `actions/use-actions.ts`, `helpers/attrs.ts#boolAttr`, calendar debug `console.log` blocks, unused locals/imports (Layout/Header/Listbox `element`, Grid `onDestroy`, Anchor `useActions`). Found, left (would be behaviour/API changes): TabPanel `defer` no-op, TextField `setSelectionRange` in OwnProps, RadioGroup `required` not forwarded, Search `displayName` unused, SiteSettings `children` not rendered, Listbox `height` no effect, Calendar `checkIfSelectedValueHasChanged` no-op, Grid `adaptiveRendering` needs `onBreakpointChange`, GridItem `hiddenWhen` not resize-reactive, Spacer string width gets `px`.

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

## Handoff — 2026-11-13 (before context compaction)

State: everything committed and pushed to `origin/prod` (last pushed commit `b8aa608`). Library and
docs `npm run check` at 0 errors; full e2e 125/125. Docs dev server: `npm run dev` from repo root
(port 19100); Playwright uses it (`npx playwright test`).

Working method that worked well: two background agents in parallel on **disjoint file sets** (they
never run git; report release-note rows); I verify (both checks + full e2e), log renames with
`python $TEMP/logprops.py "Component|before|after" …` (appends to `release-notes/2.0.0-rc01.md`
"Renamed props and values" + CHANGELOG), and commit per batch. Push only when the user says "push".

Next steps, in order:
1. ~~**Q24** — `searchBehavior`~~ **done** (helpers/text.ts port of web-components-core `normalizeSearchText`; Combobox, Select, Autocomplete, QuickGrid editorOptions; docs, e2e, release notes).
2. **Q23** — if confirmed, Alert/Toast warning → palette orange; drop SCSS `$color-*`.
3. Phase 3 helper migrations (list in the Phase 3 status above), incl. Tabs RTL scroll/indicator
   JS fix.
4. Phase 5 remainder (list in the Phase 5 status above).
5. Phase 6: splits, JSDoc, README What's New, `.claude/commands/publish.md` release-notes check,
   stores → runes.
Open decisions: Q23 (pending), Q5 (Prettier pass) and any older unanswered items in questions.md.


### QuickGrid repair (2026-11-13)
Plan in `06-quickgrid-plan.md` (7 phases, test-first; open questions Q-QG-1..3). Start with
Phase 1 (row identity) — `rowIndex` is a view position used as an `items` index in the docs.

## Handoff — 2026-11-15 (resume here after compaction)

State: QuickGrid repair **complete** (all 7 phases of `06-quickgrid-plan.md`, commits 879dbb6 … 6d2833a;
each phase's status block + Deferred list is in that file). Full e2e 206/206; library check 0/0, docs
check 0 errors + 6 pre-existing warnings. Branch `prod` is 15+ commits ahead of `origin/prod`, **not
pushed** (push only when the user says "push" in that turn).

Next (recommended order, user to confirm):
1. **Phase 3 popup migrations** — DatePicker / TimePicker (`dismissOnOutside` + focus-out close),
   MenuButton / ContextMenu (`dismissOnOutside` + `ListNav` arrows), Tabs overflow (+ RTL scroll /
   indicator JS fix), InputFile, CommandPalette (`ListNav` + `text.ts`), Search (`debounce`); then
   `attrs()` in all wrappers, selection context, field labels, a11y pass.
2. **Phase 5 CSS remainder** (breaking ones before release): Icon `colorMap` → palette, drop SCSS
   `$color-*`, `--badge-fill-*` into palette, delete `fluent-components.scss` after moving live rules,
   `--fluent-z-*` scale, CSS var prefix renames, reboot opt-in, `prefers-reduced-motion`.
3. **Phase 6**: split InputFile / Tabs / MultiSplitter; GridCellEditor → real Select/Combobox/Autocomplete
   (+ QuickGridCell / edit-session extraction, see 06 Phase 7 Deferred); JSDoc (47 components); dead
   code (NavGroup, `fluent-ui/setup.ts`); README What's New; `.claude/commands/publish.md`
   release-notes check; stores → runes.
4. **Verify Phase 4 "Left" list** against the code: empty-state / debounce / close-behaviour names,
   `InputFileUpload*` / `FluentDialogElement` renames, one `Orientation` — unclear if done.
Open decisions: Q5 (Prettier pass). Version still `1.6.0-rc07` (bump at release).

Working method: one background agent per phase/area with a precise spec — mandatory
fail-before/pass-after e2e per bug, **scratch files only in the system temp dir + cleanup** (an agent
once left `C:\tmp_qg`), no commits by agents. I review the diff, run `npm run check` in
`packages/svelte-fluentui` and `docs`, run the full `npx playwright test` from the repo root, then
commit with CHANGELOG + `release-notes/2.0.0-rc01.md` rows for breaking changes. Dev server: background
`npm run dev` from repo root on port 19100 (watcher misses git checkout — swap file contents and
confirm with `curl -s localhost:19100/@fs/<abs path> | grep -c <marker>`). Known flakes under load
(pass alone): Autocomplete outside-click, AppBar count badge, Combobox open-at-load.

## Handoff — 2026-11-15 evening (unattended run; resume here)

Done today (commits 104deb1 … abc8054, all on `prod`, **not pushed**; full e2e 389 passing + 2 opt-in perf
tests skipped; both checks clean):
- Phase 3: popups on `dismissOnOutside` (pickers, menus, Tabs overflow, InputFile), MenuButton/ContextMenu
  keyboard, Tabs RTL, CommandPalette `searchBehavior`; a11y pass (listbox ARIA, Calendar APG grid,
  picker dialogs, Tooltip, CommandPalette, keyboard-operable clickable badges/NavItem); popups portal
  into the anchor's `fluent-dialog` (`portalHost`); context-menu key closes ContextMenu.
- Phase 4 leftovers (Q25): `searchDelay`, `closeOnSelect`, `emptyText`/`empty`, one `Orientation`.
- Phase 5: fluent-components.scss deleted, compat trimmed, reboot opt-in (`svelte-fluentui/reboot.css`),
  palette/z-index scale, CSS var prefix renames, shared primitives (`_primitives.scss`) + FieldLabel.
- Phase 6: InputFile/Tabs/MultiSplitter split; JSDoc on every public prop; dead code; README What's New;
  no-op props fixed or removed; Chip exported; `labels` on every component with built-in text.
- QuickGrid: editors reuse Select/Combobox; perf (stable display rows, `virtualize`); fast arrows,
  PageUp/Down, Ctrl+Home/End.

**Questions for the user (collected overnight):**
1. Fold the single-string props into `labels` (breaking): DatePicker/TimePicker `openCalendarIconAriaLabel` /
   `openClockIconAriaLabel` / `popupAriaLabel`, Combobox `loadingText`, BadgeGroup `moreLabel`/`lessLabel`,
   Chip `removeLabel`? (Today they win over `labels`.) → 2026-11-17: `labels` stays (renaming or
   dropping it was discussed and rejected); folded into the key cleanup in `07-labels-plan.md`.
2. AppBar vertical active indicator never rendered (rules keyed on a non-existent attribute; removed).
   Restore it on `data-orientation` (visible change) or leave it gone?
   → 2026-11-21: AppBar finished to Blazor parity — bar surface, horizontal layout, indicator on
   `data-orientation`, "…" overflow popover with search, item `tooltip`, danger count badge.
3. Stores → runes (decided in principle, Q7): which API shape?
   → 2026-11-22: `i18n`-style reactive singletons (`stores/*.svelte.ts`): `settings` (theme folded in,
   applies design tokens itself, `effectiveTheme`, `toggleTheme()`), `toast.items`, `navigationStore`
   → `navigation`; translated toast default titles. e2e/services.spec.ts.
4. Q5 Prettier pass over the package — yes/no?
   → 2026-11-22: done (90fd1a2 config, d39cd1e format-only, `.git-blame-ignore-revs`); `npm run format` / `lint` in the package.
5. Popup surfaces: Autocomplete/pickers/menus keep `--neutral-layer-1` + 16px shadow (`.fluent-popup--layer`);
   unify on `--neutral-layer-floating` + flyout shadow (needs Autocomplete highlighted-row recolour in dark)?
   → 2026-11-22: unified — `.fluent-popup--layer` removed, all popups floating layer + flyout shadow;
   Autocomplete rows / TimePicker hover on `--neutral-fill-stealth-hover` (secondary-hover = floating in dark).
6. `PositioningRegion availableHeight` documents the private `--_available-height`; make it public
   (`--fluent-positioning-available-height`) or keep?
   → 2026-11-22: replaced by a new positioning design, `09-positioning-plan.md` (public
   `--fluent-popup-available-height`, `availableHeight` prop removed, one helper for every popup).
7. Export `portal` / `portalHost` publicly?
8. Combobox/Autocomplete `closeOnSelect={false}` in single mode still closes — OK?
9. Badge keeps `brand` / `important` / `informative` as aliases of primary/dark/light — keep or drop?
10. Housekeeping: delete `C:\tmp_qg` (blocked for me), old `/tmp/gce*`, `/tmp/qg*`, repo-root
    `probe*.tmp.mjs` / `shot.tmp.mjs` (Nov 11, git-excluded); `.claude/commands/publish.md` got a
    release-notes gate (local only — `.claude` is gitignored); its Section 7 still says "no e2e harness".
11. Push (`prod` is 31+ ahead) and version bump to 2.0.0-rc01 via /publish when ready.
    → 2026-11-22: everything pushed (origin/prod = b2dc331). Version bump still pending (only when asked).

**Status 2026-11-22:** questions 1–6 done (6 → 09-positioning-plan.md, all phases done). Next: **7 (export `portal` / `portalHost`)**, then 8–10. Also open:
the reboot-layer fix from `08-css-layers-reboot.md` (`@layer reset`, drop the `border: 1px solid black`
rule, maybe layer the other global CSS — needs the user's yes), German translations want a
native-speaker review. Full e2e: 427 passed / 2 skipped. Flaky (pre-existing, ~3 in 20 with
`--repeat-each`): popup-tabs.spec.ts "active indicator sits under the active tab" (ltr / rtl).

Deferred (see 06-quickgrid-plan.md for QuickGrid ones): per-row deriveds in QuickGrid for non-virtual
teardown cost; variable row heights with `virtualize`; NavMenu menuitem+link double tab stop (needs a
tree redesign); Tooltip `aria-describedby` on FAST hosts can't cross shadow DOM; axe scans (no
@axe-core/playwright installed — install?); InputFile popover still portalled to body.
