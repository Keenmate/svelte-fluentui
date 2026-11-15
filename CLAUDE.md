# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Svelte wrapper library for FluentUI web components (version 2.6.x). The project uses SvelteKit with TypeScript, Tailwind CSS, and SCSS for styling. It's packaged as a reusable component library that wraps Microsoft's FluentUI web components.

## Development Commands

- `npm run dev` - Start development server
- `npm run dev -- --open` - Start development server and open in browser
- `npm run build` - Build the production app and package the library
- `npm run preview` - Preview the production build
- `npm run check` - Run TypeScript checking
- `npm run check:watch` - Run TypeScript checking in watch mode
- `npm run lint` - Run linting (Prettier + ESLint)
- `npm run format` - Format code with Prettier
- `npm run prepack` - Package the library for publishing (runs automatically on build)

## Architecture

### Library Structure
Monorepo: the library lives in `packages/svelte-fluentui/`, the docs/demo site in `docs/` (its `svelte.config.js` aliases `svelte-fluentui` to the library source, so `make dev` serves source), Playwright specs in `e2e/` (fixtures under `docs/src/routes/test/`).

- `packages/svelte-fluentui/src/lib/` - Main library code that gets packaged
- `packages/svelte-fluentui/src/lib/components/` - Svelte components (custom and FluentUI wrappers)
- `packages/svelte-fluentui/src/lib/components/index.ts` - Main component exports
- `packages/svelte-fluentui/src/lib/action-items/` - Shared ActionItem model (menus, toolbars, dialog/palette actions)
- `packages/svelte-fluentui/src/lib/helpers/` - Shared helpers (`layer-stack.ts` Escape routing, `attrs.ts`, `locale.ts`, `date.ts`)
- `docs/src/routes/` - Demo/showcase pages for development and testing

### Component Organization
- Individual components: Button, Checkbox, TextField, etc.
- Layout components: `packages/svelte-fluentui/src/lib/components/layout/` (Stack, Layout, Header, Footer, Grid, GridItem, MultiSplitter, etc.)
- Navigation components: `packages/svelte-fluentui/src/lib/components/nav/` (AppBar, NavMenu, NavItem, etc.)
- Data components: QuickGrid (custom grid with sorting, filtering, pagination)
- Icons: `packages/svelte-fluentui/src/lib/components/icons/`
- FluentUI utilities: `packages/svelte-fluentui/src/lib/fluent-ui/` (calendar utilities, constants, setup)

### Styling
- Uses SCSS for component-specific styling
- Tailwind CSS for utility classes
- FluentUI web component styles imported via `@fluentui/web-components`
- Main styles: `packages/svelte-fluentui/src/lib/main.scss`
- Component styles: `packages/svelte-fluentui/src/lib/assets/styles/components.scss`
- FluentUI-specific styles: `packages/svelte-fluentui/src/lib/assets/styles/fluent-ui/`

### Key Files
- `packages/svelte-fluentui/src/lib/index.ts` - Main library entry point (exports from components/index.js)
- `packages/svelte-fluentui/src/lib/components/index.ts` - All component exports
- Package exports to `dist/` directory for publishing

## Dependencies

- **Svelte 5.x** - Component framework
- **SvelteKit** - Build tool and framework
- **@fluentui/web-components 2.6.1** - Microsoft FluentUI web components
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **TypeScript** - Type checking
- **SASS** - CSS preprocessing

## Development Notes

- This project wraps FluentUI web components rather than reimplementing them
- **IMPORTANT**: Do NOT use WebFetch to access fluentui-blazor.net - it always fails. The user will provide screenshots of the Blazor documentation pages instead.
- Demo pages in `docs/src/routes/components/` show component usage
- Library components should follow existing naming and export patterns
- TypeScript checking is required before commits
- Components are exported both individually and through index files

### Custom Components vs FluentUI Wrappers

This project contains two types of components:

#### Custom Implementations (No FluentUI wrapper)
These are built from scratch using Svelte, styled with FluentUI design tokens:

- **Accordion** - Custom stack of collapsible panels (NOT a `<fluent-accordion>` wrapper). Owns layout, spacing, and animation: `value` (single id or array), `multiple`, `togglePosition` (start/end chevron side), `gap`, `onChange`, plus roving-focus keyboard nav. Provides an `AccordionSvelteContext` via the `fluent-accordion` context.
- **AccordionItem** - A single collapsible panel (NOT a `<fluent-accordion-item>` wrapper). Plain themed CSS-grid heading `[start | button | end | icon]` + an animated `grid-template-rows` 0fr→1fr region that is `inert` while collapsed. Props: `id` (required), `header`, `headingLevel`, `expanded`, `disabled`; snippets `heading`/`start`/`end`/`icon` (receives `isExpanded`)/`children`.
- **QuickGrid** - Advanced data grid with sorting, filtering, and pagination (inspired by ASP.NET QuickGrid)
- **Card** - Content container with FluentUI styling
- **Badge** - Small status/count indicator; a themed `<span>` (NOT a `<fluent-badge>` wrapper). Supports `color`/`fill` (token-based via `--badge-fill-*`/`--badge-color-*`), `appearance` (accent/lightweight/neutral/outline/tint), `size` (extra-small–extra-large), `circular`, `pill`, `radius`, an `icon` snippet, and text truncation — `truncate` (end ellipsis) or `ellipsisStart` (start-side ellipsis for paths/hierarchies) with `maxWidth` + `title`.
- **Label** - Lighter tag-style indicator (tinted fill + coloured border, medium weight); `outline` variant, six semantic colours (primary/secondary/success/warning/danger/info), extra-small–extra-large size scale, `icon` slot. Colours resolve from the shared `--fluent-color-<name>-*` palette (see fluent-blazor-compat.scss).
- **CompositeBadge** - Three-section `[icon][label][button]` chip (notification pills, status + count, dismissible chips). Base `color` applies to all sections; `labelColor`/`buttonColor` override the middle/right sections independently. `onLabelClick`/`onButtonClick` events, default `×` button glyph.
- **BadgeGroup** - Flex-wrap container that hides child badges past a per-instance `maxVisibleBadgeCount` (default 5), always keeping the last child visible for a "+N more" tail (hidden badges stay in the DOM); `showAll` reveals everything. Limit applied via an effect + `MutationObserver`.
- **Toast** - Notification/toast component (uses fluent-anchor but custom layout)
- **Calendar** - Date picker with custom FluentUI calendar implementation
- **DatePicker** - Date selection with calendar popup (inspired by FluentUI Blazor)
- **TimePicker** - Time selection with hour/minute/second picker (inspired by FluentUI Blazor)
- **InputFile** - File upload with drag-drop, validation, and progress tracking (inspired by FluentUI Blazor)
- **Autocomplete** - Multiple selection with tag/chip display, custom filtering, and initial options support for showing popular items before async search (inspired by FluentUI Blazor)
- **Select** - Custom single/multi select; trigger + portalled listbox (via PositioningRegion) that escapes ancestor `overflow` clipping and caps height to the viewport. Renders `<Option>` children via the `selected-options` context.
- **Combobox** - Custom single- or multi-select combobox: editable filtering input + portalled listbox (via PositioningRegion), same clipping/height fix as Select. Supports `autocomplete` modes (list/inline/both/none), `searchBehavior` (normalized — ignores case + diacritics, default / case-insensitive / exact; shared with Select type-ahead, Autocomplete and the QuickGrid editors via `helpers/text.ts`), `minSearchLength`, `onSearch` (server-side search event) / `filterCallback` (custom matcher), and `<Option>` children or an `options` array. `multiple` renders selected values as removable chips inside the control while the input stays a filter (the dropdown stays open after each pick unless `closeOnSelect`; Backspace on an empty filter removes the last chip); `value`/`onChange` carry the full array in multiple mode.
- **Option** - A single listbox row rendered as a plain themed `<div role="option">` (no longer wraps `<fluent-option>` — dropped for performance, since the custom element's shadow-DOM upgrade blocked the main thread on open). Consumed by Select/Combobox via the `selected-options` context. Parents read `data-value`/`data-option-label`/`data-option-context` and set `data-highlighted`/`data-filtered-out`/`disabled`; the component owns all row styling.
- **OptionGroup** - A `role="group"` section header + its `<Option>` rows for grouped listboxes. Used directly in Select/Combobox children (`<OptionGroup label="…">`), or generated automatically by Combobox from the `group` field on `options` array items. Navigation/filtering only walk `.fluent-option`, so headers are skipped; Combobox hides an empty group via a `:has()` rule.
- **Paginator** - Pagination control with custom logic
- **Tooltip** - Custom floating hint (NOT a `<fluent-tooltip>` wrapper), positioned with floating-ui; `position` is `top | bottom | start | end` (start/end follow the anchor's text direction).
- **Tab/Tabs** - Custom tabbed interface (NOT a `<fluent-tab>` wrapper — the Svelte rewrite renders plain `<button role="tab">` + `role="tabpanel"` divs). `Tab` renders no DOM of its own; it registers its props (label/icon/header/content snippets, `disabled`, `showClose`, `labelEditable`, `data`, `beforeLeaveCallback`, etc.) with the parent via the `fluent-tabs-context`, and `Tabs` reads the registered entries and renders the real tablist + panels. `Tabs` owns `activeId` (bindable, `onActiveIdChange`), keyboard nav, the animated active indicator, swipe-to-navigate, and three `responsive` overflow modes (scroll / wrap / menu — menu measures via an off-screen shadow tablist). A tab can veto being navigated away from via its `beforeLeaveCallback` (for unsaved-data prompts): `Tabs` calls the *active* tab's callback before every interaction-driven switch (click/keyboard/swipe/overflow) and cancels if it returns/resolves `false` — external `activeId` assignment bypasses it by design. A separate `beforeCloseCallback` vetoes the close (×) button before `onTabClose` fires (leaving keeps the tab; closing destroys it) — it guards the tab *being closed*, not the active one. Both callbacks may be async. The only FluentUI web components involved are the menu-mode overflow popover (`<fluent-menu>`). `TabPanel` (below) wraps `<fluent-tab-panel>` but is a separate standalone export not used by Tab/Tabs.

#### Layout Components (Custom implementations)
Located in `src/lib/components/layout/`:
- **Stack** - Flexbox layout container (vertical/horizontal)
- **Grid** - Responsive 12-column grid system
- **GridItem** - Grid column item
- **Layout** - Page layout wrapper
- **Header** - Page header section
- **Footer** - Page footer section
- **BodyContent** - Main content area
- **Spacer** - Spacing utility
- **Panel** - Slide-in side panel; `side` is `start | end` (default `end`), optional overlay, `pinned` mode
- **MultiSplitter** - Resizable multi-panel splitter
- **MultiSplitterPane** - Splitter panel

#### Navigation Components (Custom implementations)
Located in `src/lib/components/nav/`:
- **AppBar** - Application bar
- **NavMenu** - Navigation menu container
- **NavGroup** - Navigation group
- **NavLinkItem** - Navigation link item
- **NavItem** - Generic navigation item

#### FluentUI Web Component Wrappers
These wrap `<fluent-*>` web components from `@fluentui/web-components`:

- **Anchor** → `<fluent-anchor>`
- **Breadcrumb** → `<fluent-breadcrumb>`
- **BreadcrumbItem** → `<fluent-breadcrumb-item>`
- **Button** → `<fluent-button>`
- **Checkbox** → `<fluent-checkbox>`
- **DataGrid** → `<fluent-data-grid>`
- **DataGridRow** → `<fluent-data-grid-row>`
- **DataGridCell** → `<fluent-data-grid-cell>`
- **Dialog** → `<fluent-dialog>`
- **Divider** → `<fluent-divider>`
- **Listbox** → `<fluent-listbox>`
- **NumberField** → `<fluent-number-field>`
- **Radio** → `<fluent-radio>`
- **RadioGroup** → `<fluent-radio-group>`
- **Search** → `<fluent-search>`
- **Slider** → `<fluent-slider>`
- **Switch** → `<fluent-switch>`
- **TabPanel** → `<fluent-tab-panel>`
- **Textarea** → `<fluent-text-area>`
- **TextField** → `<fluent-text-field>`
- **Toolbar** → `<fluent-toolbar>`

**IMPORTANT for Wrapper Components:**
- Only include properties that are actually supported by the underlying `<fluent-*>` component
- All properties must be passed through to the FluentUI component (either explicitly or via `{...restProps}`)
- Do not add properties that have no effect - they confuse users

### Component Demo Pages

All component demo pages follow a consistent structure:
- Located in `docs/src/routes/components/[component-name]/+page.svelte`
- Use Stack, Grid, GridItem, and Card for layout
- Include reference links to FluentUI Web Components Storybook and FluentUI Blazor docs
- Show API documentation tables with properties, types, and descriptions
- Provide multiple usage examples demonstrating different features

## CSS Variable Naming Convention

**IMPORTANT**: CSS custom properties follow a strict component-based naming convention:

### Prefix Structure
Each primary component has its own prefix for CSS variables. Even if similar properties exist across components (like icon gaps), they use separate variables scoped to their component.

**Examples:**
- Sidebar: `--fluent-sidebar-*` (background, text, padding, icon-gap, link-padding, etc.)
- Navbar: `--fluent-navbar-*` (background, text, border, icon-gap, etc.)
- Header: `--fluent-header-*` (background, text, border, etc.)
- Footer: `--fluent-footer-*` (background, text, border, etc.)

### Why Separate Variables?
Even though a sidebar and navbar might both have an "icon gap", they use different variables:
- `--fluent-sidebar-icon-gap` for sidebar icons
- `--fluent-navbar-icon-gap` for navbar icons

**Rationale:**
- Each component can be styled independently
- Themes can override component-specific values
- If a theme wants the same value everywhere, it can set both variables to the same value
- Provides maximum flexibility without coupling components

### Variable Categories
Variables are organized by their component/purpose:
- **Background** - `--fluent-bg-*`
- **Text** - `--fluent-text-*`
- **Border** - `--fluent-border-*`
- **Accent** - `--fluent-accent-*`
- **Navbar** - `--fluent-navbar-*`
- **Sidebar** - `--fluent-sidebar-*`
- **Header** - `--fluent-header-*`
- **Footer** - `--fluent-footer-*`
- **Spacing** - `--fluent-component-*`
- **Typography** - `--fluent-body-*`, `--fluent-heading-*`
- **Animation** - `--fluent-transition`

## Naming Conventions

**IMPORTANT**: This project follows Microsoft FluentUI's naming conventions strictly:

### Property Names
- Always use **camelCase** for property names
- Examples: `horizontalAlign`, `topCTAType`, `verticalAlign`
- ❌ Never use: `snake_case`, `PascalCase`, or `kebab-case` for property names

### Property Values
- Always use **lowercase** for single-word values
  - Examples: `"center"`, `"accent"`, `"neutral"`, `"vertical"`, `"horizontal"`
  - ❌ Never use: `"Center"`, `"Accent"`, `"Vertical"`

- Always use **kebab-case** for multi-word values
  - Examples: `"flex-start"`, `"flex-end"`, `"space-between"`, `"space-around"`
  - ❌ Never use: `"FlexStart"`, `"flexStart"`, `"flex_start"`

### Examples

✅ **Correct:**
```svelte
<Stack orientation="vertical" gap="1rem" />
<Grid justify="flex-start" spacing={3} />
<Tooltip position="top" />
<Badge appearance="accent" />
<Toast topCTAType="timestamp" />
```

❌ **Incorrect:**
```svelte
<Stack orientation="Vertical" gap="1rem" />
<Grid justify="FlexStart" spacing={3} />
<Tooltip position="Top" />
<Badge appearance="Accent" />
<Toast topCTAType="Timestamp" />
```

### Event Handler Naming (2.0.0 — option B)

**IMPORTANT**: The casing tells consumers what the handler receives. Full model: `code-analysis/2.0.0/05-callbacks-events.md` (BlissFramework D-NC-29 / C-NC-14).

#### Native DOM events — lowercase
- Only names the **browser** dispatches, forwarded **untouched** (via `...rest` or explicit forwarding); the handler gets the native `Event`.
- Examples: `onclick`, `oninput`, `onkeydown`, `onfocus`, `onblur`, `ondragenter`
- ❌ Never re-shape a native handler (`onclick(ev, previousValue)`, `onchange(value)`).

#### Component events — camelCase, one `ctx` object
- Everything the component defines, even when it sounds native: `on` + PascalCase, single `ctx` argument.
- State change: `on<State>Change` carrying the new state (`onOpenChange({ open })`); a single act: `on<Domain><Verb>` (`onFileUpload`, `onTabClose`). `onChange({ value })` is reserved for the form value.
- ❌ Never a lowercase name the browser doesn't dispatch (`onopenchange`, `onselectedoptionschange`).

#### Callbacks (return value is used)
- `before*Callback(ctx)` — veto: `false` rejects, `undefined` continues, other value replaces; may be async.
- `get*Callback(ctx)` paired with a `*Member` string shortcut.
- plain `*Callback(ctx)` — behaviour providers (`searchCallback({ term, signal })`, `uploadCallback`).

#### Examples

✅ **Correct:**
```svelte
<Button onclick={handleClick} />
<TextField oninput={handleInput} onChange={({ value }) => save(value)} />
<Dialog bind:open onOpenChange={({ open }) => log(open)} beforeCloseCallback={confirmLeave} />
<Combobox searchCallback={({ term, signal }) => api.search(term, { signal })} />
```

❌ **Incorrect:**
```svelte
<Toast ondismiss={handleDismiss} />                 <!-- component event → onDismiss -->
<Autocomplete onselectedoptionschange={handle} />   <!-- → onChange({ value }) -->
<Checkbox onclick={(ev, previous) => {}} />         <!-- re-shaped native handler -->
```

**Rationale**: Svelte 5 event attributes on elements are case-sensitive and must match the DOM event name, so native names stay lowercase. Component props have no such constraint; making every component-defined event camelCase means consumers learn a handful of native exceptions instead of a split API.
