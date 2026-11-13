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

## Phase 6 — keyboard & accessibility

- Sort headers: `<button>` inside `th`, `aria-sort`, glyphs `aria-hidden` (currently mouse-only, a11y warning silenced).
- Navigate mode traps Tab at the last editable cell (`preventDefault` before the null check) — WCAG 2.1.2; roving `tabindex` instead of `tabindex=0` on every cell.
- Context menu: Shift+F10 / ContextMenu key, focus into the menu, restore on close, Enter activation.
- Tree: `role="treegrid"`, `aria-level`, `aria-expanded`, labelled chevron with a visible focus ring.
- Toolbar reachable by keyboard in hover mode; `⋮` trigger `aria-label` / `aria-haspopup` / `aria-expanded`.
- `aria-rowcount`/`aria-rowindex` when paged; `aria-label` on filter inputs; a way to label the `<table>`; live region for result/page changes.
- Localisable strings (`labels` prop): "Filter…", "No items to display", pager, Expand/Collapse, toolbar presets, menu built-ins.

## Phase 7 — performance, styling, split

- Key `{#each}` (Phase 1); precompute per-render maps (`invalidByKey`, column styles, path segments)
  instead of per-cell scans and user-callback calls; `columns.find` per row per filter; consider
  windowing above ~500 rows.
- Styling: fold the ~10 `[data-theme="dark"]` fallback blocks into `--fluent-quickgrid-*` variables
  (5 exist today; add toolbar / menu / focus / editing), connector stroke `#0078d4`, one `margin-top`.
- `renderCellCallback` goes through `{@html}` unsanitised — document the XSS risk (or require a snippet).
- Cleanup: unused `cellTemplate` prop, `containerRef`, dead draft helpers, `resolvedShowToolbar` /
  `displayItems` aliases, `.row-action-popup` CSS, `filteredOptions = $derived(() => …)`.
- **Split** (do incrementally, each phase extracts what it touches):
  `quickgrid/pipeline.svelte.ts` (Phase 4) · `quickgrid/tree.ts` · `quickgrid/editing.svelte.ts` (Phase 2) ·
  `quickgrid/navigation.ts` (Phase 6) · `QuickGridHeader.svelte` · `QuickGridCell.svelte` ·
  `QuickGridRowToolbar.svelte` + `QuickGridContextMenu.svelte` (Phase 5) · `QuickGridPager.svelte`
  (or reuse `Paginator`) → `QuickGrid.svelte` ≈ 400 lines.

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
