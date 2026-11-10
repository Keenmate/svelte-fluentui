# 2.0.0 revision — 02 Duplication / shared helpers audit

Audit date 2026-11-10, HEAD `aad5513`. Paths relative to `packages/svelte-fluentui/src/lib/components/` unless noted. Line numbers approximate.
Status: **findings only — nothing approved/applied yet.**

**Prerequisite:** bump `svelte` peer dep `^5.0.0` → `^5.29` (attachments `{@attach}` 5.29, `$props.id()` 5.20, native `class={[...]}` 5.16). Dev dep is already 5.39.

Estimated total saving ~1,500–1,700 lines; bigger win is uniform dismiss/Escape/layering/keyboard behaviour.
Suggested order: 1 + 3 + 2 together (shared popup layer), then 5, 6, 7, 4, rest.

## 1. Close on outside click / Escape / focus-out / scroll + Escape stacks (highest)

Copies (12): Select:430-468, Combobox:660-695, Autocomplete:455-522, DatePicker:115-140, TimePicker:166-191, MenuButton:179-203, ContextMenu:290-358, Tabs:644-679, InputFile:485-511, QuickGrid:1895-1920 & 2028-2105, layout/Panel:94-105. Escape stacks: Dialog:8-70 ≈ layout/Panel:1-35.

Divergences:
- Event: `pointerdown` (Select, Combobox, Autocomplete, DatePicker, TimePicker, Panel) vs `mousedown` (MenuButton, ContextMenu, Tabs) vs `click` (InputFile, QuickGrid).
- Inside test: `composedPath()` (Select, Combobox, InputFile) vs `contains` vs Autocomplete `.closest('.options-list, .positioning-region')` — matches *any* component's popup → **likely bug**.
- Focus-out close + same-dialog trap guard only in Select/Combobox/Autocomplete (copied 3×); others stay open over a newly opened modal.
- Scroll: close (Autocomplete, ContextMenu, Tabs overflow, QuickGrid) vs follow via autoUpdate (Select, Combobox, MenuButton); GridCellEditor:123-139 blocks wheel page-wide. Autocomplete comment :489-493 is wrong.
- **Escape ordering (likely bug, verify in demo):** Dialog/Panel listen on `document` capture first; DatePicker/TimePicker/MenuButton/ContextMenu `stopPropagation()` on same node (needs `stopImmediatePropagation`); Select/Combobox/Autocomplete handle on element (after capture) → Escape in a dropdown inside Dialog/Panel probably closes the dialog too. Tabs overflow, InputFile, QuickGrid don't stop at all.
- QuickGrid adds 5 permanent document/window listeners per instance in onMount.

Proposal:
- `lib/helpers/layer-stack.ts` — `pushLayer({ onEscape, closeOnEscape }) => pop`; single document listener routes Escape to topmost layer. Replaces both module stacks.
- `lib/attachments/dismissable.ts` — `{@attach dismissable({ inside: () => Element[], onDismiss(reason: "pointer"|"focus"|"escape"|"scroll"), focusOut = true, scroll: "close"|"follow", dialogTrapGuard = true, deferArm = false })}`.
- ~250 lines.

## 2. Listbox keyboard nav + highlighted option (high)

Copies: Select:189-420 (incl. typeahead 750 ms, data-highlighted, scrollIntoView), Combobox:360-420 & 575-630, Autocomplete:380-420, GridCellEditor:233-300, CommandPalette:215-252.

Divergences / bugs:
- Autocomplete: no scrollIntoView, no Home/End/PageUp/PageDown.
- GridCellEditor:233-240 scrolls before DOM update → lags one step (**likely bug**).
- Typeahead only in Select.
- Option helpers duplicated Select:193-220 vs Combobox:255-275; Select uses `textContent` (picks up icon text), Combobox `data-option-label`.
- No `aria-activedescendant` anywhere; listbox id/aria-controls only when consumer passes `id` (Select:517, Combobox:709).

Proposal: `lib/helpers/listbox-nav.svelte.ts` — `createListNav({ items, isDisabled?, getText?, onActivate, pageSize?, typeahead?, idPrefix })` → `{ index, move, first, last, page, typeahead, handleKey(e): boolean, reset, activeDescendantId }`; scrolls after `tick()`. `lib/helpers/option-dom.ts` — `getOptionEls`, `optionValue`, `optionLabel`, `optionData`. ~250 lines.

## 3. Floating positioning / top layer (high — stacking bugs)

Copies: PositioningRegion:70-160, MenuButton:129-180, ContextMenu:185-275 (root + submenus), InputFile:355-400, Tooltip:60-130, QuickGrid manual clamp :2046-2086.

Divergences: only PositioningRegion uses top layer (Popover API); others portal + z-index → render under top-layer dropdowns / high-z dialogs. Gaps 0/2/4/6 px; height cap via `--available-height` vs inline maxHeight floored 80/160; flip fallbacks differ.

Proposal: `lib/attachments/floating.ts` — `floating({ anchor | virtualPoint, placement, offset, flip?, matchWidth?, maxHeight: "var" | { min, respectCss }, topLayer = true, arrow? })`; `lib/attachments/top-layer.ts`; PositioningRegion becomes a thin wrapper. ~180 lines.

## 4. Menus (medium-high)

`runItem`/`closeMenu` identical MenuButton:115-125 vs ContextMenu:62-73. `MenuButtonItem.children/expandable` documented (MenuButton:21-32) but only ContextMenu renders them. QuickGrid reimplements a context menu (:218-257, 1921-2086). Tabs overflow (:644-679, 883) is a 4th variant.
Proposal: internal `components/internal/MenuSurface.svelte` (items, submenus, dismissable, floating). ~200 lines (mostly QuickGrid).

## 5. Custom-element attribute handling (medium size, high regression risk)

~150 `{...(x ? { x } : {})}` spreads across ~25 wrappers (Button:58-76, Checkbox:156-170, NumberField:188-217, Search:160-184, Textarea:164-189, …). `titleProps` duplicated NumberField:94 / Search:146.
**Live violations of the `|| null` rule:** MenuButton:244 `disabled={item.disabled || undefined}` on `<fluent-menu-item>`; Listbox:107 `multiple={multi}` (can be `false`).
Proposal: `lib/helpers/attrs.ts` — `attrs(rec)` drops null/undefined/false/""; `boolAttr(b) => b ? "" : null`. ~100 lines, kills the regression class.

## 6. Debounce / async search (medium-high)

Copies: Autocomplete:140, 150-230; Combobox:231-236, 518-544; GridCellEditor:111-112, 205-220, 385-445, 505-517 (debounce written twice in-file); Search:83-134. Plain timers Select:191, 322-325; MultiSplitter:238-249.
Divergences: GridCellEditor has AbortController; **Autocomplete has no unmount cleanup, no stale-response guard, no catch around `onoptionssearch`** (unhandled rejections). Min-length default 1 vs none. Combobox `searchPending` flag unique.
Proposal: `lib/helpers/debounce.ts` (`debounce(fn, ms)` with `.cancel()/.flush()`), `lib/helpers/async-search.svelte.ts` — `createAsyncSearch<T>({ delay, minLength, search(q, signal), onResults, onError })` → `{ schedule, run, cancel, loading, pending }`. ~90 lines.

## 7. Select / Combobox selection context (medium)

Select:104-163 ≈ Combobox:150-200 (normalize, ctx, two-way sync, same array-equality loop). `data/selected-options.svelte.ts` is an older 3rd variant (Listbox only) with a leftover `console.log` at :49. Select `ctx.toggle` checks readonly, Combobox doesn't.
Proposal: `lib/data/selection-context.svelte.ts` — `createSelectionContext({ multiple, readonly, getValue, setValue })`; `arraysEqual`/`toArray` in `helpers/array.ts`; delete `createSelectedOptions`. ~80 lines.

## 8. Field label markup (medium)

~12 copies: TextField:167, NumberField:176, Textarea:154, Search:149, Select:525, Combobox:782, Autocomplete:611, DatePicker:217, TimePicker:367, Slider:84, Field:51, Checkbox/Switch variant.
Divergences: required `*` missing in TextField/NumberField/Textarea/Slider; `aria-hidden` on `*` only in Search/Field; Autocomplete no `for`; Search no class; `for={id}` undefined without id.
Proposal: `components/internal/FieldLabel.svelte` `{ for, label, labelTemplate, required }`. ~60 lines.

## 9. DatePicker / TimePicker shell + date/time utils (medium)

DatePicker:104-215, 217-300 vs TimePicker:90-440 are structural clones (open bridge, outside close, wrapper vs icon click, clear button, popup style, × SVG, TextField `end`). TimePicker 12h↔24h conversion 3× (:132, 213-230, 259-268, 316-322), `padStart(2,"0")` 6×. `sameDay` in Calendar:160 and fluent-ui/calendar/calendar-day.ts:66.
**Bugs:** `culture = new Intl.Locale(window.navigator.language)` as prop default in DatePicker:78 and Calendar:63 → ReferenceError in SSR. DatePicker `handleInputChange` (:190-205) unreachable (TextField readonly) and ignores culture. Min/max compares full timestamps, not days.
Proposal: `components/internal/PickerField.svelte`; `lib/helpers/time.ts` (`pad2`, `to24h`, `from24h`, `parseHms`, `formatHms`); `lib/helpers/date.ts` (`isSameDay`, `startOfDay`, SSR-safe `defaultLocale()`). ~150 lines.

## 10. Text normalization / matching / highlight (low-medium)

Diacritic-insensitive only Combobox:302; plain lowercase-contains Autocomplete:173, GridCellEditor:163/385, QuickGrid:737, CommandPalette:83-100; highlight CommandPalette:160-173.
Proposal: `lib/helpers/text.ts` — `normalizeForSearch`, `matchText(text, q, "contains"|"prefix")`, diacritic-aware `splitHighlight`. ~30 lines.

## 11. IDs / ARIA (small, real bugs)

Checkbox:62 / Switch:50 use `Math.random()` ids → hydration mismatch → `$props.id()`. Default listbox ids via `$props.id()` in Select, Combobox, Autocomplete, GridCellEditor, CommandPalette + `aria-activedescendant`.

## 12. Observers / timers / teardown (low)

BadgeGroup:90, Combobox:314, Tabs:296-313 & 580-590, layout/Grid:121-131, layout/MultiSplitter:956-1016.
Bugs: Tabs observes only buttons present at effect time; uncancelled rAFs. Grid onMount reads `onBreakpointEnter` once. MultiSplitter leaks window pointer listeners if unmounted mid-drag. `utils/shadow-dom.ts:setAttributeOnShadowInput` and Textarea:105-115 retry every 10 ms forever.
Proposal: `lib/attachments/observe.ts` (`resizeObserver`, `mutationObserver`); `lib/helpers/when-shadow-ready.ts` (`whenShadowReady(el, { maxTries }) => cancel`). ~40 lines.

## 13. Small copy-paste

- Dismiss × SVG pasted in Chip, DatePicker, TimePicker, Autocomplete, Tabs, Dialog ×2; chevrons too → `components/icons/internal/{Dismiss,Chevron}.svelte`.
- Flyout surface CSS ~10× (Select:742, Combobox:1096, Autocomplete:763 inline, GridCellEditor:952, DatePicker:278, TimePicker:427, MenuButton:306, ContextMenu:498, Tabs:1109) → SCSS mixin + `--fluent-flyout-*`.
- `--fluent-color-*` hex fallbacks duplicated CompositeBadge:144-190, Label:104-125, Alert → define once globally.
- Chip loops: Autocomplete 3× (:622, 666, 746, unkeyed), Combobox 2× (:743, 824) → one snippet each.
- `classList` barely used → native `class={[...]}`, drop helper.
- Calendar Enter/Space on `div role=button` 6× (:489-610) without preventDefault (Space scrolls page); ~42 tab stops, no roving focus → `lib/helpers/keys.ts onActivateKey`.
- `Search.focusAsync` vs `focus()` elsewhere.
- `formatInputFileSize` prints "undefined" ≥ 1 TB.

## 14. Roving focus (low-medium, a11y)

Accordion:67-100 (wraps), Tabs:362-388 (wraps, skips disabled), MultiSplitterPane gutter; MenuButton/ContextMenu no arrow keys.
Proposal: `lib/attachments/roving-focus.ts` — `rovingFocus({ selector, orientation, loop, skipDisabled, onMove })` for Accordion, Tabs, Calendar grid, MenuSurface.
