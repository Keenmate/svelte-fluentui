# 2.0.0 revision — 03 Internal code style audit

Audit date 2026-11-10. Paths relative to `packages/svelte-fluentui/src/lib/components/` unless prefixed `lib/`. Wrapper attribute claims verified against FAST `@attr` declarations in `node_modules/@microsoft/fast-foundation/dist/esm`.
Status: **findings only — nothing approved/applied yet.**

## 1. Script structure

Dominant pattern (Toolbar, Slider, TabPanel): `<script lang="ts">`, fluent imports, top-level `provideFluentDesignSystem().register(fluentX())`, `type Props = {…}` (never `interface`), no `extends HTMLAttributes`, no `...restProps`, `let {a = undefined, class: className = "", …}: Props = $props()`, snippets as `SlotType`.
Proposed 2.0 standard: keep `type Props`; add `...rest` spread to root/host; `Snippet`/`Snippet<[…]>`; one default style.

Deviations:
- `lib/types/index.ts:1` `SlotType = any` used in 68 files — all snippet props untyped. Only Autocomplete, InputFile, InputFileSelectorCard, QuickGrid import `Snippet`.
- **No component has `...restProps`** (CLAUDE.md claims wrappers use it). `aria-*`/`data-*`/`id` silently dropped; TextField has no `class`, Breadcrumb has nothing.
- Generics: only QuickGrid:1 uses `generics="T"`. Autocomplete:15-21 `Props<T = any>` without `generics` attr → T always any; local `OptionItem<T>` (`text`) shadows global `OptionItem` (`label`, lib/types/index.ts:3).
- Defaults mixed: NumberField:47-83, Search:45-80 bare names vs `= undefined` elsewhere; NumberField:49 `$bindable<string>()`, Dialog:168 `$bindable(undefined)`. `class` default `""` vs `undefined` (Button:48, Radio:37, RadioGroup:40, nav/*).
- Semicolons only in DataGrid, DataGridRow, NumberField, Search, Toolbar; broken `}: Props = $props()` indent in 18 files (nav/*, Breadcrumb(Item), Dialog, Calendar, SiteSettings, layout/BodyContent, layout/Spacer). → run Prettier over package.
- icons/ChevronDoubleRight, ExpandIcon, HamburgerIcon: no `lang="ts"`/Props; DismissIcon:2 inline type; ToastContainer no Props.
- Element registration 3 ways: unguarded top-level (most), `customElements.get()` guard (Checkbox:5, Slider:5). → central browser-guarded registration module.
- Dialog:2 exports `type HTMLDialogElement` shadowing the DOM global → `FluentDialogElement`.

## 2. Wrapper rules

Canonical: conditional spread `{...(x ? { x } : {})}` or `attr={x || null}` (Button:59-74).

Bugs:
- **Listbox:78 + :99** `selectedOptionsAttr = $derived(() => …)` (a function) passed uncalled to `selected-options` — function stringified; and `<fluent-listbox>` has no such attribute (FAST: `multiple`, `size`, `disabled`). Remove.
- Listbox:107 `multiple={multi}` may be undefined → `|| null`.
- **Progress:15** renders `<fluent-progress-bar>` but registers `fluentProgress()` (`fluent-progress`) — never upgraded.
- TextField:195 spreads `{"aria-label": label}` when only `labelTemplate` set → undefined.
- MenuButton:244 `disabled={item.disabled || undefined}` → `|| null`.

Props with no effect on the element:
- RadioGroup:21,82 `placeholder`; `required` (:19) declared not passed; `autofocus` not a radio-group attr.
- TabPanel:12 `defer` unused.
- DataGrid:15-16,61-62 `onCloseColumnOptions/Resize` listen to Blazor events FAST never fires.
- DataGridCell:12,58 `colIndex` → `col-index` not a FAST attr.
- Search:37 `displayName` unused; `dataList` (:36) duplicates `list`.
- Anchor:24-25 `preventDefault`, `use` are inventions; `use` applied to shadow `<a>` in effect without teardown.
- Wrapper-only layout props inconsistent: `width`/`height` on Listbox, NumberField, Search but not TextField/Textarea; `fullWidth` only Textarea; `fluent-field-label` class missing Search:150, Listbox:94.

Supported but not exposed: TextField `class`, `ariaLabel`, `list`, `size`, `spellcheck`; Textarea no label→aria-label fallback; Switch `labelPosition` (:18) lacks `"end"` (Checkbox has it).

Other:
- Dialog:325 `{...(trapFocus ? {trapFocus} : {})}` → `trapFocus={false}` never sent; FAST default true (partly patched via `setFocusTrap`).
- Switch:111,113 hardcodes `aria-checked`/`role="switch"` on host that fluent-switch manages → remove.
- Stubs exported: Menu, MenuItem, Progress, Tree, TreeItem.
- CLAUDE.md drift: Tooltip is custom (floating-ui), not a `<fluent-tooltip>` wrapper.

## 3. Svelte 5 idioms

- `$derived(() => …)` → `$derived.by`: Listbox:48,78; Select:494,500; Combobox:702; GridCellEditor:156; layout/GridItem:89,105.
- Prop-copy `$effect` → writable `$derived` (≥5.25) / getters: DatePicker:153, TimePicker:278, GridCellEditor:84, layout/TopNav:75, Accordion:115-120, CommandPalette:218, Tabs:204.
- Callback-firing effects → call at mutation site: InputFile:417 (`onItemsChange`), :524 (`onValidityChange`).
- Two-way sync effect pairs Select:138-180, Combobox:183-250 → shared `.svelte.ts`; Listbox:71-76 `JSON.stringify` compare each run.
- Missing cleanup: ToastContainer:76-96 (timeouts never cleared, onMount+effect duplicate work, Set mutate+reassign → `SvelteSet`); Autocomplete:223 debounce; QuickGrid:1631,1651 `rowActionHideTimeout` not cleared in onDestroy (:2099); Textarea:107-116 recursive 10 ms poll; Tabs:307,353,589 rAF; Anchor:52 action destroy/update ignored.
- onMount/onDestroy listeners: QuickGrid:2090-2105 five global listeners per grid → gate on menu visibility; Tooltip:181-209 anchor bound once (prop change ignored).
- Switch:66 pointless `untrack`.
- No legacy syntax ✓. Stores use `svelte/store` writable — consider `.svelte.ts` classes.

## 4. Event handling

Canonical: Svelte attribute on the custom element, `cb?.(x)`.
- Pointless forwarders (`handleKeyDown(e){onkeydown?.(e)}`): DataGridRow:31-45, DataGridCell:39-49, DataGrid:33-39, TextField:127-145, NumberField:148-166.
- `if (cb) cb()`: Anchor:61, Switch:71, Textarea:87,92.
- Payloads inconsistent: Event (TextField, NumberField, Listbox, DataGrid*), value (Search, Textarea, Slider, Switch, RadioGroup), `(ev, prev)` Checkbox.
- camelCase callbacks — see 01-api-naming.md §1.
- **RadioGroup**: no `change` listener on `<fluent-radio-group>` → arrow-key selection doesn't update bound `value`.
- **Textarea:85-88** `handleInput` never assigns `value` → `bind:value` one-way. **Bug.**
- Toast:109-110,133-134,148-149 empty `onfocusin/onfocusout` handlers.

## 5. Typing

- `any`: QuickGrid ×12 (:70,74,129,149,165,166,973,1081,1089,1116,1164); Autocomplete:233,301,319; Checkbox:80,96,132; InputFile:906,922,929 (→ `FileSystemEntry`/`FileSystemDirectoryEntry`); Listbox:60; Radio:42; Switch:62; lib/fluent-ui/calendar/fluent-calendar-extended.ts:14; plus `SlotType`.
- `@ts-ignore` lib/fluent-ui/calendar/range-of-dates.ts:36. Casts: Textarea:17 `as unknown as CSSStyleSheet`; `(currentMessage as SlotType)` Checkbox/Switch.
- Unexported public types: QuickGrid ~25 in component script; DialogAction; Badge types; SelectChangeDetail; TabChangeDetail.
- GridCellEditor:12-57 duplicates QuickGrid:22-68 `EditorOptions`, already drifted.
- Untyped strings: Button:8 appearance, `formnovalidate: string`; TextField:12; MenuButton:59.
- lib/fluent-ui/constants/stack.ts enums `"spacebetween"`, `"left"/"right"`; button.ts lowercase keys vs PascalCase elsewhere → string unions.

## 6. Comments / dead code

- JSDoc on props: none in 47 components (all wrappers except Button, TextField partial). Well documented: CommandPalette, Accordion, ContextMenu, BadgeGroup, AccordionItem, Tooltip. → one `/** */` per prop.
- Commented-out code: nav/NavGroup:103-296 (~194 lines Blazor HTML dump), nav/NavItem:20, lib/fluent-ui/setup.ts (whole file), calendar-month.ts:37-48, calendar-year.ts:40-43, fluent-calendar-extended.ts:13,39-50,195-200, util/range-of.ts:89-93.
- Console: **lib/data/selected-options.svelte.ts:49** `console.log("toggle")` every toggle; **lib/stores/theme.ts:11,20,25** on every theme change. (MultiSplitter:107 gated — fine.)
- TODO stubs: Menu:17, MenuItem:16, Progress:16, Tree:16, TreeItem:16.
- Unused: Anchor:4 `useActions` import; nav/AppBarItem:9 `count`, :11 `onClick`, `active`; TextField:36 `setSelectionRange` declared as prop but is an exported method; Search:37 `displayName`; TabPanel:12 `defer`; RadioGroup:19 `required`; Tabs:682 deprecated `overflow` (remove in 2.0); layout/Grid:134 can render `"undefined"` class.
- Search `immediate` (:101-114) misleading — non-immediate also fires per input.

## 7. Files / size

- Co-location ad hoc (CommandPalette.types.ts, InputFile.types.ts, InputFile.utils.ts vs lib/types/combobox.ts, lib/types/multi-splitter.ts, MultiSplitter exporting from .svelte). → `X.types.ts`, `X.utils.ts`, `X.svelte.ts`; folder `components/x/` at ≥3 files.
- Context keys bare strings (see 01 §8).
- Four menu implementations (ContextMenu, QuickGrid :1895-2047 + `<fluent-menu>` :2184, MenuButton, Tabs overflow) while Menu/MenuItem are stubs.
- Paginator:56-102 uses raw `<fluent-button>` instead of `Button`.

Suggested splits:
- **QuickGrid (3177)**: `QuickGrid.types.ts` (:17-330, shared with GridCellEditor) • `quickgrid/tree.ts` (:530-690) • `quickgrid/pipeline.ts` filter/sort/page (:694-822) • `quickgrid/editing.svelte.ts` (:932-1206) • `quickgrid/keyboard.ts` (:1267-1580) • `QuickGridRowToolbar.svelte` (:1582-1894) • context menu → `ContextMenu.svelte` (:1895-2047) • `QuickGrid.scss` (~700 lines :2485-3177).
- **InputFile (1552)**: `InputFile.upload.ts` (:663-875) • `InputFile.dnd.ts` (:883-936, :443) • `InputFileList.svelte` (:1154-1400) • popover (:334-380) → PositioningRegion.
- **Tabs (1310)**: `tabs/indicator.ts` (:213-330) • `tabs/overflow.svelte.ts` (:496-680) • `tabs/swipe.ts` (:424-495) • `TabsOverflowMenu.svelte` (:880-920).
- **MultiSplitter (1260)**: `multi-splitter/sizing.ts` (:110-343) • `drag.ts` (:344-560) • `accordion.ts` (:711-789) • `storage.ts` (:126-145).
- **Autocomplete (1179)**: reuse Select/Combobox listbox (PositioningRegion + Option); shared async search; CSS out.
- **Combobox (1129) / Select (796)**: shared `listbox-controller.svelte.ts` (Select:138-470, Combobox:183-700); `filter.ts` (Combobox:337-420).
- **GridCellEditor (1021)**: re-implements dropdowns (:310-645) → render Select/Combobox/Autocomplete/DatePicker in cell mode; import types from QuickGrid.types.ts.

## 8. Accessibility

Good refs: AccordionItem, Tabs.
- Select/Combobox: `data-highlighted` only, no `aria-activedescendant`, options lack ids; `aria-controls` undefined without `id` (Select:517, Combobox:709) → `$props.id()`.
- Autocomplete:646 `role="combobox"` on div, no `aria-controls`/`aria-activedescendant`.
- QuickGrid:2250-2256 sortable `<th onclick>`: no keyboard, no `aria-sort`, no button.
- nav/NavItem:25-33 `role="menuitem" tabindex=0` click-only.
- Clickable `<span>` with suppressed warnings: Badge:106-110, Label:50, CompositeBadge:67 → render `<button>` when handler given.
- DatePicker:244 / TimePicker:393 triggers lack `aria-haspopup/expanded/controls`; popups lack `role="dialog"`.
- Tooltip: no `aria-describedby` on anchor, no Escape dismiss (WCAG 1.4.13).
- Listbox:94 label not linked.
- 87 `svelte-ignore a11y_*` (GridCellEditor 12, Paginator 8, QuickGrid 8, Toast 7) — audit each.

## 9. SSR

Canonical `BROWSER` from `esm-env` (lib/stores/theme.ts); others `typeof document !== "undefined"` → unify.
- Checkbox:5, Slider:5 top-level `customElements.get()` → ReferenceError in SSR.
- All wrappers register at top level (runs on server) → central guarded module.
- Checkbox:62 / Switch:50 `Math.random()` ids → hydration mismatch → `$props.id()`.
- (Also from 02: DatePicker:78 / Calendar:63 `window.navigator.language` default.)
- lib/stores/settings.ts:146 matchMedia listener never removed (singleton, acceptable).

## Top 15

1. Textarea `bind:value` broken (:85-88).
2. Listbox `selected-options` function on non-existent attr (:78,99) + `multiple={multi}` (:107).
3. Progress wrong tag; decide stubs Menu/MenuItem/Tree/TreeItem/Progress.
4. RadioGroup keyboard selection desync; fake `placeholder`, unused `required`.
5. `SlotType = any` → `Snippet` (68 files).
6. `...rest` passthrough on every component.
7. camelCase callbacks → lowercase; unify payloads.
8. SSR: Checkbox/Slider top-level customElements, central registration, `$props.id()`.
9. Remove no-effect wrapper props; align wrapper attribute sets.
10. Export QuickGrid types via `QuickGrid.types.ts`; dedupe EditorOptions; export DialogAction, Badge types.
11. Split QuickGrid.
12. Shared listbox controller (Select/Combobox/Autocomplete), unify OptionItem, aria-activedescendant.
13. Effect hygiene: `$derived.by`, writable derived, InputFile callback effects, timer/listener cleanup.
14. Dead code / debug output.
15. Prettier, default style, JSDoc on every prop, Stack enums → kebab unions, logical CSS (Switch:157 `margin-left`), CLAUDE.md fixes.
