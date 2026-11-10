# 2.0.0 revision — 05 Callbacks & events (KeenMate interaction model, Svelte adaptation)

Sources of truth (no runtime dependency on them — svelte-fluentui stays standalone):
- `../web-components-core/docs/SPEC.md` §12.5 (callbacks & events), §12.12 (actions), §12.13 (menu)
- `../web-components-core/docs/interaction-model-plan.md` (decisions 1–25)
- `C:\Git\BlissFramework\guidelines\web-components\naming-conventions.md` — "Web Component / **Svelte Component** Guideline"
- Svelte precedent: `../svelte-treeview` (`onNodeClick(ctx)`, `onSelectionChange(ctx)`, `beforeActionCallback`, `get*Callback` / `*Member`, `onAction`)

Status: **approved 2026-11-10** — option B casing + the whole model below. Supersedes 01-api-naming.md §1 (which proposed lowercase names).

**Decision 2026-11-10 (user):** option B — camelCase for every event the component defines (`onChange`, `onOpenChange`, `onFileUpload`), lowercase only for real browser events passed through untouched (`onclick`, `oninput`, `onkeydown`, …). Same as the BlissFramework rulebook and svelte-treeview. Considered and rejected: all events lowercase (`onopenchange`) — it splits casing by events vs callbacks instead of browser vs component, and long names become unreadable.

## Rules (adopted from core, adapted to Svelte)

1. **Classify by one question — does the component use the return value?**
   | Shape | Name | Return | Example |
   |---|---|---|---|
   | Event | `on<Name>` | ignored | `onChange`, `onOpenChange`, `onFileUpload` |
   | Interceptor | `before<Act>Callback` | `false` rejects · `undefined` continues · other value replaces; may be async | `beforeCloseCallback`, `beforeActionCallback` |
   | Data extractor | `get<Thing>Callback` (+ `<thing>Member`) | the value | `getIsDateDisabledCallback`, `getDisplayValueCallback` |
   | Behaviour provider | `<verb>Callback` | the result | `searchCallback`, `filterCallback`, `renderCellCallback` |
   No `can*`, `*Func`, `on*` that returns something, or `on*` for a veto.
2. **Two kinds of `on*` prop — distinguished by casing:**
   - **Native DOM events** are lowercase exactly as the platform (`onclick`, `oninput`, `onkeydown`, `onfocus`, `onblur`, native `onchange`). They receive the **native Event**, untouched, and reach the root/host element via `...rest` (or explicit forwarding where the root isn't the target). Never re-shaped (no `onclick(ev, previousValue)`).
   - **Component events** are `on` + PascalCase (`onChange`, `onOpenChange`, `onTabClose`) and receive **one `ctx` object**. camelCase keeps them off the native handler names, so a component `onChange({ value })` can never be confused with the native `onchange(Event)` that `...rest` forwards. (Rulebook "CustomEvent naming" rule 7; same as svelte-treeview.)
3. **One argument, always `ctx`** — never positional. Fields can be added later without breaking anyone. User-triggered events add `sourceEvent` (the native event) where one exists.
   - svelte-fluentui components have no public controller facade, so ctx carries no `controller` / `element` (svelte-treeview has a controller; we don't). Can be added later without a break — that's the point of ctx.
4. **Two event shapes only:**
   - **State change** → `on<State>Change`, carries the **whole new state named like the property**: `onChange({ value })`, `onOpenChange({ open })`, `onExpandedChange({ expanded })`, `onFiltersChange({ filters })`. (Matches web-multiselect `change` → `{ selectedOptions, selectedValues }`, treeview `onExpandedChange({ paths })`.)
   - **Single act** → `on<Domain><Verb>`, present tense, max two words: `onFileUpload`, `onTabClose`, `onRowChange`, `onPaneResize`.
5. **`onChange` is reserved for the form value** (what a `<form>` would submit / the bindable `value`/`checked`/`items`). Other state uses `on<State>Change`. Never two events with the same detail for one act (no `onDateSelected` + `onDatesSelected` + `onChange`).
6. **`before*Callback` contract** — one ctx, may be async, `false` rejects, `undefined` continues, any other value continues with that value. A throw rejects and is logged. While an async interceptor is pending the trigger is busy (second click ignored). Sync exception (documented) where the native event needs an immediate answer (`keydown`, `dragstart`).
7. **Per-value transforms are `get*Callback`, not `before*`** (they can't cancel).
8. **ctx nouns:** `item` is reserved for an **action item**; everything else uses the domain noun (`option`, `row`, `column`, `file`, `tab`, `date`, `pane`). Never a bare `index` (`rowIndex`, `fileIndex`). Search text is always `term`; an abort signal is `signal`. Old/new pairs are `old*`/`new*` (only where the old value is useful).
9. **Action items** — every configurable clickable thing (MenuButton items, ContextMenu items, QuickGrid row toolbar + context menu, Dialog actions, CommandPalette commands, TopNav items, Toast actions) uses one shape:
   ```ts
   interface ActionItem<Ctx> {
     action?: string           // built-in name (kebab-case), or 'custom'
     id?: string               // identifies a custom item
     text: string; icon?: string | Snippet; tooltip?: string; shortcut?: string; cssClass?: string
     isVisible?: boolean; isDisabled?: boolean; isDanger?: boolean; isToggled?: boolean
     getTextCallback?(ctx: Ctx): string; getIsVisibleCallback?(ctx: Ctx): boolean
     getIsDisabledCallback?(ctx: Ctx): boolean; getIsToggledCallback?(ctx: Ctx): boolean
     onClick?(detail: ActionEventDetail<Ctx>): void | Promise<void>
   }
   interface MenuItem<Ctx> extends ActionItem<Ctx> {
     children?: MenuEntry<Ctx>[]; getChildrenCallback?(ctx: Ctx): MenuEntry<Ctx>[] | Promise<MenuEntry<Ctx>[]>
     shouldCloseOnClick?: boolean   // default true
   }
   interface MenuDivider { divider: true; text?: string }
   ```
   - Static field + separate `get*Callback` (callback wins); never `boolean | fn` unions.
   - Action items are config, not data → `is*` booleans (`isDisabled`, `isDanger`), and core field names `text` / `onClick` / `cssClass` (not `label` / `onclick` / `className`).
   - Dividers are their own entry; no `dividerBefore` / group numbers.
   - String shorthand for built-ins: `rowToolbar: ['add', 'delete', 'move-up']`.
   - **One `onAction(detail)` per component** + `beforeActionCallback(detail)`. Order: `beforeActionCallback` (false → nothing runs) → item `onClick` → built-in → `onAction` (notification after the fact). Detail = surface ctx + `action`, `id`, `item`, `source` (`'row-toolbar' | 'context-menu' | 'menu' | 'dialog' | 'palette' | 'toast' | …`), `sourceEvent`, `triggerElement`.
   - `isToggled` → `aria-pressed` (button) / `role="menuitemcheckbox"` + `aria-checked` (menu).
   - Implemented once in `lib/actions/` (types + `resolveActionItem`, `resolveMenuEntries`, `runAction`) — a port of core's `/actions`, not an import.
10. **Verbs** from the glossary: `open`/`close` for surfaces you work in (Dialog, Panel, dropdowns, menus, palette) → `open` + `onOpenChange`; `show`/`hide` for display-only (Tooltip, Toast, messages) → `visible`. `remove` = local, `delete` = user's destructive command. No `Async` suffix (`Search.focusAsync` → `focus`).
11. **Message/intent values** are `info | success | warning | danger` (rulebook D-NC-23: `danger`, not `error`). Alert already uses this; Toast and Field change.

### Deliberate deviations from the web-component model

| Core / rulebook | svelte-fluentui | Why |
|---|---|---|
| `CustomEvent` + `on*` twin | `on*` prop only | Rulebook: "Svelte components don't need this duality". |
| ctx carries `controller`, `element` | domain fields only (+ `sourceEvent`) | No public controller facade; addable later without a break. |
| Config booleans `is*` / `should*` / `enable*` | Fluent / HTML attribute form for component props (`disabled`, `open`, `multiple`, `closeOnSelect`, `showSeconds`) | Svelte props are the attribute-like surface; names come from Microsoft Fluent. Action items still use `is*` (rule 9). |
| Native composed names forbidden as event names | Lowercase native names allowed **only** for the real native Event | Svelte forwards real DOM events; a component event is always camelCase so it can't collide. |

## Mapping (current → proposed)

Paths relative to `packages/svelte-fluentui/src/lib/components/`. All BREAKING.

### Value / form components
| Component | Current | Proposed |
|---|---|---|
| Accordion | `onchange(value)` | `onChange({ value })` |
| AccordionItem | `onchange(ev, isExpanded)` | `onExpandedChange({ expanded, sourceEvent })` |
| Autocomplete | `onselectedoptionschange(T[])` | `onChange({ value })` (prop `selectedOptions` → `value`) |
| Autocomplete | `onoptionssearch(searchText)` → options | `searchCallback({ term, signal })` → options |
| Autocomplete | `ondismissed()` | verify meaning → `onOpenChange({ open: false })` or remove |
| Calendar | `onDateSelected(value)` + `onDatesSelected(values)` | one `onChange({ value })` (`Date \| Date[]` by `selectMode`) |
| Calendar | `onSelectionError(error)` | `onSelectionReject({ code, … })` |
| Calendar / DatePicker | `onPickerMonthChange(month)` | `onPickerMonthChange({ pickerMonth })` |
| Calendar | `onDayHover(date \| null)` | `onDayHover({ date })` |
| Calendar / DatePicker | `disabledDateFunc(date)` | `getIsDateDisabledCallback({ date })` |
| Checkbox | `onclick(ev, previousValue)` | native `onclick(ev)` + `onChange({ checked })` |
| Combobox | `onchange(value)` | `onChange({ value })` |
| Combobox | `onsearch(query)` | `onSearch({ term })` |
| DatePicker | `onValueChange(value)` | `onChange({ value })` |
| DatePicker / TimePicker | `onOpenChange(open)` | `onOpenChange({ open })` |
| InputFile | `onItemsChange(items)` | `onChange({ items })` |
| InputFile | `onFileSelected(files)` | `onFileAdd({ files })` |
| InputFile | `onFileUploaded(file, item)` | `onFileUpload({ file, fileIndex })` (`file` = `InputFileItem`; `item` is reserved) |
| InputFile | `onFileError(file, error, item)` | `onFileError({ file, error })` |
| InputFile | `onCompleted()` | `onUploadComplete({ files })` |
| InputFile | `onValidityChange(valid, reasons)` | `onValidityChange({ isValid, reasons })` |
| InputFile | `onItemRemove(item)` | `onFileRemove({ file })` |
| InputFile | `FileUploadHandler(…, onProgress)` | `uploadCallback({ file, signal, reportProgress })` |
| Listbox | `onchange(ev)` | `onChange({ value })` (native `onchange` via rest) |
| NumberField / TextField | `onchange(ev)`, `oninput(ev)`, `onkey*`, `onfocus`, `onblur` | native via `...rest` (drop hand-written forwarders) + `onChange({ value })` |
| RadioGroup | `onchange(value)` | `onChange({ value })` (and fix keyboard desync) |
| Search | `oninput(value)`, `onchange(value)` | `onChange({ value })` + `onSearch({ term })` (debounced); native `oninput` via rest |
| Select | `onchange(SelectChangeDetail)` | `onChange({ value, option })` |
| Slider | `onchange(value)`, `oninput(value)` | `onChange({ value })`; live value via `bind:value` |
| Switch | `onchange(checked)` | `onChange({ checked })` |
| Textarea | `oninput(value)`, `onchange(value)` | `onChange({ value })`; native via rest |
| TimePicker | `onValueChange(value)` | `onChange({ value })` |
| TimePicker | `disabledTimeFunc(h, m, s)` | `getIsTimeDisabledCallback({ hour, minute, second })` |

### Surfaces (open/close)
| Component | Current | Proposed |
|---|---|---|
| CommandPalette | `onopen()`, `onclose()` | `onOpenChange({ open })` |
| CommandPalette | `onselect(item)` + `CommandPaletteItem.onSelect()` | items → `ActionItem`; `onAction(detail)` (`source: 'palette'`) |
| ContextMenu | `onopen({x, y})`, `onclose()` | `onOpenChange({ open, x, y })`; items → `MenuEntry`; `onAction`, `beforeActionCallback` |
| Dialog | `visible` + `onClose()` | `open` + `onOpenChange({ open })` |
| Dialog | `onbeforeclose()` + `preventClose` | `beforeCloseCallback({ reason })` (`false` keeps it open); drop `preventClose` |
| Dialog | `DialogAction { onClick → boolean }` | `ActionItem` + `shouldCloseOnClick`; `onAction`, `beforeActionCallback` |
| MenuButton | `onopen()`, `onclose()`; item `onclick()` | `onOpenChange({ open })`; items → `MenuEntry`; `onAction`, `beforeActionCallback` |
| Panel / SiteSettings | `onclose()` / `onClose()` | `onOpenChange({ open })` |

### Display / feedback
| Component | Current | Proposed |
|---|---|---|
| Alert | `ondismiss()` | `onDismiss({ sourceEvent })` |
| Toast | `ondismiss()` | `onDismiss({ sourceEvent })` |
| Toast | `ontopactionclick`, `onprimaryactionclick`, `onsecondaryactionclick` | toast actions → `ActionItem[]`; `onAction(detail)` (`source: 'toast'`) |
| Chip | `onremove(ev)` | `onRemove({ sourceEvent })` |
| CompositeBadge | `onlabelclick(ev)`, `onbuttonclick(ev)` | `onLabelClick({ sourceEvent })`, `onButtonClick({ sourceEvent })` |
| ValidationSummary | `onjumpto(field)` | `onFieldClick({ field })` |
| Badge / Label / Button / Option / CommandPaletteTrigger | `onclick(ev)` | native `onclick` via rest (Trigger currently passes no event — fix) |

### Navigation / layout
| Component | Current | Proposed |
|---|---|---|
| Anchor, nav/AppBarItem, NavExpander, NavItem, NavLink, NavLinkItem | `onClick(ev)` | native `onclick` via rest |
| layout/TopNav items | `NavItem.onClick()` | `ActionItem`-style `onClick(detail)` (+ `href`) |
| layout/Grid | `onBreakpointEnter(size)` | `onBreakpointChange({ breakpoint })` |
| layout/MultiSplitter | `onresize`, `oncollapse`, `onexpand` | `onPaneResize(ctx)`, `onPaneCollapse(ctx)`, `onPaneExpand(ctx)` |
| Paginator | `onFirst/onPrevious/onNext/onLast()` | `onPageChange({ pageIndex })` + bindable `currentPageIndex` |
| Tab / Tabs | `canLeave()` | `beforeLeaveCallback({ tab, newTab })` |
| Tab / Tabs | `canClose()` | `beforeCloseCallback({ tab })` |
| Tab / Tabs | `oncloseclick()` | `onTabClose({ tab })` |
| Tabs | `ontabchange(TabChangeDetail)` | `onActiveIdChange({ activeId, oldActiveId })` |
| DataGrid | `onCloseColumnOptions`, `onCloseColumnResize` | remove (FAST never fires them) |
| DataGrid / Row / Cell | `onkeydown/onclick/ondblclick/onfocus` | native via `...rest` |

### QuickGrid
| Current | Proposed |
|---|---|
| `Column.format(value, row)` | `getDisplayValueCallback({ value, row, column })` |
| `Column.template(row)` | `renderCellCallback({ row, column })` |
| `Column.filter(filterValue, row)` | `filterCallback({ term, row, column })` |
| `Column.validate(value, row)` | `validateCallback({ value, row, column })` |
| `Column.onbeforecommit(ctx)` → `BeforeCommitResult` | `beforeCommitCallback(ctx)` with the before* contract (`false` rejects, value replaces) |
| `Column.oncelledit(ctx)` | verify → `renderEditorCallback(ctx)` |
| `EditorOptions.loadOptions(row, field)` | `loadOptionsCallback({ row, column, signal })` |
| `EditorOptions.onSearch(query, row, signal)` | `searchCallback({ term, row, column, signal })` |
| row toolbar item `onclick({ row, rowIndex })` | `ActionItem.onClick(detail)`; built-ins `add`, `delete`, `duplicate`, `move-up`, `move-down` |
| context-menu item `onclick(ctx)` | `MenuItem.onClick(detail)` |
| `ontoolbarclick(detail)` + deprecated `onrowaction` | one `onAction(detail)` (`source: 'row-toolbar' \| 'context-menu'`) + `beforeActionCallback` |
| `oncontextmenuopen(ctx)` | `getContextMenuItemsCallback(ctx)` (svelte-treeview parity) or remove |
| `onfilterchange(filters)` | `onFiltersChange({ filters })` |
| `onrowchange(detail)` | `onRowChange(ctx)` |
| `onroweditstart(detail)` / `onroweditcancel(detail)` | `onEditStart({ row, rowIndex, column })` / `onEditCancel(…)` |
| `onvalidationerror(detail)` | `onValidationError({ row, rowIndex, column, error })` |

## Knock-on changes to other audit items

- 01 §3 "Tooltip / PositioningRegion `visible` → `open`": **only Dialog** moves to `open`; Tooltip is display-only and keeps `visible` (glossary).
- 01 §3 intent palette: `danger`, not `error` (rule 11).
- 01 §3 limits: rulebook D-NC-22 says `maxFileCount` (keep it, drop `maxFiles`), `max<Noun>Count` for the rest (`maxSelectedOptions` → `maxSelectionCount`).
- 01 §3 "multi → multiple": confirmed by rulebook D-NC-27.
- 01 §3 empty-state names: rulebook D-NC-24 uses one `labels` prop with `noData` / `noResults` keys — consider for 2.0 instead of `noDataText`/`emptyText`.
- 02 cluster 4 (menus): the shared `MenuSurface` implements rule 9 (port of core `/menu` keyboard + dismiss model).
- svelte-fluentui CLAUDE.md "Event Handler Naming" section must be rewritten (lowercase rule → rules 1–2 above). The BlissFramework rulebook already says camelCase; it lacks only the Svelte native-passthrough clarification (proposed, not applied).
