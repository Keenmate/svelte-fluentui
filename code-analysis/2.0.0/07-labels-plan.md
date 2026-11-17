# 07 — `labels` key cleanup (2.0.0)

Status: **proposal, waiting for the user** (2026-11-17). Nothing changed in code yet.

`labels` stays (about 160 strings over 21 components; one prop per string is not an option). This
plan only renames keys so the same meaning has the same name everywhere, folds the leftover
standalone text props into `labels` (00-plan question 1), and evens out the file layout.
All of it is breaking against 1.x where the key or prop existed there; each item gets a
CHANGELOG bullet and a before→after row in `release-notes/2.0.0-rc01.md`.

## Rules

1. A key says **what the text is for**, never where it lands: no `Text` / `Title` / `AriaLabel` / `Label`
   suffixes (`emptyText` → `empty`, `filterAriaLabel` → `filter`).
2. **One string per purpose.** Where a button had a tooltip key and an aria key with different
   wording (Toast `dismiss` / `dismissTitle`, Tabs `closeTab` / `closeTabTitle`), one key feeds both.
3. **Shared meanings use the shared key, with the same signature** (vocabulary below).
4. **No physical directions** in keys (rule: start/end). Text that depends on direction is avoided.
5. A **function** when the text contains a value, otherwise a string. Kept as functions (not
   `{count}` templates like web-multiselect) — they allow real plural rules.
6. **Files:** every component has `X.labels.ts` exporting `type XLabels` + `defaultXLabels`.

## Shared vocabulary

| Key | Meaning | Used by |
|---|---|---|
| `close` | × that closes a container | Dialog, Panel, ToastContainer, Tabs (per tab) |
| `dismiss` | makes a message / chip go away | Alert, Toast, CompositeBadge, Dialog (`dismissible` button) |
| `clear` | the field's `showClear` × | Select, Combobox, Autocomplete, DatePicker, TimePicker |
| `remove(item)` | removes one item from a set | Chip, Combobox, Autocomplete, InputFile |
| `empty` | there is nothing at all to show | CommandPalette, QuickGrid, InputFile |
| `noMatches(query)` | a search / filter found nothing | Combobox, Autocomplete, CommandPalette |
| `loading` | waiting for data | Combobox, Autocomplete |
| `openPopup` / `closePopup` | the button that opens / closes the field's popup | DatePicker, TimePicker, Autocomplete |
| `popup` | accessible name of the popup itself | DatePicker, TimePicker |
| `showMore(n)` / `showLess` | reveal / hide overflow items | BadgeGroup, InputFile |
| `previousPage` `nextPage` `pageInfo(page, pageCount)` `itemCount(count)` `pagination` | paging | Paginator, QuickGrid (already shared) |
| `placeholder` | empty-input hint | Autocomplete, CommandPalette, DatePicker, TimePicker |

`close` vs `dismiss`: kept as two words on purpose — closing a container (it can come back) vs
dismissing a notification (it's gone). Defaults stay "Close …" / "Dismiss".

## Before → after

Only changed keys are listed; every other key keeps its name.

| Component | Before | After | Note |
|---|---|---|---|
| Autocomplete | `emptyText` | `noMatches(query)` | default ignores `query`: "No results found" |
| Autocomplete | `clearSelection` | `clear` | |
| Autocomplete | `showOptions` / `closeOptions` | `openPopup` / `closePopup` | |
| Autocomplete | `removeChip(label)` | `remove(item)` | |
| BadgeGroup | `more(hiddenCount)` / `less` | `showMore(n)` / `showLess` | |
| Combobox | `emptyText` | `noMatches(query)` | default "No results found" |
| Combobox | `loadingText` | `loading` | default stays "Searching…" |
| Combobox | `removeChip(label)` | `remove(item)` | |
| Combobox | `clearSelection` | `clear` | |
| CommandPalette | `noItems` | `empty` | |
| DatePicker | `openCalendar` | `openPopup` | default stays "Open calendar" |
| InputFile | `emptyText` | `empty` | |
| InputFile | `remove` (string) | `remove(name)` | "Remove {name}" — the file name in the button's accessible name |
| InputFile | `DEFAULT_LABELS` in `InputFile.utils.ts`, type in `InputFile.types.ts` | `defaultInputFileLabels` + `InputFileLabels` in `InputFile.labels.ts` | public export names unchanged |
| QuickGrid | `filterAriaLabel(title)` | `filter(title)` | |
| QuickGrid | `emptyText` | `empty` | |
| QuickGrid | `editorEmptyText` / `editorFilterEmptyText` | `editorEmpty` / `editorNoMatches` | |
| QuickGrid | `quickgrid/labels.ts` + type in `QuickGrid.types.ts` | `QuickGrid.labels.ts` | public export names unchanged |
| Select | `clearSelection` | `clear` | |
| Tabs | `closeTab` + `closeTabTitle` | `close` | one string for tooltip + aria ("Close tab") |
| Tabs | `scrollLeft` `scrollRight` `scrollUp` `scrollDown` | `scrollBackward` / `scrollForward` | "Scroll to previous / next tabs"; drops the RTL swap in `TabsScrollButton` |
| Toast | `dismiss` + `dismissTitle` | `dismiss` | one string for tooltip + aria |

Default-value fixes found on the way (no rename):
- Paginator `itemCount` has no plural ("1 items"); QuickGrid's has. Paginator gets QuickGrid's.
- Paginator `previousPage` "Go to previous page" vs QuickGrid "Previous" — QuickGrid's pager shows
  the text visibly, Paginator's is an aria-label, so they stay different (same key, different default).

## Standalone props folded into `labels` (00-plan question 1)

| Component | Removed prop | Use instead |
|---|---|---|
| DatePicker | `openCalendarIconAriaLabel` | `labels.openPopup` |
| DatePicker | `popupAriaLabel` | `labels.popup` |
| TimePicker | `openClockIconAriaLabel` | `labels.openPopup` |
| TimePicker | `popupAriaLabel` | `labels.popup` |
| Combobox | `loadingText` | `labels.loading` |
| BadgeGroup | `moreLabel` / `lessLabel` | `labels.showMore` / `labels.showLess` |
| Chip | `removeLabel` | `labels.remove` |

Stay standalone: `placeholder` (every field, as on the Fluent wrappers) and `emptyText` / the `empty`
snippet (per-instance content). Internal callers move too: Combobox/Autocomplete pass
`labels={{remove: labels.remove}}` to Chip; QuickGrid's `GridCellEditor` passes `labels={{loading: …}}`.

## Optional: app-wide defaults

Today a Czech app has to pass `labels` to every instance. Proposal:

```ts
// root +layout.svelte
setFluentLabels({
	common: {close: "Zavřít", clear: "Vymazat", remove: (item) => `Odebrat ${item}`, noMatches: () => "Nic nenalezeno"},
	datePicker: {openPopup: "Otevřít kalendář"}
})
```

- Svelte context (set in the root layout), not a module global — safe with SSR serving several locales.
- `common` holds the shared vocabulary; it applies to every component that has that key.
- Precedence: instance `labels` > `setFluentLabels` per component > `setFluentLabels` common > English defaults.
- A `FluentLabels` type maps component names to their `Partial<XLabels>`.
- One helper (`resolveLabels("datePicker", defaultDatePickerLabels, () => labels)`) replaces the
  `{...defaultX, ...labels}` merge every component does now.

## Questions for the user

- L1. Shared vocabulary + renames as above — OK, or changes?
- L2. `close` and `dismiss` as two keys (container vs message) — OK, or one key?
- L3. App-wide defaults (`setFluentLabels`) — in 2.0.0 now, later, or never?
- L4. Keep functions (not `{count}` templates)?

## Order of work (once approved)

1. Files: `InputFile.labels.ts`, `QuickGrid.labels.ts` (export names unchanged).
2. Key renames, component by component, with docs pages and e2e in the same commit.
3. Fold the standalone props.
4. `setFluentLabels` + `resolveLabels` (if L3 = now).
5. CHANGELOG + release-notes rows; `npm run check` (lib + docs) and full Playwright run.
