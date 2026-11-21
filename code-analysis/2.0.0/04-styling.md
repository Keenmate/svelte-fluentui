# 2.0.0 revision — 04 Styling / CSS variables audit

Audit date 2026-11-10. Paths relative to `packages/svelte-fluentui/src/lib`. **fc** = `assets/styles/fluent-ui/fluent-components.scss`, **compat** = `assets/styles/fluent-blazor-compat.scss`, **cs** = `assets/styles/fluent-ui/constructed-stylesheet.scss`.
Status: **findings only — nothing approved/applied yet.**

**Headline:** fc (3643 lines) is a raw dump of Blazor `*.razor.rz.scp.css`; compat is a partly cleaned copy of the same sections; `main.scss` loads both → ~20 component sections ship twice and most of the rest targets markup that no longer exists.

## 1. Custom property naming

Already correct (theme.scss 10–108): `--fluent-bg-*`, `-text-*`, `-border-*`, `-accent-*`, `-navbar-*`, `-sidebar-*`, `-header-*`, `-footer-*`, `-quickgrid-*`, `-component-*`, `-body-*`, `-heading-*`, `-transition`, `-z-*`, `-border-radius-*`; `--fluent-color-<name>-{,contrast,emphasis,tint}` (compat 64); `--fluent-field-state-color`; `--fluent-inputfile-popover-*`; `--fluent-chip-*` (consumed, never defined); `--fluent-data-grid-*`; `--fluent-multi-splitter-gutter-size`.

Unprefixed / wrong prefix (BREAKING where public):
| Current | Where | Proposed |
|---|---|---|
| `--badge-fill-<n>` / `--badge-color-<n>` | compat 16–48, Badge:79/82 | fold into `--fluent-color-<n>` / `-contrast`; unify Badge colour vocabulary with Label/CompositeBadge |
| `--badge-group-gap` | BadgeGroup:99 | `--fluent-badge-group-gap` |
| `--appbar-item-size`, `--appbar-active-indicator-width` | compat 139/143 | `--fluent-appbar-*` |
| `--calendar-cell-size`, `--calendar-gap`, `--month-*`, `--year-*`, `--multi-select-opacity` | fc 444–446, 639–641, 768–770 | `--fluent-calendar-{day,month,year}-cell-size`, `--fluent-calendar-gap`… |
| `--dialog-padding` | compat 343 | `--fluent-dialog-padding` (keep `--dialog-width/height`, native to fluent-dialog) |
| `--datagrid-hover-color` (never defined) | compat 325, fc 435 | `--fluent-data-grid-row-bg-hover` |
| `--panel-top`, `--topnav-toggle-size`, `--spacer-width` | Panel:160, TopNav:106, Spacer | `--fluent-panel-top`, `--fluent-topnav-toggle-size`, `--fluent-spacer-width` |
| `--icon-size`, `--icon-fill` | Icon:70–71 | `--fluent-icon-size/-fill` |
| `--listbox-max-height`, `--select-/combobox-/autocomplete-listbox-max-height` | Listbox:51, Select:617, Combobox:896, Autocomplete:763 | private `--_…` (set from props) |
| `--available-height` | PositioningRegion:126 | private `--_available-height` |
| `--error`, `--warning`, `--success`, `--info`, `--presence-*`, `--highlight-bg`, `--font-monospace`, `--body-font`, `--clear-button-*`, `--input-*placeholder*`, `--tree-item-*` | cs 18–43, 181–188 | Blazor leftovers: alias to `--fluent-color-*` then drop; prefix rest |

**Never defined (always fall back to hardcoded hex; Fluent v3 names absent in 2.6):** `--error-foreground-rest` (Autocomplete:816, Combobox:935, DatePicker:313, Select:643, TimePicker:541, _inputfile ×6); `--error-foreground`, `--error-fill-hover/-rest`, `--error-stroke-rest` (ContextMenu:579–591, MenuButton:314–326, QuickGrid:2993–3058); `--success-foreground-rest` (_inputfile:473). Fallbacks disagree `#d13438` vs `#c50f1f`. Also undefined: `--fluent-z-panel-pinned` (Panel:303), `--fluent-profile-menu-hover`, `--fluent-pull-refresh-head-height` (dead sections).

Mismatch: fc 2969–2978 defines `--fluent-multi-splitter-{color,background-color,bar-size,…}`; component reads only `-gutter-size` → delete.

Private scratch vars (`--lc`/`--tc` Label:104; `--v-*`/`--lv-*`/`--bv-*` CompositeBadge:144–229; `--xs…--xxl`/`--col` GridItem:500–560) → adopt `--_name` convention.

Canonical form proposal: `--fluent-<component>[-<part>]-<prop>[-<state>]`, prop ∈ {bg, text, border, border-width, radius, size, gap, padding-inline/-block, max-height, shadow}, state last.
- `-background` → `-bg`: `--fluent-chip-background`, `--fluent-chip-remove-background-hover` (BREAKING); dead `--fluent-sortable-list-background-color`, `--fluent-multi-splitter-background-color`.
- `-color` → `-text`: `--fluent-chip-remove-color(-hover)` (BREAKING); `--fluent-inputfile-icon-file-color` → `--fluent-inputfile-file-icon-fill`.
- State last: `--fluent-quickgrid-header-hover-bg` / `-header-sorted-bg` / `-row-hover-bg` / `-stripe-bg` → `-header-bg-hover` / `-header-bg-sorted` / `-row-bg-hover` / `-row-bg-stripe` (BREAKING).
- `--fluent-sidebar-hover/-active` → `--fluent-sidebar-link-bg-hover/-active` (BREAKING).
- `--fluent-chip-padding-x/-y` → `-padding-inline/-block` (BREAKING).
- `-width` for strokes, `-size` for boxes.
- Radius scale `--fluent-border-radius-{sm..xl}` is fixed px (_tokens 64–69) ignoring `--control-corner-radius`/`--layer-corner-radius` → derive; drop `--fluent-border-radius` alias (theme:79) (BREAKING).

## 2. Where styles live; dead selectors

Split across places: Calendar (fc 439–932 + Calendar:663–681 `:global` self-styling); Tabs (custom, but `.fluent-tab-icon/-close` with `!important` in fc 3189–3205 & compat 525–541); Grid/GridItem (fc 1089–1794 ~700 lines `[spacing]`/`div[xs]` dead — components use `data-*`; base `.fluent-grid` live, duplicates Grid:152); Stack (fc 3147–3166 dup, `[reverse]` dead); **MultiSplitter (fc ~3125 `.fluent-multi-splitter > .fluent-multi-splitter-pane{…}` (0,2,0) beats component's `:global` at :1105 — live conflict)**; Toast (_toast.scss + fc 3211–3313 + component); Nav* (nav.scss + fc 29–116/2353–2577 + compat 135–196 + NavGroup); BodyContent ×3 (fc 118, compat 200, component:18); Paginator, TimePicker, Header, DataGrid, Dialog, InputFile also split.

Duplicated fc vs compat: Accordion RTL, Anchor, AnchoredRegion, AppBar, BodyContent, `.loading-button`, Card, CollapsibleRegion, CounterBadge, DataGrid, Dialog, DropZone, ValidationMessage, InputFile, InputLabel, Overlay, Persona, PresenceBadge, Rating, Tabs, TreeItem.

Dead (element never rendered): `fluent-tab`/`fluent-tabs`, `fluent-option`, `fluent-select::part`/`fluent-combobox::part` (compat 487–488, _field 96–97), `fluent-card`, `.loading-button fluent-progress-ring`. (`fluent-accordion(-item)` — see verification note in 00-plan.)

Dead (no class matches): `.fluent-wizard*` (fc 3383–3643), `.fluent-messagebar*` (2134–2352), `.fluent-sortable-list` (2885–2965), `.fluent-overflow*`, `.fluent-overlay`, `.fluent-persona`, `.fluent-profile-menu`, `.fluent-presence-badge`, `.fluent-rating`, `.fluent-pull-container`, `.fluent-launch`, `.fluent-messagebox`, `.fluent-dialog-{header,body,footer}`, `.fluent-autocomplete-multiselect`, `.fluent-input-label`, `.fluent-typography`, `.fluent-inputfile-container`, `.validation-message`, `.fluent-toast-provider`/`.position-*`, `.fluent-toast-{body,details,progressbar}`, `.navmenu*`, `.col-title`, `.col-options`, `.col-sort-button`, `.resize-handle`, `.col-justify-*`, `.sticky-header`, `.empty-content-cell`, `.fluent-card-minimal-style`, `.fluent-datepicker-popup`, `.fluent-menubutton-container`, `.header-fixed-top`, `.fluent-appbar-item-local`, `.fluent-popover-content`. `animation: blinker` (fc 1076, compat 630) — keyframes undefined.

**Global leaks into consumer apps:** `.grid tbody` / `.grid tr{display:contents}` (fc 236–243) + `.grid{display:flex}` (components.scss); `a .stack-vertical` (fc 55); `div[part="label"]` (fc 60); `div[draggable='true']` / `div[dragged-over]` (fc 1069, compat 623); `th.column-header` (fc ~367).

Proposed rule:
1. Markup a component renders → its own `<style>`; `:global()` only under the component's root class (portalled/snippet children).
2. Upstream `<fluent-*>` styling (`::part`, attrs) → wrapper `<style>`, scoped by wrapper class; truly app-wide → one small `fluent-ui/_overrides.scss`.
3. Global SCSS = tokens/theme vars, shared primitives (§5), field/value label utilities, opt-in reboot. The reboot must ship in `@layer reset` and drop `border: 1px solid black` on inputs — it breaks layered light-DOM libraries (svelte-treeview rc16 checkbox in GSD Forms): see [08-css-layers-reboot.md](08-css-layers-reboot.md).
4. Delete fc wholesale after moving live bits (Calendar, NavMenu, AppBar, Paginator, CounterBadge, Toast bits); trim compat to real `fluent-*` overrides.

## 3. Physical → logical properties

Fix:
- Required asterisk `margin-left`: Autocomplete:817, Combobox:936, DatePicker:314/351, Select:644, TimePicker:542/579, _field:48
- Autocomplete:981 `padding-right`, 1027 `right:0`, 1034 `left:8px` + 1041 `padding-left:32px` (input start icon, breaks RTL), 1147 `text-align:left`
- GridCellEditor:869, 886, 903, 919, 941, 967; QuickGrid:2627, 2664, 2840, 3011; Select:664
- AccordionItem:161 `text-align:left`; 181–182 / 271–272 `border-bottom-left/right-radius` → `border-end-start/end-end-radius`
- Alert:93–126 `border-left-*` → `border-inline-start-*`
- Tabs:964, 1023, 1055, 1194; MenuButton:276; OptionGroup:84; Switch:157; Toast.svelte:85
- Badge:195/200 `text-align:left/right` + `[dir=rtl]` swap → `text-align:end` (keep direction trick)
- _inputfile:176, 237, 459/466/473, 503, 546; _toast:151, 173, 225/239/253/267; _validation-summary:10, 23; nav.scss:14
- compat:536, 563, 567, 689, 723–724 (→ `margin-inline:auto`), `[dir=rtl]` pairs 185–192, 330
- reboot:108–117, 136, 159, 283, 379
- Dialog:97 JS `body.style.paddingRight` → `paddingInlineEnd`

Physical by necessity (leave + comment): floating-ui coordinates (ContextMenu:489, MenuButton:297, Tooltip:245, PositioningRegion, _inputfile:287, QuickGrid:2156); Tooltip arrow borders 297–308; centring (MultiSplitter:1229, _toast:60–67); Tabs indicator geometry; Panel `side` left/right & `_toast` `position-*` APIs → consider start/end (BREAKING).
~70 more in fc — dead sections / RTL pairs → delete.

## 4. Hardcoded values

- Colours: Alert:99–131 hex/rgba; _field:47, 76–82 & _validation-summary:9–33 (`#c50f1f`/`#c87018`/`#107c10`); _toast:225–270 SCSS `$color-*` (not runtime-themable); compat:22; overlays CommandPalette:388, Dialog:412, Panel:269; CommandPalette:537/551/593–594 white rgba; ~400 light-only hex fallbacks in `var(--neutral-*, #…)` (QuickGrid 115, CompositeBadge 64, Autocomplete 36, Select 22, GridCellEditor 20, Combobox 18) — cs always defines the tokens, fallbacks are noise.
- Shadows: flyout shadow hand-copied Tooltip:259, Tabs:1109, ContextMenu:498, MenuButton:306, GridCellEditor:952, QuickGrid:3155 + inline Autocomplete:763, DatePicker:278, TimePicker:427 → `var(--elevation-shadow-flyout)`; Card:49/55, QuickGrid:2501/2568/2597, Panel:231–264, CommandPalette:400 → `--elevation-shadow-card-*`/`-dialog`.
- Font sizes: _inputfile 15, QuickGrid 13, CommandPalette 10, Autocomplete 4, TopNav 3, CommandPaletteTrigger 3, Alert 3, _field 3 → `--type-ramp-*`.
- Radii: CommandPalette:399/458/532/545/582, CommandPaletteTrigger:105, MultiSplitter:1232, compat:648/680/690/702, components.scss:14; popup radius inconsistent.
- Transitions: 9 different durations → `--fluent-transition` + fast/slow.

z-index — current scale (_tokens 76–83, theme 100–107): dropdown 1000, sticky 1020, fixed 1030, modal-backdrop 1040, modal 1050, popover 1060, tooltip 1070, toast 1080. Hardcoded: compat:339 `fluent-dialog{z-index:1050}`; _toast:14 SCSS `$z-index-toast`; fc:3319 999 (dead); layout:51 footer 10; fc:1798 header 10; fc:179/compat:645 10; fc:2487 5; fc:430 3; Tabs:1256 2; compat:319 2; OptionGroup:63, _inputfile:322/334, compat:512, fc several at 1; **CommandPalette:378 `var(--fluent-z-modal, 1070)` wrong fallback**; Panel:222 `calc(modal+1)`; Panel:303 undefined `--fluent-z-panel-pinned`.
Proposed `--fluent-z-*`: raised 1 · dropdown 1000 · sticky 1020 (header/footer/QuickGrid sticky header) · fixed 1030 (+ `panel-pinned` alias) · modal-backdrop 1040 · modal 1050 (Dialog, Panel overlay, CommandPalette, fluent-dialog) · popover 1060 (all portalled listbox/menu/picker — keeps dropdown-above-modal) · tooltip 1070 · toast 1080 (_toast must use the var — keeps toast-above-QuickGrid). Drop per-use numeric fallbacks.

## 5. Shared CSS blocks

1. Field control box (rest/hover/focus accent underline/filled/disabled/readonly): Select:648–710, Combobox:940–1000, Autocomplete:862–920, GridCellEditor:809–935.
2. Popup surface: Select:736, Combobox:1090, inline Autocomplete:763/DatePicker:278/TimePicker:427, ContextMenu:490–498, MenuButton:298–306, Tabs:1103–1109, GridCellEditor:948–958, QuickGrid:3149 (bg varies layer-1 vs layer-floating).
3. Required indicator ×5 + `_field` `__required` (different colour/margin).
4. Focus ring — 7 variants → `--focus-stroke-outer`/`--focus-stroke-width`.
5. Danger menu item: ContextMenu:579–591 ≡ MenuButton:314–326.
6. Chips: Combobox/Autocomplete external chips vs Chip.svelte → reuse `--fluent-chip-*`.
7. GridCellEditor:961–985 re-implements Option rows.
8. Keyframes: `pulse` GridCellEditor:986 & QuickGrid:3034; `spin` Autocomplete:1117 & _inputfile:763.

Delivery: 48/51 `<style>` blocks are plain CSS; SCSS mixins would force consumer preprocessing. Prefer global `components/_primitives.scss` with low-specificity classes (`:where(.fluent-field-control)`, `.fluent-popup-surface`, `.fluent-required-indicator`, `.fluent-focus-ring`) or `--fluent-field-*`/`--fluent-popup-*` vars.

## 6. :global / !important / dark mode

- `:global` heaviest: QuickGrid 31, MultiSplitter 30, Icon 17, Calendar 15, GridCellEditor 11, Grid 10. App-wide leaks: NumberField:231 `:global(fluent-number-field::part(label))`, Checkbox:184, Switch:138 → scope under wrapper class; Icon:226–251 alters icons under any `button:hover`/`a:hover` on the page.
- `!important` ×37: fc 18 (dead; 3196/3204 hit live Tabs close icon), compat 532/539, QuickGrid:2919, 2993–2998, 3058, 3098, 3104, nav.scss:21/26/31, _toast:283–285, MultiSplitter:1255, Option:141. Justified: reboot 345/460, theme 190/197.
- Dark mode: theme sets `[data-theme="dark"]` on `<html>`; reboot:37–44 targets `body[data-theme=…]`/`system-*` — never matches (dead). Per-component `:global([data-theme="dark"])` (QuickGrid ×27, GridCellEditor ×8, ContextMenu, MenuButton) mostly re-declare adaptive tokens with different hex fallbacks (no-op). Only real dark values: error fills `#442726`, `#f87c86` → `--fluent-color-danger-*` in theme `[data-theme=dark]`; delete per-component blocks. cs:17–80 hardcodes light token values on `:root` (OK as pre-hydration fallback, document). `prefers-reduced-motion` only in reboot — Accordion, Tabs indicator, Toast, Panel animations ignore it.

## 7. Demo/site CSS shipped in package

- `assets/styles/demo-pages.scss` unused (docs has its own) → delete.
- `assets/styles/microsoft-site.scss` all commented → delete.
- `components.scss` 1–35 demo classes (`.components`, `.component-section`, `.component-title`, `.grid`) loaded globally via main.scss → move to docs; keep `.fluent-field-label`/`.fluent-value-label`.
- `theme.scss`:163–173 `[data-theme="dhl"]` customer-specific → docs.
- `reboot.scss` (461 lines Bootstrap reboot) forced on every consumer → opt-in `./reboot` export (BREAKING).
- fc Blazor-only features (Wizard, MessageBar, SplashScreen, MessageBox, SortableList, PullToRefresh, ProfileMenu, Persona, Rating) → delete.

## Top 10

1. Delete fc after moving live rules → ~3000 lines, global leaks, MultiSplitter conflict gone.
2. De-duplicate compat; drop dead fluent-tab*/select/combobox/card/Persona/… and Tabs `!important`.
3. Error/success colours → `--fluent-color-*`; dark variants in theme; delete per-component dark blocks.
4. One `--fluent-z-*` scale; fix _toast, fluent-dialog, CommandPalette fallback, panel-pinned, 10s.
5. Shared primitives: field control, popup surface, required indicator, focus ring.
6. BREAKING prefix renames (`--badge-*`, `--appbar-*`, calendar, `--dialog-padding`, `--panel-top`, …); `--_*` for private.
7. BREAKING naming normalisation (state suffix, `-bg`/`-text`, `-padding-inline/-block`); remove dead var families; radius scale from Fluent tokens.
8. Logical properties (§3).
9. Remove demo/site CSS; reboot opt-in (BREAKING).
10. Scope global-reaching rules; fix dead reboot dark rules; `prefers-reduced-motion`.
