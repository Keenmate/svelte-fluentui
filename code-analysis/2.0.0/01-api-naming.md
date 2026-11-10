# 2.0.0 revision — 01 Public API naming audit

Audit date 2026-11-10. Paths relative to `packages/svelte-fluentui/src/lib`. Line = type declaration.
Status: **findings only — nothing approved/applied yet.**

## 1. camelCase event/callback props (all BREAKING)

| File:line | Current → Proposed |
|---|---|
| components/Anchor.svelte:26 | `onClick` → `onclick` |
| components/Calendar.svelte:47 | `onSelectionError` → `onselectionerror` |
| components/Calendar.svelte:48 | `onDatesSelected` → `onchange` (Date[]) or `ondatesselected` |
| components/Calendar.svelte:49 | `onDateSelected` → `onchange` or `ondateselected` |
| components/Calendar.svelte:51 | `onPickerMonthChange` → `onpickermonthchange` |
| components/Calendar.svelte:53 | `onDayHover` → `ondayhover` |
| components/DataGrid.svelte:15-16 | `onCloseColumnOptions/onCloseColumnResize` → lowercase |
| components/DatePicker.svelte:61 | `onValueChange` → `onchange` |
| components/DatePicker.svelte:62 | `onOpenChange` → `onopenchange` |
| components/DatePicker.svelte:64 | `onPickerMonthChange` → `onpickermonthchange` |
| components/Dialog.svelte:131 (`DialogAction`) | `onClick` → `onclick` |
| components/Dialog.svelte:157 | `onClose` → `onclose` |
| components/SiteSettings.svelte:8 | `onClose` → `onclose` (forward at :42) |
| components/InputFile.svelte:147-152,161 | `onFileSelected/onFileUploaded/onFileError/onCompleted/onValidityChange/onItemsChange/onItemRemove` → `onfileselected/onfileuploaded/onfileerror/oncomplete/onvaliditychange/onchange(items)/onitemremove` |
| components/InputFile.types.ts:44 | `FileUploadHandler` ctx `onProgress` → `onprogress` |
| components/layout/Grid.svelte:38 | `onBreakpointEnter` → `onbreakpointenter` |
| components/layout/TopNav.svelte:13 (`NavItem`) | `onClick` → `onclick` |
| components/nav/AppBarItem:11, NavExpander:8, NavItem:7, NavLink:13, NavLinkItem:13 | `onClick` → `onclick` (internal uses NavMenu:34, NavGroup:62) |
| components/Paginator.svelte:16-19 | `onFirst/onPrevious/onNext/onLast` → lowercase, or single `onpagechange(index)` |
| components/TimePicker.svelte:51-52 | `onValueChange/onOpenChange` → `onchange/onopenchange` |
| components/CommandPalette.types.ts:31 | `CommandPaletteItem.onSelect` → `onselect` |
| components/QuickGrid.svelte:62 (`EditorOptions`) | `onSearch` → `onsearch` (also GridCellEditor:49) |
| layout/MultiSplitter.svelte:826-829, types/index.ts:29 | internal context members — non-breaking rename |

Also: Autocomplete:78 `ondismissed` → `ondismiss`; QuickGrid:326 deprecated `onrowaction` → remove.

## 2. Prop values with wrong casing (BREAKING)

- QuickGrid:172 `PredefinedToolbarItemType` `'moveUp'|'moveDown'` → `'move-up'|'move-down'`
- fluent-ui/calendar/day-format.ts:2 (`dayFormat` on Calendar:32 / DatePicker:40) `"two_digit"` → `"2-digit"`; type uses non-exported `DayFormat` → literal union
- fluent-ui/calendar/fluent-calendar.ts:7 `CalendarSelectionErrorCode` `"max_selectable_days_exceeded"` → kebab
- QuickGrid:19 / GridCellEditor:6 `OptionsLoadTrigger` `"oneditstart"|"ondropdownopen"` → `"edit-start"|"dropdown-open"`
- stores/settings.ts:15,21+ `accentColor` `'OneDrive'`, keys `Default/Access/...` → kebab, or document as brand names
- Badge:15 / Label:13 size `xs|sm|medium|lg|xl` (mixed) → one scale (see §3 sizes)
- optional: QuickGrid:18 `EditTrigger "dblclick"` → `"double-click"`

## 3. Same concept, different names

- **Open state**: `open` (Combobox, Select, DatePicker, TimePicker, MenuButton, CommandPalette, Panel, SiteSettings) vs `visible` (Dialog:136, Tooltip:22, PositioningRegion:19). → `open` for overlays; keep `expanded` for disclosure (AccordionItem, NavGroup); NavMenu `collapsed` → consider `expanded`.
- **Value**: `value` mostly; Autocomplete `selectedOptions`, Calendar `value`+`selectedDates`, Select `string|string[]` vs Combobox always `string[]`. → `value` everywhere; Calendar merges by `selectMode`; Select/Combobox share shape (`string` single, `string[]` multiple).
- **Multi flag**: `multi` (Accordion:28, Listbox:14) vs `multiple` (rest). → `multiple`.
- **onchange payload**: value (Accordion, Combobox, RadioGroup, Slider, Search, Textarea), `(ev,isExpanded)` AccordionItem, detail obj Select, Event (Listbox, NumberField, TextField), checked Switch, none on Checkbox (only `onclick(ev, prev)`), custom names DatePicker/TimePicker/Autocomplete/InputFile/Tabs. → `onchange(value, detail?)` everywhere; add Checkbox `onchange`.
- **disabled/readonly**: consistent ✓.
- **Labels**: `label` (inputs, Option, Tab, CompositeBadge snippet), `header` (AccordionItem string + `heading` snippet — confusing), `title` (Alert, Dialog, Toast, ValidationSummary, NavGroup — used as persistence id!), `text` (Chip, Autocomplete local OptionItem). → `label` for captions, `title` for container headings; AccordionItem `header`→`heading`; NavGroup gets explicit `id`; unify OptionItem on `label`.
- **Appearance/intent**: `appearance` OK. Semantic palettes differ — Alert `info/success/warning/danger`, Toast `.../error/...`, Field `none/warning/error/success`, Label/CompositeBadge `primary/secondary/...`, Badge Fluent v9 set. → `intent: "info"|"success"|"warning"|"error"` for Alert/Toast/Field; `ToastOptions.variant` → `intent`; Alert `danger` → `error`.
- **Sizes**: Badge/Label `xs/sm/medium/lg/xl`, Dialog `small/medium/large/extra-large/full`, CommandPaletteTrigger `small/medium/large`, InputFile `cardSize minimal/compact/big`, Grid `xs…xxl` (breakpoints, fine), Icon numeric (fine). → `small|medium|large` (+`extra-small`/`extra-large`); `big` → `large`.
- **Position**: Select/Combobox `above/below`, MenuButton `bottom/top`, Tooltip/PositioningRegion `left/right/top/bottom`, Panel `side left/right/start/end`, ToastPosition `top-right…`, QuickGrid `Column.align left/center/right`. → `top/bottom/start/end` (logical), Toast `top-start…`, align `start/center/end`.
- **Orientation**: values consistent, type redeclared 5× (Layout:4, MultiSplitter:30, Field, AppBar, Stack) → one exported `Orientation`.
- **Snippets**: adornments `start/end` (Button, TextField…) vs Anchor `iconStart/iconEnd` vs Autocomplete `startIcon/endIcon` → `start/end`. `*Template` suffix vs bare (`item`, `empty`, `footer`) vs `*Content` → pick one convention. Tab has both `content` and `childContent`.
- **Empty state**: Combobox `noDataText`+`noDataTemplate`, CommandPalette `empty`, InputFile `emptyState` → `emptyText` + `empty` snippet.
- **Search debounce**: Combobox `searchDelay`, Autocomplete/Search `immediateDelay`, EditorOptions `debounceMs` → one name. Search callback return shapes differ too.
- **Close behaviour**: `closeOnSelect` vs `autoClose` vs `keepOpen` → one positive name.
- **Dismiss**: `dismissable` (misspelled, Alert/Dialog) → `dismissible` + `ondismiss`; Tab `showClose`/`oncloseclick`, Chip `showRemove`/`onremove`, CompositeBadge `showButton`/`onbuttonclick`.
- **Limits**: InputFile `maxFileCount` + `maxFiles` duplicates → `maxFiles`; Autocomplete `maxSelectedOptions` vs EditorOptions `maxSelections`. Calendar `disabledDateFunc` + `selectableDates` inverse pair → keep `disabledDateFunc`.
- **ARIA**: `ariaLabel` mostly; Button:25, InputFile:142-144 `"aria-label"`; Dialog `ariaDescribedby` → pick one (native `aria-*` passthrough preferred).
- **Width/height**: mostly string; Card/Spacer `string|number`; Header:6, TopNav:35 number → `string|number`.
- **Gap**: Grid has `gap` and `spacing` overlapping.

## 4. Loosely typed props

- `appearance?: string` → unions: Button:8, TextField:12, Autocomplete:31, DatePicker:26, TimePicker:25, MenuButton:59
- TextField:16 `type` → union; Button:18 `type` → `"button"|"submit"|"reset"`, `formnovalidate` → boolean
- DataGridRow:11 `rowType` → union; DataGrid:14 / DataGridCell:13 `role` probably not public
- AccordionItem:23 `headingLevel` → `1|…|6`
- Badge:13-14 `| (string & {})` makes unions open
- Calendar/DatePicker `firstDayOfWeek` → `0…6`
- Icon:6 `'custom'` + `customColor` + legacy `primaryFill` → drop `primaryFill`
- Radio:42 context `any`
- **types/index.ts:1 `SlotType = any` used for every snippet → `Snippet<[...]>`** (biggest typing hole)
- Tabs:82 `justify: boolean` clashes with Grid `justify` → `stretch`/`fullWidth`
- QuickGrid `Column.format/template/validate`, `CustomEditorContext.value` → `any`

## 5. $bindable gaps

Missing: Calendar.value/selectedDates, AccordionItem.expanded, Tooltip/PositioningRegion visible, SiteSettings.open, Paginator.currentPageIndex, BadgeGroup.showAll, Combobox.currentValue.
Odd: AppBarItem.active bindable but never written; Checkbox.checked declared required; NumberField.value `string` vs Slider `number`.

## 6. Export surface

- Aliases: `ProgressBar` (= Progress.svelte, `Progress` not exported), `AnchorButton` (= Anchor). Pick one name.
- Icon exported twice (index.ts + icons/index.ts).
- **Empty stub wrappers exported**: Menu, MenuItem, Progress, Tree, TreeItem (`type Props = {}`, `<!-- todo -->`). Finish or remove.
- Not exported: Chip (decide), GridCellEditor / InputFileSelector* (internal, fine).
- **Name collisions (bugs)**: stores type `Toast` vs component `Toast`; stores type `SiteSettings` vs component `SiteSettings` — explicit component export shadows the types. → `ToastItem`, `SiteSettingsState`. stores/theme.ts `Theme` unexported, duplicates `ThemeMode`.
- Public prop types not exported: Badge*/Label*/CompositeColor/Alert `Intent`/Icon*/`DialogAction`/`SelectChangeDetail`/`TabChangeDetail`/`TabEntry`/Tooltip `Position`/PositioningRegion types/Grid types/`Orientation`/Panel `Side`/TopNav types/`AppBarOrientation`/`DayFormat`/`ValueType`/contexts.
- **QuickGrid model types live in the instance script → not importable at all** (`Column<T>`, `EditorOptions`, `RowChangeDetail`, `ContextMenu*`, `BeforeCommit*`, …). Highest-impact gap. Editor types are also duplicated in GridCellEditor:5-30 and have drifted (`loadOptions` signature). → `QuickGrid.types.ts`.
- Autocomplete:15 local `OptionItem<T>` (`text`) conflicts with exported `OptionItem` (`label`) → generic `OptionItem<T = string>`.
- `SelectedValue` is `string[]` only but Select value is `string|string[]`.
- `FileUploadHandler/Chunk/Result` → `InputFileUpload*`; `ValidationState` → `FieldValidationState`.
- Deprecated to remove: QuickGrid `showRowActions`, `rowActions`, `onrowaction`; Icon `primaryFill`.

## 7. Boolean naming

- `is*` only in QuickGrid (`isRowEditable`, `Column.isEditable`, `Column.isTree`) → bare adjectives.
- `show*`, `allow*` consistent ✓; NumberField `hideStep` is the Fluent attribute ✓.
- TimePicker `use24Hours` + `useAmPm` redundant → `hourCycle: "h12"|"h23"`.
- Checkbox `withIntermediate` / `threeStateOrderUncheckToIntermediate` / `intermediateMessage` — should be "indeterminate"; → `threeState`, `indeterminateMessage`.
- Unclear: Calendar `checkIfSelectedValueHasChanged`, `disabledSelectable`, `disabledCheckAllDaysOfMonthYear`; Card `areaRestricted`, `minimalStyle`; PositioningRegion `availableHeight` (boolean) → `constrainHeight`; QuickGrid `dropdownShowOnFocus`; Label `outline` vs `appearance`; Dialog `preventClose` vs `onbeforeclose`.

## 8. Context keys

Raw strings `"fluent-accordion"`, `"selected-options"`, `"grid"` (collision-prone), `"multi-splitter"`, `"radio-group"` (typed any); only Tabs uses an exported `Symbol`. Commented-out `"nav-group"` in NavItem:20. → central `contexts.ts` with Symbols / Svelte `createContext` and typed getters (non-breaking).

## Priorities

1. Bugs: shadowed `Toast`/`SiteSettings` types; non-exportable QuickGrid types; exported stub components; conflicting `OptionItem`.
2. Event rename sweep (§1).
3. Value casing (§2).
4. `onchange(value)` contract.
5. Concept renames (§3).
6. Typing: `SlotType` → `Snippet`, appearance unions, export prop types, dedupe `Orientation`/`ValueType`.
7. Bindable gaps.
8. Cleanup: aliases, deprecated props, context keys, `is*`.
