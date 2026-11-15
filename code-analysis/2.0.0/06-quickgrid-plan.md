# QuickGrid repair plan (2026-11-13)

Source: two read-only code reviews (editing / everything else) of `QuickGrid.svelte` (2890 lines),
`GridCellEditor.svelte` (940) and `QuickGrid.types.ts`, plus the task-tracker demo that surfaced the
duplicate-`onRowChange` and stale-draft bugs (fixed in `1fbee26`).

**Verified by hand** (re-read the code): page never clamped, `sortable` opt-in/opt-out mismatch,
toolbar row tracked by object identity, `"dropdown-open"` loader never wired, `"always"` editors
reuse one instance (caused a regression of the `hasCommitted` guard — **fixed in `1169c22`**).
Everything else is from the reviews' reading of the code; each phase starts by writing the failing
e2e test, which doubles as verification.

Rule for every item: a Playwright test that fails before and passes after (swap files by writing
content — the dev server's watcher misses `git checkout`; confirm via
`curl localhost:12900/@fs/<path> | grep <marker>`).

---

## Phase 1 — row identity (root cause of most data bugs)

The grid passes **view positions** (`rowIndex` into the sorted / filtered / paged / tree-visible list)
everywhere, and the docs write them into `items`. Drafts, invalid markers, `editingCell`,
`focusedCell` and the row toolbar are keyed by view index or object identity.

| # | Bug | Effect |
|---|---|---|
| 1.1 | `rowIndex` in `onRowChange`, `onAction`, context menu = view position | demos edit/delete **the wrong row** on page 2, after sorting, in a collapsed tree |
| 1.2 | without `idMember`, drafts / invalid cells keyed by view index | an invalid draft from page 1 row 0 shows on page 2 row 0 and is copied into it |
| 1.3 | toolbar tracks the hovered row by object identity | consumers who update immutably (`items.map`) → toolbar actions silently do nothing, `rowIndex` −1 |
| 1.4 | `editingCell` / `focusedCell` are view coordinates; `{#each}` unkeyed | after a sort-changing commit or a live insert, refocus / open editor lands on another row |

Fix:
- Every context gets `rowKey` (from `getRowId`) and `itemIndex` (`items.indexOf(row)`); keep `rowIndex`
  documented as the view position. Fix the demos to use `itemIndex` / `rowKey`.
- Row key fallback without `idMember`: object identity (`WeakMap<T, string>` counter), not the index.
- Key `{#each displayItems}` by row key; store `editingCell` / `focusedCell` / hovered row as row keys.

**Phase 1 status — done 2026-11-13.** `QuickGridRowIdentity {viewIndex, itemIndex, rowKey}` in every row
context; `getRowKey` falls back to a per-object `WeakMap` key (not the view index); body rows keyed;
`editingCell` / `focusedCell` / toolbar row tracked by key; demos write back via `itemIndex`.
4 new e2e tests + 4 rewritten, all fail on the old code. Noticed for later: advanced row toolbar is
clipped off-screen at the start side on the editable docs page (pre-existing); `getCellValue`
callbacks, context-menu `cellValue` and the Space toggle read the item, not the draft (Phase 2);
a row whose key changes mid-edit closes the editor silently (Phase 2 edit token); move-up/down demos
have no `idMember`.

## Phase 2 — editing state machine

| # | Bug |
|---|---|
| 2.1 | async commit resolves → `editingCell = null` closes **whatever editor is open now** (click B while A validates; Tab after a select pick); shared `isValidating` / `currentCellError` |
| 2.2 | `"always"` editors: `internalValue` re-syncs only for checkboxes → after paging/sorting inputs show the old page's values and blur commits them into the new rows |
| 2.3 | custom editor that commits synchronously is stuck in "Editing…" (`editingCell` set after `editCallback`) |
| 2.4 | custom editor `commit`/`cancel` not one-shot, not checked against the current edit; `value` is not the draft; `onEditStart` / `onEditCancel` never fire |
| 2.5 | concurrent commits on one row lose an invalid draft (`releaseCleanDraft` from the other field) |
| 2.6 | `startEdit` options load has no generation check — a late response opens the editor on the previous cell |
| 2.7 | drafts: `$state(new Map())` isn't reactive; while a row has an invalid cell every cell shows the stale clone; resetting `invalidCells = []` leaves drafts forever; discard helpers exist but aren't exported |
| 2.8 | `draftRow` carries other cells' invalid values into valid commits without saying so → add `invalidFields` / `isRowValid` (Q-QG-1) |
| 2.9 | inline validation message never renders (set and cleared in the same tick); only the ⚠ tooltip shows |
| 2.10 | `commitEditDirect` (custom editors, Space toggle) skips `beforeCommitCallback` / `validateCallback` |

Fix: one edit token per `startEdit`; everything after an `await` applies only if the token matches.
Replace whole-row drafts with **per-cell overrides of invalid values** in a `SvelteMap<rowKey, Map<field, value>>`;
`draftRow` = current item + all overrides, plus `invalidFields` / `isRowValid` in the event (Q-QG-1).
Export `discardDrafts(rowKey?)`. Route every commit through `commitEdit` (validation everywhere).
Re-sync always-mode editors from `value` when not focused.

**Phase 2 status — done 2026-11-14.** `editingCell` is an edit session `{token, rowKey, field, item,
column}` (`$state.raw`); every `startEdit` takes a new token. `commitEdit` (the only commit path now —
`commitEditDirect` / `releaseCleanDraft` / the dead draft helpers are gone) closes / refocuses the edit
UI only while its token is the open edit; a cancelled edit's late commit is dropped, and a commit
superseded by a newer one of the same cell is dropped. `validatingToken` replaces the shared
`isValidating`; `currentCellError` is gone (the editor shows the cell's `invalidCells` error, so the
inline message renders when an invalid cell is reopened). The options-load `await` in `startEdit`
checks the token. Custom editors: the edit opens before `editCallback`, `onEditStart`/`onEditCancel`
fire, `commit`/`cancel` are one-shot + token-checked, `ctx.value` is the draft. Drafts are
`SvelteMap<rowKey, SvelteMap<field, {value, error}>>` overrides of invalid values; an effect drops an
override whose cell left `invalidCells`; `discardDrafts(rowKey?)` is an exported instance method.
`onRowChange` gains `invalidFields` / `isRowValid` (Q-QG-1), `draftRow` = item + overrides + committed
value. An effect cancels the edit (with `onEditCancel`) when its row key is no longer displayed.
GridCellEditor re-syncs `internalValue` from `value` whenever it doesn't hold focus; the editor is
`{#key}`ed by token. Space toggle / context-menu `cellValue` / `renderCellCallback` read the draft.
12 new e2e tests, all failing on the old code (148/148 full suite). No existing tests changed.
Deferred / noticed: Space toggle still ignores `trueValue`/`falseValue` (3.4); keyboard commits still
use `Number(input.value)` (3.1); orphaned overrides/`invalidCells` entries of rows replaced without
an id (per-object keys) are never cleaned up — `discardDrafts()` or resetting `invalidCells` clears them;
a superseded custom edit (another cell's `startEdit` while a custom dialog is open) ends without
`onEditCancel`; `snippet` cells receive the item, not the draft row.

## Phase 3 — editors

| # | Bug |
|---|---|
| 3.1 | number: keyboard commits (Enter/Tab/arrows) use `Number(input.value)` → empty = **0**, NaN passes, `decimalPlaces` skipped, no-op edits fire `onRowChange` |
| 3.2 | date: navigate-mode keyboard commit sends the raw `"yyyy-mm-dd"` string, ignoring `outputFormat` |
| 3.3 | date: timezone off-by-one (`new Date("yyyy-mm-dd")` is UTC; `toISOString().split("T")` on local dates; same for `minDate`/`maxDate`) |
| 3.4 | Space on a checkbox commits `!value`, ignoring `trueValue`/`falseValue`, the draft and validation |
| 3.5 | `optionsLoadTrigger: "dropdown-open"` never loads (`handleDropdownFocus` not wired) |
| 3.6 | options cache keyed by field only, never invalidated; `"immediate"` loads with `items[0]`; `loadingOptions` never shown |
| 3.7 | `initialSearchQuery` effect not `untrack`ed — reopens the dropdown after it closes |
| 3.8 | every `"always"` editor autofocuses on mount (last cell steals focus on load/page/sort) |
| 3.9 | autocomplete: unconfirmed free text lost on blur; reopening shows empty when the value came from `searchCallback` |

Fix: keyboard commits delegate to the editor's `commit()` (one parse path); local-date helpers in
`helpers/date.ts`; loaders keyed by `rowKey` + field with a load token; `autofocus` prop.

**Phase 3 status — done 2026-11-14.** GridCellEditor exports `commit()` — the one commit path for
blur, Enter and QuickGrid's Tab / Enter / arrows (`commitFromKeyboard` calls it on the open edit's
editor via `bind:this`; it returns the commit's promise, an already-committed pick returns that
commit, unchanged → `onCancel`). Number: `parseNumber` (empty/unparsable → `null`, `decimalPlaces`).
Date: `parseLocalDate` / `formatLocalDate` / `toLocalDateString` in `helpers/date.ts` (local midnight,
years < 100 kept); output per `outputFormat`; a `change` after a keydown (typing — Chrome fires
`change` per segment) waits for Enter / Tab / blur, a picker pick commits at once; same-day = unchanged.
Space toggle maps `trueValue`/`falseValue` (`toggledCheckboxValue`), the navigate-mode display too.
Options: `optionsCache` `SvelteMap<rowKey+field, {row, options}>`, `optionLoads` per cell (the
controller / entry is the load token; `reuse` joins an in-flight load for the same row object);
`"immediate"` = an effect loading every displayed editable row whose cache isn't for that row object
(paging / replace reloads), `startEdit` awaits it if missing; `"edit-start"` cells show
`.options-loading-indicator` (`optionsLoadingEdit`); `"dropdown-open"` loads in `openDropdown`
(`loadOnOpen`, "Loading..." row). `initialSearchQuery` effect untracked. `autofocus` prop (only the
startEdit editor). Autocomplete: `autocompleteTyped` → `commitTypedText` on blur / Enter (exact label →
that option, empty → null); its input starts at `labelFor(value)` (option label, else the new
`displayText` prop = the cell's `getDisplayValueCallback` text). D1: `startEdit` cancels an open custom
edit (`onEditCancel`). D2: an effect drops overrides / `invalidCells` / cached options of *generated*
row keys no longer in `items` (id keys are kept — server-side filtering may bring them back).
13 new e2e tests (NY + Prague `timezoneId` describes for dates), all failing on the old code; 161/161
full suite. BREAKING (logged): date values are local midnight; `"immediate"` loads per row.
Deferred / noticed: the editing row collapses to ~0 height when its other cells are empty (the editor
is `position: absolute`; single-column grids — fixtures got an `id` column); every GridCellEditor,
"always" ones included, pushes an Escape layer, so the last always-editor swallows every Escape on the
page and its `cancelledViaEscape` is never reset (it stops committing on blur); dropdown editors left
via Tab / arrows without a pick now fire `onEditCancel` (navigate mode auto-starts them on focus, so
arrowing through fires start/cancel pairs); `"edit-start"` never loads for `"always"` editors (no
startEdit) — use `"immediate"` / `"dropdown-open"`; a keyboard-driven native date picker counts as
typing; combobox reopening with a value not in its options still shows empty; the old `"immediate"`
effect ran `loadOptionsCallback` tracked (a loader writing state looped) — gone with the rewrite.

Then (separate step, after Phase 1–3 tests exist): **GridCellEditor reuses Select / Combobox /
Autocomplete.** Needs a value↔key layer (editor values may be numbers/booleans), a grid-embedding
keyboard mode (grid owns Enter/Tab/Escape, closed-list arrows bubble), commit-once semantics, a
borderless cell appearance, and row-aware option loading hooks.

## Phase 4 — sort, filter, paging, tree

| # | Bug |
|---|---|
| 4.1 | page never clamped: delete rows / server returns fewer / collapse a node on page 5 → empty grid, and with ≤1 page the pager is hidden — **no way back** |
| 4.2 | `sortable`: logic needs `column.sortable` truthy, UI shows it unless `false` → `<QuickGrid sortable>` shows sort arrows that do nothing |
| 4.3 | tree mode shows sort controls but never sorts |
| 4.4 | comparator: `Date` compared as strings (by weekday), `null` sorts as "null", no `{numeric: true}`, no locale; sorts raw not display value |
| 4.5 | filter row matches `String(raw).toLowerCase()`: can't filter by displayed text, dates match `Date.toString()`, `zurich` ≠ `Zürich` |
| 4.6 | pager item count uses `sortedItems`, page count uses `visibleItems` (tree) |
| 4.7 | tree: chevrons misleading while filtered; expansion initialised once (new parents collapsed after `items` change); `bind:expandedPaths` never written back |
| 4.8 | sort / page / filters not controllable: no initial sort, no `bind:` / `onSortChange` / `onPageChange` → server-side paging & sorting impossible; no clear-sort, no multi-sort |

Fix: a pure pipeline module (tree order → filter → sort → visibility → page) with clamping, one
`Intl.Collator(locale, {numeric: true})`, nulls last, dates by time, optional
`sortValueCallback`/`compareCallback`; filter on the display value via `containsText(…, searchBehavior)`
with a grid/column `searchBehavior`. Bindable `sort` / `page` / `filters` + `onSortChange` /
`onPageChange` (API decision — Q-QG-2).

**Phase 4 status — done 2026-11-14.** Pure pipeline in `quickgrid/pipeline.ts` (no runes): `createRowFilter`
(display text via `getDisplayValueCallback` / formatted value + `containsText(…, searchBehavior)`, column
override; `filterCallback` unchanged), `createRowComparator` (one `Intl.Collator(culture, {numeric: true})`,
Dates by time, numbers / bigints / booleans by value, empty values last both ways, column
`getSortValueCallback` / `compareCallback`), `nextSort` (web-grid's click cycle), `treeOrder` (depth-first,
siblings by the comparator, path order on ties), `filterTreeRows`, `visibleTreeRows`, `getPageCount` /
`clampPage` / `pageSlice`. QuickGrid derives `orderedItems → visibleItems → displayItems`; `effectivePage`
is clamped in the derivation (no empty-page frame) and an effect writes it back to `bind:currentPage`
(+ `onCurrentPageChange`, server mode re-requests). API (Q-QG-2): `sortMode` replaces `sortable`, `bind:sort`
+ `onSortChange`, `bind:filters` + `filterMode` (web-grid name; replaces "`onFiltersChange` present ⇒
server filtering"), `searchBehavior`, `culture`, `bind:currentPage`, `bind:pageSize`, `pageSizes` (native
select in the pager), `paginationMode` + `totalItems`, `beforePageChangeCallback` (`{trigger, fromPage,
toPage, invalidCells}`; false / number / async — pager disabled meanwhile; sort / filter go through it only
in server mode, like web-grid), `onPageSizeChange`, `onDataRequest({sort, page, pageSize, skip, filters,
trigger, mode: "replace"})` — `filters` added to web-grid's detail; `"init"` fires on mount in server mode
only; no `"load-more"` (no infinite scroll). Server mode: no client filter / sort / slice (web-grid still
sorts the page locally — deliberately not mirrored). Tree: `bind:expandedPaths` is the only expansion state
(written back; `$bindable()` without fallback so `bind:…={undefined}` works); new parents get the default
expansion, seen ones keep theirs; while filtering, matches + ancestors show, chevrons expanded + disabled
(only rows with a matching child get one). Date cells without a display callback show
`toLocaleDateString(culture)`. 15 new e2e tests (`e2e/quickgrid-paging.spec.ts`, fixture
`/test/quickgrid-paging`), 14 fail on the old code (the 15th, "sortMode none shows no sort UI", is a
regression guard); `sortable` → `sortMode="single"` on ~190 docs grids; fixture `#sorted-wrap` migrated.
Deferred / noticed: sorting is by the raw value (typed), not the display text — a lookup column needs
`getSortValueCallback` (could default to the option label of `editorOptions.options`); client mode clamps
a restored `currentPage` while `items` is still empty (async load) — server mode avoids it by leaving
`totalItems` undefined until known; Ctrl+←/→ still toggle expansion while filtering (invisible until the
filter is cleared); a pending async `beforePageChangeCallback` ignores further filter typing in server
mode (input reverted when rejected); sort headers still mouse-only, no `aria-sort` (Phase 6); pager strings
not localisable (Phase 6); filter row matches the item, not a cell's pending invalid draft.

## Phase 5 — row toolbar, context menu, listeners

| # | Bug |
|---|---|
| 5.1 | hover toolbar disabled on touch-screen laptops (`maxTouchPoints > 0`) even for mouse users |
| 5.2 | click/button-mode toolbar not dismissed by outside click on mouse devices; no Escape (no `pushLayer`) |
| 5.3 | any scroll anywhere closes toolbar and menu (including the grid's own horizontal scroll and editor listboxes) |
| 5.4 | right-click on header/filter row leaves a stale menu; context menu hijacks right-click inside open editors |
| 5.5 | context menu not portalled (breaks under transformed ancestors) |
| 5.6 | 4 document/window listeners per grid, always attached |

Fix: `dismissOnOutside` + `pushLayer` while open, per-event `pointerType`, PositioningRegion for the menu.

**Phase 5 status — done 2026-11-14.** Hover mode decides per event: row `pointerenter` / `pointerleave`
ignore `pointerType === "touch"`; a row `pointerdown` records the type and a touch tap toggles the toolbar
via the row click (hover mode had no tap path at all — touch users never saw it); `isTouchDevice` is gone.
While the toolbar is open: `dismissOnOutside([container, toolbar])` + `pushLayer` (Escape declines inside a
`td.editing` cell so the editor's cancel still runs; focus inside the toolbar returns to the row's `⋮` /
navigable cell). Click / button mode no longer closes on the toolbar's `mouseleave` (that was its only
mouse dismissal). Context menu: `use:portal` + floating-ui (`bottom-start`, `flip`, `shift(8)`) against a
virtual reference = the right-clicked cell + the pointer's offset in it (`contextElement` = cell, so
`autoUpdate` follows the grid's / page's scroll); `dismissOnOutside([container, menu])` + `pushLayer`; the
container is "inside" (keeps the anchor-dialog focus-trap exception working), so a capture `pointerdown`
on the container closes the menu instead — a right-click elsewhere in the grid reopens it there, on the
header / filter row it just closes. Right-clicks on `input, textarea, select, [contenteditable]` in a cell
keep the native menu. No close-on-scroll: toolbar (PositioningRegion) and menu follow their anchor; an
`IntersectionObserver` on the anchor row / cell closes them once it scrolls out of view. The 4
always-on document / window listeners and the `tick`-based viewport clamp are gone — listeners exist only
while open. 13 new e2e tests (`e2e/quickgrid-toolbar.spec.ts`, fixture `/test/quickgrid-toolbar`), 11
fail on the old code (the 2 regression guards: Escape in an editor with the hover toolbar open, the
toolbar closing when its row scrolls out of view). Docs: `toolbarTrigger` and `contextMenu` rows.
Deferred / noticed: the menu is portalled with z-index (like `ContextMenu`), not promoted to the top layer
like PositioningRegion — inside a high-z modal it may need `--fluent-z-popover`; the hover toolbar's Escape
layer sits above an open dialog, so Escape over a hovered row closes the toolbar first; a focus move into
a portalled editor popup (date picker) closes an open toolbar; (fixed on review: the root capture
handler is an effect listener, so a consumer's `onpointerdowncapture` still runs; the stale spec comment
is updated); keyboard access to the toolbar / menu
(Shift+F10, focus into the menu) stays Phase 6.

## Phase 6 — keyboard & accessibility

- Sort headers: `<button>` inside `th`, `aria-sort`, glyphs `aria-hidden` (currently mouse-only, a11y warning silenced).
- Navigate mode traps Tab at the last editable cell (`preventDefault` before the null check) — WCAG 2.1.2; roving `tabindex` instead of `tabindex=0` on every cell.
- Context menu: Shift+F10 / ContextMenu key, focus into the menu, restore on close, Enter activation.
- Tree: `role="treegrid"`, `aria-level`, `aria-expanded`, labelled chevron with a visible focus ring.
- Toolbar reachable by keyboard in hover mode; `⋮` trigger `aria-label` / `aria-haspopup` / `aria-expanded`.
- `aria-rowcount`/`aria-rowindex` when paged; `aria-label` on filter inputs; a way to label the `<table>`; live region for result/page changes.
- Localisable strings (`labels` prop): "Filter…", "No items to display", pager, Expand/Collapse, toolbar presets, menu built-ins.

**Phase 6 status — done 2026-11-14.** `labels?: Partial<QuickGridLabels>` (type in `QuickGrid.types.ts`, English
defaults `defaultQuickGridLabels` in `quickgrid/labels.ts`, both exported; positional function labels like
InputFile's) covers the filter row, empty message, pager (now a `<nav>`), tree chevrons, toolbar presets, menu
built-ins, indicators, GridCellEditor's dropdown texts and the announcements. Sortable headers render a
`<button>` (padding moved onto it) — click / Enter / Space, Ctrl/⌘ + Enter / Space adds (`handleSortKeyDown`);
`aria-sort` only on `sort[0]`'s column; glyph + priority `aria-hidden`. Navigate mode: `tabStop` → roving
`tabindex` (`getCellTabIndex`, falls back to the first cell); Tab without a target is left to the browser;
inner chevron / edit / ⋮ buttons get `tabindex=-1`; editor Tab at the last cell refocuses the cell.
`handleCellKeyDown` wraps the navigation handler: Shift+F10 / ContextMenu → `openContextMenu(cell, …, null)`
(below the cell, first `fluent-menu-item` focused; FAST items only emit `change` on Enter / Space, so
`onkeydown` runs the item); `closeContextMenu` / `closeRowToolbar` restore focus when it was inside. Alt+F10 →
`openToolbarFromKeyboard`; toolbar is `role="toolbar"` with arrow / Home / End roving, Tab / Escape close and
return focus; Enter on ⋮ (`detail === 0`) focuses it. Non-navigate hover / click toolbar grids make rows one
tab stop (↑ / ↓ / Home / End, Enter / Alt+F10). Tree: `role="treegrid"`, `aria-level` (from the shallowest
level), `aria-expanded` on parent rows, chevron `aria-label` + focus ring. `aria-rowcount` / `aria-rowindex`
when pageable or server (`-1` while `totalItems` unknown; header rows counted); filter `aria-label`;
`ariaLabel` / `ariaLabelledby` on the `<table>`; `role="status"` polite live region (`announce`, cleared then
set per frame): count after a filter (server / server-filter: when `items` next changes), page after
`goToPage`, sort after a header. D1: GridCellEditor pushes its Escape layer only while focused or its
dropdown is open; Escape reverts `internalValue`; `cancelledViaEscape` resets on focus-in from outside / input.
D2: the toolbar's layer is a separate effect — hover mode registers it only while the toolbar holds focus.
17 new e2e tests (`e2e/quickgrid-a11y.spec.ts`, fixture `/test/quickgrid-a11y`), all failing on the old code;
no existing test changed. Docs: `ariaLabel` / `ariaLabelledby` / `labels` rows, Labels and Keyboard cards
(quickgrid), a11y paragraph (quickgrid-tree).
Deferred / noticed: the table keeps role `table` in navigate mode (a `grid` role would want `aria-selected`,
cell-level `aria-colindex` and Home/End/PageUp/PageDown — not done); the sort button's name includes the
`headerInfo` icon's title; secondary sort columns have no `aria-sort` (per ARIA) — their state is only in the
announcement; server-mode announcements of the page / count rely on `items` changing; validation error texts
from the grid itself ("Validation failed", "Invalid value" in `invalidCells`) are data, not `labels`;
editor-level Tab in dblclick / click mode at the last cell still ends without moving focus anywhere; no axe scan yet.

## Phase 7 — performance, styling, split

- Key `{#each}` (Phase 1); precompute per-render maps (`invalidByKey`, column styles, path segments)
  instead of per-cell scans and user-callback calls; `columns.find` per row per filter; consider
  windowing above ~500 rows.
- Styling: fold the ~10 `[data-theme="dark"]` fallback blocks into `--fluent-quickgrid-*` variables
  (5 exist today; add toolbar / menu / focus / editing), connector stroke `#0078d4`, one `margin-top`.
- `renderCellCallback` goes through `{@html}` unsanitised — document the XSS risk (or require a snippet).
- Cleanup: unused `cellTemplate` prop, `containerRef`, dead draft helpers, `resolvedShowToolbar` /
  `displayItems` aliases, `.row-action-popup` CSS, `filteredOptions = $derived(() => …)`.
- **Split** — done in Phase 7 (`components/quickgrid/`, internal, not exported): `pipeline.ts` (Phase 4),
  `labels.ts` (Phase 6), `tree.ts` (path / level / parent per row, separator detection, path order,
  ancestor walks, default expansion), `columns.ts` (header / filter / body style strings, `isColumnSortable`),
  `navigation.ts` (`findNextEditableCell`), `editing.svelte.ts` (`CellOverrides` drafts class, `cellKeyOf`,
  `normalizeValidationResult`, checkbox values — **not** the edit session), `options.svelte.ts`
  (`OptionsLoader`: cache, per-cell load tokens, editor options), `QuickGridHeader.svelte` (thead: filter row +
  sort buttons), `QuickGridPager.svelte` (own markup, `Paginator` not reused), `QuickGridRowToolbar.svelte`
  (toolbar + side choice + connector), `QuickGridContextMenu.svelte` (portalled menu + placement + item keys).
  `QuickGrid.svelte` 3526 → 2437 lines (≈400 was aspirational). Not extracted: `QuickGridCell.svelte`, the
  edit session state machine (startEdit / commitEdit / tokens) and the keyboard handlers.

**Phase 7 status — done 2026-11-14.** Refactor; behaviour unchanged except the dark-theme header fix below.
7.1 perf: `invalidByKey` (Map `rowKey\0field` → error, first entry wins) replaces two `invalidCells` scans per
cell; `columnStyles` (three style strings per column, once per `columns` change) replaces per-cell string
building; `treeInfo` (`Map<row, {path, segments, level, parentPath, parent}>`, once per `items` change) replaces
per-call path splitting (path-order comparator uses the cached segments; ancestor walk per row done once);
`viewIndexByKey` (from `displayRows`, which now carries `rowKey`) replaces `displayItems.findIndex/some(getRowKey)`
in `getViewIndex`, tab stops and the edit-row check; `isCellEditable` (→ `getIsRowEditableCallback` /
`getIsEditableCallback`) and `isEditing` evaluated once per cell instead of 3× / 2×. The pipeline already hoisted
`columns.find`. 7.2: QuickGrid's and GridCellEditor's `[data-theme="dark"]` blocks are gone (all but the toolbar
shadow only repeated the FAST token with a dark fallback hex); new `--fluent-quickgrid-*` variables (bg / border /
text, focus-stroke, focused-cell-stroke / -bg, editable-hover-bg / -border, editing-bg / -stroke, toolbar-bg /
-border / -text / -hover-bg / -shadow (theme.scss light/dark), connector-stroke, menu-shadow, dropdown-bg / -border
/ -highlight-bg), each falling back to the token; connector stroke/fill moved from SVG attributes to CSS with
`--fluent-quickgrid-connector-stroke` → `--accent-fill-rest` → `--fluent-accent-primary` (no `#0078d4`);
`margin-top` / `border-top` / `border-bottom` → logical. Screenshots (Playwright, light + dark: `/components/quickgrid`,
`/components/quickgrid-tree`, navigate focus / editing, button toolbar, context menu, editable hover, moved-row
connector vs the old file) are pixel-identical except dark `/components/quickgrid`: sorted / hovered headers now
show `--fluent-quickgrid-header-sorted-bg` / `-hover-bg` (the old dark `.column-header` rule out-specified them —
a bug, logged as Fixed). 7.3: `renderCellCallback` JSDoc + docs column table warn about `{@html}` XSS and point
to `snippet` (behaviour unchanged). 7.4: removed `cellTemplate` (BREAKING, logged + release-notes row; docs Slots
tables dropped, quickgrid's became a CSS-variables table), `resolvedShowToolbar` alias, `.row-action-popup` CSS,
`hasTemplate` / `hasSnippet`, the never-set `'down'` connector arrow, unused imports; `filteredOptions` is a
`$derived.by` value. `containerRef` is used (outside-dismiss, capture listener) and `displayItems` is the paged
slice, not an alias — both kept. 7.5: see the Split bullet. 206/206 full suite, both checks clean (docs: the 6
pre-existing warnings).
Deferred / noticed: windowing (> ~500 rows) not done; `QuickGridCell.svelte` and an edit-session class
(`startEdit` / `commitEdit` / `cancelEdit` + tokens + keyboard handlers) not extracted — they share focus,
navigation, the row-identity helpers and every edit event, so a split needs a context object or many callbacks and
is better done together with the GridCellEditor → Select / Combobox / Autocomplete step; `getCellValue` /
`getEditorDisplayText` still call `getDisplayValueCallback` per render per cell (no memo — values can change
without `items` changing); the filter pipeline formats each cell on every filter keystroke; toolbar / menu /
dropdown variables must be set on `:root` or a theme selector (portalled, they don't inherit from the grid); the
`.cell-edit-btn` glyph has no colour of its own (UA button text — follows `color-scheme`); the moved-row connector
is still computed in viewport coordinates and the toolbar's side is decided from the table's physical edges.

## Test coverage to add (none of this is covered today)

Sort order (nulls/dates/numbers, `sortable` rules, tree); paging and clamping; built-in filter and
`onFiltersChange`; tree expand/collapse/keyboard/`defaultExpandDepth`; toolbar and context-menu
dismissal and keyboard; Tab out of the grid; `rowIndex`/`itemIndex` on page 2 / sorted / tree;
always-mode across pages; async validation while another cell opens; `optionsLoadTrigger` modes;
custom editor sync/double commit; number/date keyboard commits; date in a non-UTC `timezoneId`;
Space with `trueValue`; axe scan; no listeners after unmount.

## Open questions

- ~~**Q-QG-1**~~ **Decided 2026-11-13 (user):** `onRowChange` gives the row's full current state
  plus which fields are invalid, so the consumer decides what to store:
  ```ts
  onRowChange({
    row,            // the item as it is in `items`
    draftRow,       // current state: item + every cell's pending value, invalid ones included
    field, oldValue, newValue,
    isValid,        // the edited field
    invalidFields,  // [{field, error, value}] — every invalid cell of the row right now
    isRowValid,     // invalidFields.length === 0
    rowKey, itemIndex, viewIndex   // see Q-QG-3
  })
  ```
  `draftRow` is built per event from the current item + the per-cell overrides (Phase 2), so
  consumer-side changes to other fields always show through. Typical consumer:
  `if (isRowValid) save(draftRow)` or save `draftRow` minus `invalidFields`.
- ~~**Q-QG-2**~~ **Decided 2026-11-13 (user): port web-grid's model** (`C:/Git/KM/web-grid/packages/web-grid/src/types.ts` `SortMode`, `SortState`, `DataRequestDetail`; `grid.ts` `sort`, `paginationMode`, `currentPage`, `totalItems`, `beforePageChangeCallback`):
  `sortMode: "none" | "single" | "multiple"` (replaces the `sortable` boolean), `bind:sort` (`{column, direction}[]`),
  `paginationMode: "client" | "server"`, `bind:currentPage`, `bind:pageSize`, `pageSizes`, `totalItems`,
  `beforePageChangeCallback(ctx)`, and one `onDataRequest({sort, page, pageSize, trigger, mode, skip})`
  (`trigger`: `sort | page | page-size | filter | init | load-more`) next to `onFiltersChange`. Phase 4.
- ~~**Q-QG-3**~~ **Decided 2026-11-13 (user):** `rowIndex` → `viewIndex` (position in the displayed
  list), plus `itemIndex` (index in `items`, −1 if not found) and `rowKey` in every row context. Phase 1.

## Suggested order

Phase 1 → 2 → 3 (data correctness; each item test-first) → 4 → 5 → 6 → 7. Phases 1–3 touch the same
code (editing + identity) and should be one agent; 4 and 5 are independent and can run in parallel
once 1 lands. The GridCellEditor → real dropdowns refactor comes after Phase 3.

---

## Handoff — 2026-11-14 (resume here after compaction)

State: Phase 1 done (`879dbb6`). Branch `prod` is ahead of origin and **not pushed** (needs the user's
"push" in that turn; a previous push attempt was blocked by the permission classifier).
All decisions Q-QG-1…5 recorded in `questions.md`.

**Update 2026-11-14 (later):** items 1 and 2 done (`c7ca2e0` toolbar, Q-QG-4 idMember default),
Phase 2 done (see its status block). Next: **Phase 3** (editors). Extra flakes seen under full-suite load:
AppBar count badge, Combobox open-at-load (pass alone).
Phase 3 start: read the Phase 2 status block's "Deferred" list (3.1 / 3.4 items + custom-edit
superseded without `onEditCancel`) and fold it into the Phase 3 agent spec. Same method: one background
agent, fail-before/pass-after per item, I review + both checks + full suite, then commit. Docs demos now
write back `{...row, [field]: newValue}` (not `draftRow`). Branch `prod` 9 ahead of origin, not pushed.

**Update 2026-11-14 (Phase 3):** Phase 3 done (see its status block; 161/161 full suite). Next: **Phase 4**
(web-grid sort/paging model, Q-QG-2). Phase 3's Deferred list has a real Escape bug (every always-editor
pushes an Escape layer) — fold into Phase 6 (keyboard & a11y) or fix early if it blocks Phase 4 tests.

**Update 2026-11-14 (Phase 4):** Phase 4 done (see its status block; 176/176). Next: **Phase 5** (row
toolbar, context menu, listeners), then 6 (keyboard & a11y — include the always-editor Escape bug,
sort-header keyboard/`aria-sort`, localisable pager strings), then 7.

**Update 2026-11-14 (Phase 5):** Phase 5 done (189/189). Next: **Phase 6** (keyboard & a11y): fold in
the always-editor Escape bug (Phase 3), sort-header keyboard/`aria-sort` + localisable pager strings
(Phase 4), toolbar/menu keyboard access and the hover-toolbar Escape layer above dialogs (Phase 5). Then 7.

**Update 2026-11-14 (Phase 6):** Phase 6 done (206/206). Next: **Phase 7** (performance, styling,
split, cleanup), then the GridCellEditor → Select/Combobox/Autocomplete reuse step (after Phase 3).

**Update 2026-11-14 (Phase 7):** Phase 7 done (206/206; see its status block). Next: the GridCellEditor →
Select/Combobox/Autocomplete reuse step (fold in the QuickGridCell / edit-session extraction).

Next, in order (original list):
1. Small commit: advanced row toolbar on `/components/quickgrid-editable` is clipped off-screen at the
   start side ("Move up" unclickable) — find why (PositioningRegion/toolbar anchoring), fix, e2e.
2. Q-QG-4: `idMember` defaults to `"id"` when rows have an `id` field (keep warning otherwise);
   release-notes row.
3. **Phase 2** (editing state machine), test-first, items 2.1–2.10 above plus Phase 1 leftovers
   (callbacks/context-menu `cellValue`/Space toggle read the item not the draft; key change mid-edit).
   Key design: one edit token per `startEdit`; per-cell overrides of invalid values in a `SvelteMap`
   instead of whole-row drafts; `onRowChange` gets `draftRow` (item + all overrides) + `invalidFields`
   (`{field, error, value}[]`) + `isRowValid` (Q-QG-1); every commit path validates; export
   `discardDrafts(rowKey?)`. Then Phase 3, then 4 (web-grid sort/paging model, Q-QG-2), 5, 6, 7.

Way of working that worked: one background agent per phase with a precise spec + mandatory
fail-before/pass-after tests; I review the diff, run both `npm run check`s and the full suite, then commit.
Testing gotcha: the dev server (port 12900, started from repo root with `npm run dev` in the
background) misses `git checkout` — swap file contents and confirm with
`curl -s localhost:12900/@fs/<abs path> | grep -c <marker>`. Known flake: Autocomplete
outside-click test under full-suite load (passes alone).

**Reuse step status — done 2026-11-15.** GridCellEditor's dropdown editors are the library's components:
`select` → `Select`, `combobox` and `autocomplete` → `Combobox` (976 → 666 lines; no own listbox, ListNav,
wheel blocking or option rows). Autocomplete (the component) is not used: it is a chip / multi-value control —
single mode clears the selection (`onChange([])`) on every keystroke, has no free text, hides selected options,
caps results (`maxResultCount`), brings a clear button / search icon and renders its own non-`<Option>` rows
(no groups, no shared ListNav) — so the free-text search editor runs `Combobox` with `onSearch` instead (an
earlier changelog entry had already dropped Autocomplete from the grid for similar reasons). Value ↔ key:
`quickgrid/option-keys.ts` (`OptionKeys`: typed string keys `s:` / `n:` / `b:` / `i:`, objects by identity,
`EMPTY_KEY` for null; a key maps back on pick). Keyboard: Select / Combobox `embedded` (closed-list ArrowUp /
ArrowDown not handled → bubble to QuickGrid; Combobox: Enter opens a closed list); keys the dropdown handled are
`preventDefault`ed and GridCellEditor stops those, the rest (Tab, closed arrows, Enter in navigate mode) reach
the grid; `selectValueOnTab` keeps Tab-picks-highlighted. Escape: the dropdown's own layer first, the editor's
layer (also closes a still-open list when the layers were pushed in the other order) cancels. Commit-once:
`pick(key)` → `commitValue` (guarded) from Select `onChange` / `<Option onclick>` (click on the current value),
Combobox `onChange`; a capture-phase peek at the highlighted `.fluent-option` makes Enter / Space on the
current value commit like before (Select reports only changes); a document `mousedown` preventDefault on the
portalled list (by its id) keeps focus in the editor, so a pick never blur-commits / cancels first; focus in
the list counts as inside. Appearance: `embedded` CSS (borderless, transparent, fills the cell, inherits font);
`dropdownClass="cell-dropdown"`, `maxDropdownHeight="200px"`; `--fluent-quickgrid-dropdown-*` restyle the shared
list (defaults = listbox tokens); autocomplete hides the Combobox chevron and keeps its "..." indicator.
Loading: `"dropdown-open"` via `bind:open`; select's no-options / loading row is a child `<div>` of the Select;
Combobox `loading` / `loadingText` / `emptyText` carry `editorLoading` / `editorSearching` / `editorEmptyText` /
`editorFilterEmptyText`; autocomplete search: Combobox debounces (`searchDelay`), GridCellEditor's AsyncSearch
aborts / drops stale results, below `minSearchLength` the initial options; free text via Combobox `freeText` +
`bind:currentValue` (Escape now reverts the typed text). `initialSearchQuery` is replayed as the keystroke
(keydown on the Select trigger / an input event on the Combobox). New props — Select: `placeholder`,
`valueText`, `selectValueOnTab`, `dropdownClass`, `embedded`; Combobox: `valueText`, `openOnFocus`,
`selectValueOnTab`, `freeText`, `dropdownClass`, `embedded`; `QuickGridEditorOption.group`;
`helpers/option-groups.ts` (`groupSegments`, Combobox uses it). Bug found + fixed: in navigate mode a dblclick
on a dropdown cell restarted its edit, the replaced editor's blur called `onCancel` → `cancelEdit(editToken)`
with the *new* token (the `{@const}` had moved on) → `editingCell = null` → "Cannot read properties of null
(reading 'token')" and a dead cell (pre-existing); GridCellEditor now captures `editToken` at mount and hands it
back in `onCommit` / `onCancel`. Tests: 3 assertions changed for the old option-row DOM (`.cell-dropdown-option`
/ `.highlighted` → `[role="option"]` / `[data-highlighted]`); new `e2e/quickgrid-editors.spec.ts` (8; 7 fail on
the old code, the navigate-mode arrows contract passes on both). 266/266 full suite; both checks clean (docs: the
6 pre-existing warnings). Screenshots (light + dark, `/components/quickgrid-editable` task tracker + navigate
grid): closed editors identical except the chevron glyph; open lists take the shared listbox look (padding,
rounded rows, bold selected row) and align with the editor's content box, not the cell edges; combobox /
autocomplete inputs select their text on focus.
Deferred / noticed: QuickGridCell / edit-session extraction not done (didn't fall out of this step); the list
is narrower than the cell (anchored to the control inside the cell padding) — a PositioningRegion anchor /
offset override would restore cell-edge alignment; Select's trigger text is a `$derived` DOM lookup (options
arriving while closed show `valueText` until the next open/close); picking the current value still fires
`onRowChange` with old = new (as before); a navigate-mode dblclick on a dropdown cell still restarts the edit
(now harmlessly); Autocomplete itself still has its own option rows / nav (not `<Option>` / groups).

**Perf step status — done 2026-11-15.** Measured first (fixture `/test/quickgrid-perf`, 2,000 rows × 8 columns, display
callbacks on 4, filterable, `sortMode="single"`; `QG_PERF=1 npx playwright test e2e/quickgrid-perf.spec.ts`; each
number = median of 5, `performance.now()` from the action to the frame after it, **dev server build** — absolute
values are high, ratios are what counts; "calls" = `getDisplayValueCallback` calls during the action).

| action | before | after (memo + text cache) | `virtualize` |
|---|---|---|---|
| initial render | 1,136 ms (8,000 calls) | ~1,100 ms (8,000) | **28 ms** (72) |
| filter keystroke, all rows still match | 152 ms (10,000 calls) | **~30 ms** (2,000) | 14 ms |
| filter keystroke, 2,000 → 333 rows | 288 ms | ~260 ms | 14 ms |
| filter cleared, 333 → 2,000 rows | 862 ms | ~860 ms | 13 ms |
| sort click | 426 ms (8,000 calls) | **~300 ms** (0) | 17 ms |

Task 1 (`getCellValue` / `getEditorDisplayText` memo): the measurement showed the real cost wasn't a missing value
memo — every pipeline run (filter keystroke, sort, page, expand) rebuilt `displayRows` with new `{item, rowKey,
eachKey}` objects, and the keyed `{#each}` hands each row its entry through a getter (`$.get($$item).item`), so a
new entry object re-ran **every** cell expression of every displayed row (10,000 callback calls for one keystroke).
Fix: `displayRows` reuses a row's entry object while item, rowKey, eachKey and the `items` array are unchanged
(non-reactive `Map<eachKey, entry>` carried between runs; a new `items` array starts fresh, so rows mutated in place
and handed over as `items = [...items]` still re-render). A value cache keyed by row + column was rejected: Svelte's
per-cell template effects already memoise per cell **and** track whatever the callback reads (a deep-reactive row
field, a `$state` lookup map, `culture`, a replaced column) — a hand-made cache would lose that tracking (stale
cells) and need guessing invalidation rules. Now a cell re-runs only when something it read changed.
Task 2 (filter text): the texts are still formatted on every run (so `orderedItems` keeps tracking what the
callbacks read — same staleness argument), but the term is folded once per run instead of once per row, and folded
cell texts are memoised **by the text itself** (`SearchTextCache` in `pipeline.ts`, per `searchBehavior`, bounded
at 50,000 entries → clear) — keyed by text it can't go stale, so no invalidation rules at all. Profiled: folding
cost ~2.2 ms per keystroke per filtered column at 2,000 short texts uncached vs ~0.1 ms cached (≈4–8 ms for
longer texts, linear in rows × filtered columns); in the end-to-end keystroke (~20 ms JS, mostly Svelte's effect
traversal over 16,000 cell effects) it's within run-to-run noise — kept because it is cheap and can't be wrong.
Remaining non-virtual cost is DOM: creating / destroying rows (Svelte's `remove_reaction` is O(reactions) per
dependency, and every cell reads ~10 grid-wide signals, so tearing down 1,600 rows is quadratic-ish — ~320 of the
~900 ms in the profile) and layout of a 2,000-row table on a sort (JS ~25 ms of ~300).
Task 3 (virtualisation) — done, opt-in: `virtualize` + `itemSize` (37) + `overscanCount` (5). The container
(`.quickgrid-container.virtualized`) scrolls (`overflow-y: auto`, `max-block-size:
var(--fluent-quickgrid-virtual-max-height, 480px)`), `thead` is sticky (opaque background); the window is
`renderRange` from scrollTop / clientHeight (scroll listener + ResizeObserver, only while virtual) minus the
measured `bodyOffset` (header height), divided by the row pitch — `itemSize`, corrected by measuring the rendered
rows after each render (pitch > 0.5px off → use the measured one). Start is rounded down to even so
`:nth-child(even)` stripes stay on their rows. Spacer rows are separate `<tbody class="virtual-spacer"
aria-hidden="true">` before / after the body (heights = rows × pitch), so the body's `:nth-child` and
`:scope > tbody > tr[data-row-key]` lookups are unaffected. In virtual mode the table uses `border-collapse:
separate` (row line drawn by the cells): Chromium doesn't move collapsed borders with a sticky header, rows showed
through the header's border strips. `{#each renderedRows … , renderIndex}` + `{@const viewIndex = renderStart +
renderIndex}` keeps every handler on the absolute view index. Keyboard: `focusCell` calls `scrollRowIntoView`
(sets scrollTop and the window state synchronously, so the row exists by the focusing rAF); rows-mode
↑ / ↓ / Home / End go through `focusRowAt(index)` (view-index based, no longer the DOM row list) with the same
scroll; the navigate-mode / rows-mode tab stop falls back to the first rendered row when the stop row was
scrolled out (else Tab would skip the grid). The edited row is forced into the window (range extended to it) so
its editor isn't destroyed while scrolled away. aria: `aria-rowcount` = header rows + all displayed rows,
`aria-rowindex` from the absolute view index; header rows get their indexes as in paged mode. The hover-toolbar
anchor effect resolves its `<tr>` among the rendered rows (`viewIndex − renderStart`); "immediate" options loads
iterate the rendered rows only. Ignored when `pageable` / server paging (documented). Docs example (5,000 rows) +
API rows + `--fluent-quickgrid-virtual-max-height`; CHANGELOG Added + Internal; release notes "QuickGrid:
virtualised rows" under New API.
Tests: `e2e/quickgrid-cache.spec.ts` (8; fixture `/test/quickgrid-cache`): a filter keystroke doesn't re-format
the rows it keeps (fails on the old code), in-place edits of deep-reactive rows show and re-filter, a grid edit
updates the display while filtered + sorted, immutable replace / push, a `$state` lookup read by the callback,
`searchBehavior` + a replaced display callback re-filter, culture re-formats and re-filters, raw rows mutated in
place + new array. `e2e/quickgrid-virtual.spec.ts` (11; fixture `/test/quickgrid-virtual`): window + aria-rowcount
/ rowindex, scrolling, stripes, ↓ / ↑ ×40 scroll the focused cell into view both ways, Tab back in after scrolling
away, sort + filter over all rows, the edited row survives scrolling away (value kept, commits), tree collapse,
rows-mode End / Home, the hover toolbar follows the hovered row after a scroll, ignored with paging.
`e2e/quickgrid-perf.spec.ts`: a 300-row smoke test always; the timings only with `QG_PERF=1`.
Deferred / noticed: navigate-mode arrows pressed faster than a frame repeat the move from the same cell (focus
moves in a rAF; pre-existing, not virtual-specific — the spec presses one key per frame); a focused cell scrolled
out of the window loses focus (to `<body>`; Tab back in works); rows taller than `itemSize` (wrapping text, an
inline validation message) are measured on average only — variable row heights would need per-row measuring;
virtual + `pageable` not combined (paging wins); no PageUp / PageDown / Ctrl+Home / Ctrl+End cell navigation
(none exists without virtualisation either); the remaining non-virtual costs are DOM create / destroy and table
layout — cutting the ~10 grid-wide signals each cell reads (`invalidByKey`, `editingCell`, focus / tab-stop,
`columnStyles`, `labels`, …) to per-row deriveds would shrink Svelte's teardown work, not attempted.
