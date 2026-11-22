# 09 — Popup positioning & sizing (2026-11-22)

Replaces open question 6 (`--_available-height`). Studied `web-multiselect` (+ `@keenmate/web-components-core`
positioning) for ideas; this is a new design, not a port.

## Today

- Six separate Floating UI setups: `PositioningRegion`, MenuButton, ContextMenu (root + submenus),
  QuickGridContextMenu, Tooltip, InputFile popover (`inputfile/dom.ts`). The menus repeat
  `maxHeight = max(availableHeight - 8, 80)` inline.
- Only Select / Combobox / Autocomplete cap their height to the viewport (`availableHeight` →
  private `--_available-height`). DatePicker, TimePicker, Tabs overflow, AppBar "…", QuickGrid context
  menu: no cap.
- Listbox caps disagree: Select / Combobox = available space (280px only as a var fallback),
  Autocomplete = 300px; each has a private `--_<c>-listbox-max-height`.
- `flip()` re-decides on every frame → the dropdown can jump sides while scrolling or filtering.
- First frame renders at 0,0 before placement.
- Outside scroll closes Autocomplete / ContextMenu / Tabs overflow on *any* scroll, even of an
  unrelated panel.

## web-multiselect — taken / not taken

Taken: lock the side after the first placement (re-decide only when needed); publish the anchor width
as a CSS variable so width stays a CSS decision; combine author cap and measured space with CSS
`min()`; hidden until placed; close-on-scroll only when the anchor really moved (≥ 3px) with a short
grace after opening.
Not taken: its fixed 320px height (ignores the viewport — our measured cap is better); z-index tiers
(we use the top layer); containing-block drift warnings (top layer is positioned against the viewport);
mobile full-screen sheet (later, separate feature); offset from a CSS variable (each popup has its own gap).

## Design

`helpers/floating.ts` — `anchorFloating(reference, floating, options)` → `{update(options), reposition(), destroy()}`
(+ a `floating` Svelte action wrapper). Internal, not exported.

- `strategy: "fixed"`; middleware `offset → flip (unless locked / disabled) → shift → size → arrow? → hide?`,
  viewport `padding` 8.
- Writes on the floating element:
  - `--fluent-popup-available-height` — px left on the chosen side (public; CSS `max-height` reads it),
  - `--fluent-popup-available-width`,
  - `--fluent-popup-anchor-width` — reference width (set *before* computing so `shift` sees the final width).
- `matchWidth: true` → `width: var(--fluent-popup-anchor-width)` (inline).
- **Placement lock** (default on): first computation flips normally (the popup still has its natural,
  component-capped height because the available-height var isn't set yet), then the side is kept.
  `reposition()` drops the lock + the var and decides again (all inside one task — no paint in between).
  Automatic re-decide on: window / visualViewport resize; the popup *growing* while capped by the
  available height (async results). Shrinking (filtering) never moves it.
- Transparent (`opacity: 0`) until the first placement.
- `onPlaced({placement, middlewareData})` for Tooltip's arrow / hide.

CSS contract, per component (convention `--fluent-<component>-*`):

| Component | Rule | Override |
|---|---|---|
| Select / Combobox / Autocomplete | `min(var(--fluent-<c>-dropdown-max-height, 300px), var(--fluent-popup-available-height, 100vh))` | `maxDropdownHeight` prop sets the var |
| DatePicker / TimePicker popup, AppBar popover, Tabs overflow, menus, QuickGrid context menu | `max-height: var(--fluent-popup-available-height, none)` + `overflow-y: auto` | — |
| InputFile popover | `min(var(--fluent-inputfile-popover-max-height, 24rem), var(--fluent-popup-available-height, 100vh))` | existing var |

`PositioningRegion`: always publishes the available height (prop `availableHeight` removed — breaking),
keeps `position` / `align` / `matchWidth`.

`dismissOnOutside({scroll: true})`: closes only when the anchor (`inside()[0]`) moved ≥ 3px since
opening, ignoring the first two frames (browser scrolling a focused field into view).

## Phases

1. Helper + `PositioningRegion` on it; Select / Combobox / Autocomplete CSS contract, `maxDropdownHeight`
   on the public vars; drop `availableHeight` prop.
2. Height cap for DatePicker, TimePicker, AppBar, Tabs overflow.
3. MenuButton, ContextMenu (root + submenus), QuickGridContextMenu, InputFile popover, Tooltip on the helper.
4. `dismissOnOutside` scroll filter.
5. e2e `positioning.spec.ts` (fixture `test/positioning`): opens below / above by room, capped to the
   viewport, side stays while filtering, async growth re-decides, `maxDropdownHeight`, picker cap,
   unrelated scroll keeps it open. CHANGELOG + release notes, CLAUDE.md.

## Status

- 2026-11-22: all five phases done. Beyond the plan: ContextMenu and the InputFile popover moved to the
  floating layer + flyout shadow (Q5 had missed them), MenuButton / QuickGrid menus to the flyout shadow,
  InputFile hovers to the stealth fill. `opacity: 0` (not `visibility`) until placed so focus can move in
  at once. `dismissOnOutside` measures a `display: contents` anchor through its first child with a box.
  e2e: positioning.spec.ts (7 tests; the lock and the growth re-decide were mutation-checked), scroll
  tests in popup-menus / popup-tabs rewritten; full run 427 passed / 2 skipped.
