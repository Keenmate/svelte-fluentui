# Svelte FluentUI

A comprehensive Svelte component library for the Microsoft FluentUI design system (built against FluentUI web components v2.6.x). Some components are thin wrappers around the `<fluent-*>` web components, while many others — Accordion, Select, Combobox, Autocomplete, QuickGrid, Calendar, DatePicker, TimePicker, InputFile, Tabs, and more — are full custom Svelte implementations styled with FluentUI design tokens, rewritten for better performance, control, and features than the underlying web components provide.

📖 **[Live documentation & showcase → svelte-fluentui.keenmate.dev](https://svelte-fluentui.keenmate.dev)**

## What's New in v2.0.0-rc01

- **Upgrading from 1.x — a breaking release with no aliases** — 2.0 is a pre-public-release consistency revision of the whole API, and the 1.x names are gone rather than deprecated. Work through the upgrade checklist and rename tables in [release-notes/2.0.0-rc01.md](https://github.com/KeenMate/svelte-fluentui/blob/prod/release-notes/2.0.0-rc01.md) (the exhaustive per-change list is the `2.0.0-rc01` section of the [CHANGELOG](https://github.com/KeenMate/svelte-fluentui/blob/prod/CHANGELOG.md)). The `svelte` peer dependency is now `^5.29.0` (the library uses `$props.id()` and attachments). If your pages relied on the 1.x element reset, import it once before the main stylesheet: `import "svelte-fluentui/reboot"`.

- **Naming and events — one model, one `ctx` object** — Events a component defines are `on` + PascalCase and receive a single object, so fields can be added later without breaking you: `onChange({value})`, `onOpenChange({open})`, `onTabClose({tab})`, `onPaneCollapse({paneIndex, pane})`. Lowercase `on*` props are only real browser events, forwarded untouched with the native `Event`, and every component that renders an element now accepts its native attributes and events through `...rest`. Functions whose return value is used are `…Callback`: `before…Callback` can veto (`beforeCloseCallback({reason})` on Dialog, `beforeLeaveCallback` on Tab), `get…Callback` extracts a value, and `searchCallback({term, signal})` provides behaviour. Prop names are aligned across components too — `multiple` (never `multi`), `open` instead of Dialog's `visible`, `closeOnSelect` instead of `autoClose` / `keepOpen`, `emptyText` / `empty` instead of `noDataText` / `noItems`, `searchDelay` for every debounce, `start` / `end` instead of left / right, and one exported `Orientation` type.

- **Action items — one shape for every menu and toolbar** — MenuButton, ContextMenu, Dialog footer actions, CommandPalette, Toast links, TopNav and the QuickGrid row toolbar / context menu all take the same item model (`ActionItem` / `MenuItem` / `MenuDivider` / `MenuEntry`, exported from the package root). Items carry `text`, `icon` (a Fluent icon name or a snippet), `isDisabled`, `isDanger`, `shortcut`, `onClick(detail)` and `get…Callback` twins for per-row state; dividers are their own `{divider: true}` entries. Components add `onAction(detail)` and `beforeActionCallback(detail)` (`false` cancels — link items too, with the click replayed once allowed so your router still handles it).

- **Popups behave the same everywhere — light dismiss, Escape layering, keyboard** — DatePicker, TimePicker, MenuButton, ContextMenu, the Tabs overflow menu and the InputFile popover now close when focus moves away or on an outside press, like Select, Combobox and Autocomplete already did. A shared layer stack routes Escape to the topmost open layer, so Escape in a dropdown, picker or menu inside a Dialog or Panel closes that popup first instead of the dialog. MenuButton and ContextMenu got full keyboard support (Enter / Space run items, arrows skip disabled items, submenus open with ArrowRight / ArrowLeft, focus returns to the trigger), and Tabs scroll buttons, chevrons and arrow keys are correct in RTL.

- **QuickGrid — reworked editing, sorting and paging** — Rows are keyed by `idMember` (defaults to `"id"`), and every event carries `viewIndex` (screen position), `itemIndex` (index in `items`) and `rowKey`, fixing edits and deletes that hit the wrong row on page 2, after sorting or in a collapsed tree. Sorting is `sortMode="single" | "multiple"` with a locale-aware collator and `bind:sort`; paging is bindable (`bind:currentPage`, `bind:pageSize`) with server mode via `paginationMode` + `onDataRequest`; filtering can run on the server with `filterMode="server"`. The select / combobox / autocomplete cell editors are now the library's own Select and Combobox, every commit path validates, and all user-facing text is localisable through `labels`, with Shift+F10 / Alt+F10 keyboard access to the context menu and row toolbar.

- **`searchBehavior` — search ignores case and accents by default** — Select type-ahead, Combobox, Autocomplete, CommandPalette and the QuickGrid filter row and editors share one option: `"normalized"` (default — `zurich` finds `Zürich`), `"case-insensitive"` or `"exact"`. It applies to built-in matching only; `filterCallback` / `searchCallback` are untouched. `normalizeForSearch` and the `SearchBehavior` type are exported for custom matchers.

- **CSS clean-up — cascade layers, opt-in reboot, one palette, one z-index scale, renamed variables** — All library CSS now lives in `@layer reset, variables, component, overrides` (the Keenmate suite order), so any unlayered rule in your app beats the library whatever its specificity, and `!important` is gone from the component styles; import an unlayered reset such as normalize or Pure.css with `layer(reset)` so it stays underneath the components. The Bootstrap-style element reset no longer ships inside `svelte-fluentui/styles` (import `svelte-fluentui/reboot` to keep it), the 3 400-line FluentUI Blazor stylesheet dump and the demo-only classes (including a global `.grid`) are gone, and component styles use logical properties so layouts mirror under `dir="rtl"`. Status and badge colours come from one `--fluent-color-*` palette (`--badge-fill-<name>` → `--fluent-color-<name>`, `--error` / `--warning` → `--fluent-color-*-foreground`), every overlay uses the `--fluent-z-*` scale without numeric fallbacks, and themable custom properties follow `--fluent-<component>-<prop>-<state>` (e.g. `--icon-size` → `--fluent-icon-size`, `--fluent-quickgrid-row-hover-bg` → `--fluent-quickgrid-row-bg-hover`). `prefers-reduced-motion` turns off the Accordion, Tabs indicator, Panel and Toast animations.

- **Component internals split — no API change** — QuickGrid, InputFile, Tabs and MultiSplitter were split into internal modules (header / pager / toolbar components, an upload queue, a splitter engine with its drag session, …), shrinking the main component files without changing their props or behaviour. Along the way MultiSplitter's `id` became a plain DOM id with saving opt-in via `persistKey` (as on NavGroup), and dragging a pane into its rail fires `onPaneCollapse` once instead of on every frame.

> Names changed in 2.0 — the 1.x entries below keep the names they shipped with (e.g. `onoptionssearch`, `keepOpen`); see the [release notes](https://github.com/KeenMate/svelte-fluentui/blob/prod/release-notes/2.0.0-rc01.md) for today's equivalents.

## What's New in v1.6.0-rc07

- **Dropdowns inside modal dialogs — selections finally commit** — `Select`, `Combobox`, and `Autocomplete` dropdowns opened inside a modal `<Dialog>` were unusable: you could click an option but the value never changed. The dropdown's listbox is portalled into the browser top layer (so it can paint above the modal), which put it *outside* the dialog's DOM — and FAST's modal focus trap treated that as "focus left the dialog" and yanked focus back to the dialog's close button, firing the control's own outside-close handler and destroying the popover before your click landed. All three controls now recognize when focus was bounced into the trigger's *own* dialog and keep the dropdown open, so the pick registers.

- **Toasts now sit above QuickGrid's popovers** — toast notifications were being covered by QuickGrid's context menu, column filters, and floating row toolbar. Those render in the browser top layer via the Popover API, which always paints above `z-index`-stacked content, so the toast's `z-index: 1080` never stood a chance. The toast container is now promoted into the top layer as well (falling back to z-index where the Popover API is unavailable), with the user-agent `[popover]` defaults reset so its fixed top/bottom corner positioning is preserved.

- **Autocomplete keepOpen no longer gets stuck on "No results found"** — with `keepOpen`, picking an option used to blank the list to "No results found" and, once everything was selected, that empty state stuck around even after you removed a chip. Selecting now refreshes the list to the remaining options, selecting the last option closes the dropdown instead of leaving an empty overlay, and removing a chip re-surfaces the freed option and clears the stale message.

- **Autocomplete no longer lets you select the same value twice** — with async `onoptionssearch`, a picked option kept reappearing in the results and could be chosen again, producing two identical chips. Async results now exclude already-selected values (matching the built-in client-side filter), backed by a guard in the selection handler so no path can add a duplicate.

- **Aligned, full-height dropdown toggles on Autocomplete and Combobox** — the toggle affordances now behave consistently. Autocomplete's built-in magnifier and Combobox's chevron both span the full control height (so the whole trailing area is clickable, even when selected-value chips wrap the control onto several rows), and Autocomplete's magnifier was pulled flush to the trailing edge so it lines up with Combobox's toggle instead of sitting ~8px farther in. Combobox's control was restructured into a wrapping chips/input box plus a separate indicator box to make its toggle span the full height.

## Features

- 🎨 **Complete FluentUI Component Set** - Wraps all major FluentUI web components
- 🔧 **TypeScript Support** - Full type definitions for all components
- 📱 **Responsive Design** - Built-in responsive layout components (incl. responsive `Tabs` with scroll/wrap/menu modes)
- 🎯 **Svelte 5 Compatible** - Works with the latest Svelte features
- 🎨 **SCSS & Tailwind CSS** - Flexible styling options
- 📦 **Tree-shakeable** - Import only what you need
- ✨ **FluentUI Blazor Inspired** - Advanced components like Calendar, DatePicker, TimePicker, InputFile, Autocomplete
- 💾 **Navigation Persistence** - Opt-in with `persistKey`: NavGroup expanded state and MultiSplitter layouts survive page reloads via localStorage
- 🎯 **Active Route Highlighting** - Current page automatically highlighted in navigation
- 🔔 **Toast Notifications** - Programmatic toast service with multiple positions and auto-dismiss
- 🗂 **Centralized z-index scale + portaled overlays** - Dialogs, popovers and tooltips render through `document.body` so they escape ancestor stacking contexts; every overlay uses a shared `--fluent-z-*` token scale with baked-in fallbacks
- 🪟 **`portal` action** - Utility action exported for consumer-built overlays that need to escape parent stacking contexts
- 🔌 **Global runtime API** - `window.components["svelte-fluentui"].version()` exposed at runtime for introspection (mirrors the pattern used by sister packages)

## Installation

```bash
npm install svelte-fluentui
```

## Quick Start

```svelte
<script>
  import { Button, TextField, Card } from 'svelte-fluentui'
</script>

<Card>
  <TextField placeholder="Enter your name" />
  <Button appearance="accent">Submit</Button>
</Card>
```

## Documentation

- 📖 **[Live showcase & component docs](https://svelte-fluentui.keenmate.dev)** — interactive demos and API tables
- 🧩 **[COMPONENTS.md](https://github.com/KeenMate/svelte-fluentui/blob/prod/COMPONENTS.md)** — full catalogue of available components and per-component highlights
- 💡 **[EXAMPLES.md](https://github.com/KeenMate/svelte-fluentui/blob/prod/EXAMPLES.md)** — copy-paste usage examples (forms, grids, dialogs, toasts, layout, the `portal` action, the z-index scale)
- 🛠 **[DEVELOPMENT.md](https://github.com/KeenMate/svelte-fluentui/blob/prod/DEVELOPMENT.md)** — building the library, running the docs site, and contributing
- 📜 **[CHANGELOG.md](https://github.com/KeenMate/svelte-fluentui/blob/prod/CHANGELOG.md)** — release history

## License

MIT © [Keenmate s.r.o.](https://github.com/KeenMate)

## Credits

Built on top of [Microsoft FluentUI Web Components](https://github.com/microsoft/fluentui) v2.6.x.

Several advanced components — Calendar, DatePicker, TimePicker, InputFile, and Autocomplete — are inspired by [Microsoft FluentUI Blazor](https://www.fluentui-blazor.net/).
