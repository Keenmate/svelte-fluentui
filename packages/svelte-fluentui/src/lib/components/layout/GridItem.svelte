<!-- @component
A cell of a `Grid`: spans 1–12 columns per breakpoint (`xs`…`xxl`, mobile-first), or grows when none is set.

```svelte
<GridItem xs={12} md={6} lg={4}>…</GridItem>
```
-->

<script lang="ts">
	import {gridContext} from "../../contexts.js"
	import {attrs} from "../../helpers/attrs.js"
	import type {Snippet} from "svelte"
	import type {RestProps} from "../../types/index.js"
	import {onMount} from "svelte"
	import {innerWidth} from "svelte/reactivity/window"
	import {
		acquireContainer,
		DEFAULT_GRID_BREAKPOINTS,
		ensureAutoConfigured,
		warnIfContainerMissing
	} from "./containerQueries.js"

	type JustifyContent = "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly"
	type GridItemHidden =
		| "xs"
		| "sm"
		| "md"
		| "lg"
		| "xl"
		| "xxl"
		| "xs-up"
		| "sm-up"
		| "md-up"
		| "lg-up"
		| "xl-up"
		| "xxl-up"
		| "xs-down"
		| "sm-down"
		| "md-down"
		| "lg-down"
		| "xl-down"
		| "xxl-down"

	type OwnProps = {
		/** Cell content. */
		children?: Snippet
		/** Columns (0–12) to span from the xs breakpoint up; `0` = auto/grow. No breakpoint at all also grows. */
		xs?: number
		/** Columns (0–12) to span from the sm breakpoint (600px) up. */
		sm?: number
		/** Columns (0–12) to span from the md breakpoint (960px) up. */
		md?: number
		/** Columns (0–12) to span from the lg breakpoint (1280px) up. */
		lg?: number
		/** Columns (0–12) to span from the xl breakpoint (1920px) up. */
		xl?: number
		/** Columns (0–12) to span from the xxl breakpoint (2560px) up. */
		xxl?: number
		/** `justify-content` of the cell's own content (also makes the cell `display: flex`). */
		justify?: JustifyContent
		/** Gap between the cell's children (any CSS length; also makes the cell `display: flex`). */
		gap?: string
		/** Per-item override of the parent Grid's `adaptiveRendering`. */
		adaptiveRendering?: boolean
		/** Hide at a viewport breakpoint: exact (`"md"`), and up (`"md-up"`) or below (`"md-down"`).
		 * Re-evaluated on window resize. */
		hiddenWhen?: GridItemHidden
		/** Extra CSS classes. */
		class?: string
		/** Inline style, appended after the justify/gap styles. */
		style?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, …) go to the item `<div>`. */
	type Props = OwnProps & RestProps<OwnProps>

	let {
		children = undefined,
		xs = undefined,
		sm = undefined,
		md = undefined,
		lg = undefined,
		xl = undefined,
		xxl = undefined,
		justify = undefined,
		gap = undefined,
		adaptiveRendering = undefined,
		hiddenWhen = undefined,
		class: className = "",
		style = "",
		...rest
	}: Props = $props()

	const grid = gridContext.get()

	const noBreakpointsDefined = $derived(
		xs == null && sm == null && md == null && lg == null && xl == null && xxl == null
	)

	// Container-query mode: when the parent Grid opted in, tag the item with
	// `data-cq` so the @container rules apply. The value is the container name:
	// "" = the Grid's own anonymous container, or a named container. When off,
	// the attribute is absent and the item keeps viewport @media sizing.
	const cqValue = $derived(grid?.container ? (grid.cqName ?? "") : undefined)

	// In container mode every item must carry a data-xs (used by the base
	// @container rule + specificity); default to 12 (full width, mobile-first).
	const cqXs = $derived(cqValue != null ? (xs ?? 12) : xs)

	let itemElement: HTMLDivElement | undefined = $state()

	onMount(() => {
		if (cqValue == null) return
		// Let CSS-variable breakpoint config apply even if the app never called
		// configureGridBreakpoints() explicitly.
		ensureAutoConfigured()
		// The default "" container is handled by bundled scoped CSS; named
		// containers (external id or a Grid-generated name) need their
		// @container rules injected at runtime.
		if (!cqValue) return
		const release = acquireContainer(
			cqValue,
			grid?.breakpoints ?? DEFAULT_GRID_BREAKPOINTS,
			grid?.explicitBreakpoints ?? false
		)
		if (grid?.external) warnIfContainerMissing(itemElement, cqValue)
		return release
	})

	let shouldRender = $derived(() => {
		const adaptive = adaptiveRendering ?? grid?.adaptiveRendering
		if (!adaptive || !grid?.currentSize) return true

		const size = grid.currentSize
		// Determine which breakpoint to use based on current size
		if (size === "xxl" && xxl != null) return true
		if (size === "xl" && xl != null) return true
		if (size === "lg" && lg != null) return true
		if (size === "md" && md != null) return true
		if (size === "sm" && sm != null) return true
		if (size === "xs" && xs != null) return true

		return false
	})

	// `innerWidth` from svelte/reactivity/window is reactive: a `resize` listener is
	// attached while this derived has readers and removed when the item is destroyed.
	let isHidden = $derived(() => {
		if (!hiddenWhen) return false

		const width = innerWidth.current
		if (width === undefined) return false
		const breakpoint = hiddenWhen.replace("-up", "").replace("-down", "")
		const isUp = hiddenWhen.includes("-up")
		const isDown = hiddenWhen.includes("-down")

		const breakpoints: Record<string, number> = {
			xs: 0,
			sm: 600,
			md: 960,
			lg: 1280,
			xl: 1920,
			xxl: 2560
		}

		const breakpointValue = breakpoints[breakpoint]

		if (isUp) {
			return width >= breakpointValue
		} else if (isDown) {
			return width < breakpointValue
		} else {
			// Exact match
			const sizes = Object.keys(breakpoints)
			const currentIndex = sizes.findIndex((s) => {
				const min = breakpoints[s]
				const max = breakpoints[sizes[sizes.indexOf(s) + 1]] || Infinity
				return width >= min && width < max
			})
			return sizes[currentIndex] === breakpoint
		}
	})

	let computedStyle = $derived(
		[justify && `justify-content: ${justify};`, justify && "display: flex;", gap && `gap: ${gap};`, style]
			.filter(Boolean)
			.join(" ")
	)
</script>

{#if shouldRender() && !isHidden()}
	<div
		{...rest}
		bind:this={itemElement}
		class={className}
		style={computedStyle}
		{...cqValue != null ? {"data-cq": cqValue} : {}}
		{...cqValue != null
			? {"data-xs": cqXs}
			: noBreakpointsDefined
				? {"data-xs": 0}
				: xs !== undefined
					? {"data-xs": xs}
					: {}}
		{...attrs({
			"data-sm": sm,
			"data-md": md,
			"data-lg": lg,
			"data-xl": xl,
			"data-xxl": xxl,
			"data-hidden-when": hiddenWhen
		})}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	div {
		box-sizing: border-box;
	}

	/* Grid column sizing */
	div[data-xs="0"] {
		flex-basis: auto;
		flex-grow: 1;
		max-width: 100%;
	}

	div[data-xs="1"] {
		flex-basis: 8.333333%;
		max-width: 8.333333%;
	}
	div[data-xs="2"] {
		flex-basis: 16.666667%;
		max-width: 16.666667%;
	}
	div[data-xs="3"] {
		flex-basis: 25%;
		max-width: 25%;
	}
	div[data-xs="4"] {
		flex-basis: 33.333333%;
		max-width: 33.333333%;
	}
	div[data-xs="5"] {
		flex-basis: 41.666667%;
		max-width: 41.666667%;
	}
	div[data-xs="6"] {
		flex-basis: 50%;
		max-width: 50%;
	}
	div[data-xs="7"] {
		flex-basis: 58.333333%;
		max-width: 58.333333%;
	}
	div[data-xs="8"] {
		flex-basis: 66.666667%;
		max-width: 66.666667%;
	}
	div[data-xs="9"] {
		flex-basis: 75%;
		max-width: 75%;
	}
	div[data-xs="10"] {
		flex-basis: 83.333333%;
		max-width: 83.333333%;
	}
	div[data-xs="11"] {
		flex-basis: 91.666667%;
		max-width: 91.666667%;
	}
	div[data-xs="12"] {
		flex-basis: 100%;
		max-width: 100%;
	}

	/* Responsive breakpoints */
	@media (min-width: 600px) {
		div[data-sm="1"] {
			flex-basis: 8.333333%;
			max-width: 8.333333%;
		}
		div[data-sm="2"] {
			flex-basis: 16.666667%;
			max-width: 16.666667%;
		}
		div[data-sm="3"] {
			flex-basis: 25%;
			max-width: 25%;
		}
		div[data-sm="4"] {
			flex-basis: 33.333333%;
			max-width: 33.333333%;
		}
		div[data-sm="5"] {
			flex-basis: 41.666667%;
			max-width: 41.666667%;
		}
		div[data-sm="6"] {
			flex-basis: 50%;
			max-width: 50%;
		}
		div[data-sm="7"] {
			flex-basis: 58.333333%;
			max-width: 58.333333%;
		}
		div[data-sm="8"] {
			flex-basis: 66.666667%;
			max-width: 66.666667%;
		}
		div[data-sm="9"] {
			flex-basis: 75%;
			max-width: 75%;
		}
		div[data-sm="10"] {
			flex-basis: 83.333333%;
			max-width: 83.333333%;
		}
		div[data-sm="11"] {
			flex-basis: 91.666667%;
			max-width: 91.666667%;
		}
		div[data-sm="12"] {
			flex-basis: 100%;
			max-width: 100%;
		}
	}

	@media (min-width: 960px) {
		div[data-md="1"] {
			flex-basis: 8.333333%;
			max-width: 8.333333%;
		}
		div[data-md="2"] {
			flex-basis: 16.666667%;
			max-width: 16.666667%;
		}
		div[data-md="3"] {
			flex-basis: 25%;
			max-width: 25%;
		}
		div[data-md="4"] {
			flex-basis: 33.333333%;
			max-width: 33.333333%;
		}
		div[data-md="5"] {
			flex-basis: 41.666667%;
			max-width: 41.666667%;
		}
		div[data-md="6"] {
			flex-basis: 50%;
			max-width: 50%;
		}
		div[data-md="7"] {
			flex-basis: 58.333333%;
			max-width: 58.333333%;
		}
		div[data-md="8"] {
			flex-basis: 66.666667%;
			max-width: 66.666667%;
		}
		div[data-md="9"] {
			flex-basis: 75%;
			max-width: 75%;
		}
		div[data-md="10"] {
			flex-basis: 83.333333%;
			max-width: 83.333333%;
		}
		div[data-md="11"] {
			flex-basis: 91.666667%;
			max-width: 91.666667%;
		}
		div[data-md="12"] {
			flex-basis: 100%;
			max-width: 100%;
		}
	}

	@media (min-width: 1280px) {
		div[data-lg="1"] {
			flex-basis: 8.333333%;
			max-width: 8.333333%;
		}
		div[data-lg="2"] {
			flex-basis: 16.666667%;
			max-width: 16.666667%;
		}
		div[data-lg="3"] {
			flex-basis: 25%;
			max-width: 25%;
		}
		div[data-lg="4"] {
			flex-basis: 33.333333%;
			max-width: 33.333333%;
		}
		div[data-lg="5"] {
			flex-basis: 41.666667%;
			max-width: 41.666667%;
		}
		div[data-lg="6"] {
			flex-basis: 50%;
			max-width: 50%;
		}
		div[data-lg="7"] {
			flex-basis: 58.333333%;
			max-width: 58.333333%;
		}
		div[data-lg="8"] {
			flex-basis: 66.666667%;
			max-width: 66.666667%;
		}
		div[data-lg="9"] {
			flex-basis: 75%;
			max-width: 75%;
		}
		div[data-lg="10"] {
			flex-basis: 83.333333%;
			max-width: 83.333333%;
		}
		div[data-lg="11"] {
			flex-basis: 91.666667%;
			max-width: 91.666667%;
		}
		div[data-lg="12"] {
			flex-basis: 100%;
			max-width: 100%;
		}
	}

	@media (min-width: 1920px) {
		div[data-xl="1"] {
			flex-basis: 8.333333%;
			max-width: 8.333333%;
		}
		div[data-xl="2"] {
			flex-basis: 16.666667%;
			max-width: 16.666667%;
		}
		div[data-xl="3"] {
			flex-basis: 25%;
			max-width: 25%;
		}
		div[data-xl="4"] {
			flex-basis: 33.333333%;
			max-width: 33.333333%;
		}
		div[data-xl="5"] {
			flex-basis: 41.666667%;
			max-width: 41.666667%;
		}
		div[data-xl="6"] {
			flex-basis: 50%;
			max-width: 50%;
		}
		div[data-xl="7"] {
			flex-basis: 58.333333%;
			max-width: 58.333333%;
		}
		div[data-xl="8"] {
			flex-basis: 66.666667%;
			max-width: 66.666667%;
		}
		div[data-xl="9"] {
			flex-basis: 75%;
			max-width: 75%;
		}
		div[data-xl="10"] {
			flex-basis: 83.333333%;
			max-width: 83.333333%;
		}
		div[data-xl="11"] {
			flex-basis: 91.666667%;
			max-width: 91.666667%;
		}
		div[data-xl="12"] {
			flex-basis: 100%;
			max-width: 100%;
		}
	}

	@media (min-width: 2560px) {
		div[data-xxl="1"] {
			flex-basis: 8.333333%;
			max-width: 8.333333%;
		}
		div[data-xxl="2"] {
			flex-basis: 16.666667%;
			max-width: 16.666667%;
		}
		div[data-xxl="3"] {
			flex-basis: 25%;
			max-width: 25%;
		}
		div[data-xxl="4"] {
			flex-basis: 33.333333%;
			max-width: 33.333333%;
		}
		div[data-xxl="5"] {
			flex-basis: 41.666667%;
			max-width: 41.666667%;
		}
		div[data-xxl="6"] {
			flex-basis: 50%;
			max-width: 50%;
		}
		div[data-xxl="7"] {
			flex-basis: 58.333333%;
			max-width: 58.333333%;
		}
		div[data-xxl="8"] {
			flex-basis: 66.666667%;
			max-width: 66.666667%;
		}
		div[data-xxl="9"] {
			flex-basis: 75%;
			max-width: 75%;
		}
		div[data-xxl="10"] {
			flex-basis: 83.333333%;
			max-width: 83.333333%;
		}
		div[data-xxl="11"] {
			flex-basis: 91.666667%;
			max-width: 91.666667%;
		}
		div[data-xxl="12"] {
			flex-basis: 100%;
			max-width: 100%;
		}
	}

	/* ===== Container-query mode (opt-in via <Grid container>) ===== */
	/* Column values stay on data-* attributes (CSP-clean: no inline styles).
	   These map each data-* value to a CSS var, gated by [data-cq] so viewport
	   items are untouched. The base rule below sizes from --_col; the @container
	   activations only reassign --_col, so a named container needs just ~5 rules. */
	div[data-cq][data-xs="1"] {
		--_xs: 1;
	}
	div[data-cq][data-xs="2"] {
		--_xs: 2;
	}
	div[data-cq][data-xs="3"] {
		--_xs: 3;
	}
	div[data-cq][data-xs="4"] {
		--_xs: 4;
	}
	div[data-cq][data-xs="5"] {
		--_xs: 5;
	}
	div[data-cq][data-xs="6"] {
		--_xs: 6;
	}
	div[data-cq][data-xs="7"] {
		--_xs: 7;
	}
	div[data-cq][data-xs="8"] {
		--_xs: 8;
	}
	div[data-cq][data-xs="9"] {
		--_xs: 9;
	}
	div[data-cq][data-xs="10"] {
		--_xs: 10;
	}
	div[data-cq][data-xs="11"] {
		--_xs: 11;
	}
	div[data-cq][data-xs="12"] {
		--_xs: 12;
	}
	div[data-cq][data-sm="1"] {
		--_sm: 1;
	}
	div[data-cq][data-sm="2"] {
		--_sm: 2;
	}
	div[data-cq][data-sm="3"] {
		--_sm: 3;
	}
	div[data-cq][data-sm="4"] {
		--_sm: 4;
	}
	div[data-cq][data-sm="5"] {
		--_sm: 5;
	}
	div[data-cq][data-sm="6"] {
		--_sm: 6;
	}
	div[data-cq][data-sm="7"] {
		--_sm: 7;
	}
	div[data-cq][data-sm="8"] {
		--_sm: 8;
	}
	div[data-cq][data-sm="9"] {
		--_sm: 9;
	}
	div[data-cq][data-sm="10"] {
		--_sm: 10;
	}
	div[data-cq][data-sm="11"] {
		--_sm: 11;
	}
	div[data-cq][data-sm="12"] {
		--_sm: 12;
	}
	div[data-cq][data-md="1"] {
		--_md: 1;
	}
	div[data-cq][data-md="2"] {
		--_md: 2;
	}
	div[data-cq][data-md="3"] {
		--_md: 3;
	}
	div[data-cq][data-md="4"] {
		--_md: 4;
	}
	div[data-cq][data-md="5"] {
		--_md: 5;
	}
	div[data-cq][data-md="6"] {
		--_md: 6;
	}
	div[data-cq][data-md="7"] {
		--_md: 7;
	}
	div[data-cq][data-md="8"] {
		--_md: 8;
	}
	div[data-cq][data-md="9"] {
		--_md: 9;
	}
	div[data-cq][data-md="10"] {
		--_md: 10;
	}
	div[data-cq][data-md="11"] {
		--_md: 11;
	}
	div[data-cq][data-md="12"] {
		--_md: 12;
	}
	div[data-cq][data-lg="1"] {
		--_lg: 1;
	}
	div[data-cq][data-lg="2"] {
		--_lg: 2;
	}
	div[data-cq][data-lg="3"] {
		--_lg: 3;
	}
	div[data-cq][data-lg="4"] {
		--_lg: 4;
	}
	div[data-cq][data-lg="5"] {
		--_lg: 5;
	}
	div[data-cq][data-lg="6"] {
		--_lg: 6;
	}
	div[data-cq][data-lg="7"] {
		--_lg: 7;
	}
	div[data-cq][data-lg="8"] {
		--_lg: 8;
	}
	div[data-cq][data-lg="9"] {
		--_lg: 9;
	}
	div[data-cq][data-lg="10"] {
		--_lg: 10;
	}
	div[data-cq][data-lg="11"] {
		--_lg: 11;
	}
	div[data-cq][data-lg="12"] {
		--_lg: 12;
	}
	div[data-cq][data-xl="1"] {
		--_xl: 1;
	}
	div[data-cq][data-xl="2"] {
		--_xl: 2;
	}
	div[data-cq][data-xl="3"] {
		--_xl: 3;
	}
	div[data-cq][data-xl="4"] {
		--_xl: 4;
	}
	div[data-cq][data-xl="5"] {
		--_xl: 5;
	}
	div[data-cq][data-xl="6"] {
		--_xl: 6;
	}
	div[data-cq][data-xl="7"] {
		--_xl: 7;
	}
	div[data-cq][data-xl="8"] {
		--_xl: 8;
	}
	div[data-cq][data-xl="9"] {
		--_xl: 9;
	}
	div[data-cq][data-xl="10"] {
		--_xl: 10;
	}
	div[data-cq][data-xl="11"] {
		--_xl: 11;
	}
	div[data-cq][data-xl="12"] {
		--_xl: 12;
	}
	div[data-cq][data-xxl="1"] {
		--_xxl: 1;
	}
	div[data-cq][data-xxl="2"] {
		--_xxl: 2;
	}
	div[data-cq][data-xxl="3"] {
		--_xxl: 3;
	}
	div[data-cq][data-xxl="4"] {
		--_xxl: 4;
	}
	div[data-cq][data-xxl="5"] {
		--_xxl: 5;
	}
	div[data-cq][data-xxl="6"] {
		--_xxl: 6;
	}
	div[data-cq][data-xxl="7"] {
		--_xxl: 7;
	}
	div[data-cq][data-xxl="8"] {
		--_xxl: 8;
	}
	div[data-cq][data-xxl="9"] {
		--_xxl: 9;
	}
	div[data-cq][data-xxl="10"] {
		--_xxl: 10;
	}
	div[data-cq][data-xxl="11"] {
		--_xxl: 11;
	}
	div[data-cq][data-xxl="12"] {
		--_xxl: 12;
	}

	/* Register --_col as a number that falls back to 12 (full width) if a value
	   ever becomes invalid at computed-value time, instead of collapsing to the
	   guaranteed-invalid empty value (which turns flex-basis into `auto` and
	   shrinks items to content width). Belt-and-suspenders now that the fallback
	   chains no longer self-reference --_col. */
	@property --_col {
		syntax: "<number>";
		inherits: false;
		initial-value: 12;
	}

	/* Base: mobile-first, sized from --_col (defaults to --_xs, else 12 = full).
	   Two attributes ([data-cq][data-xs]) outspecify the 1-attr viewport rules,
	   so container items never pick up viewport flex-basis regardless of order. */
	div[data-cq][data-xs] {
		--_col: var(--_xs, 12);
		flex-basis: calc(var(--_col) / 12 * 100%);
		max-width: calc(var(--_col) / 12 * 100%);
	}

	/* Default (unnamed) container: queries the nearest container = the Grid itself.
	   Named containers inject their own @container rules at runtime via
	   containerQueries.ts. Keep these min-widths in sync with DEFAULT_GRID_BREAKPOINTS.
	   The `:not(.fluent-grid-custom-bp)` gate lets an app-wide breakpoint config
	   (configureGridBreakpoints / --fluent-grid-breakpoint-* vars) disable these
	   defaults and replace them with generated rules — no threshold overlap. */
	@container (min-width: 480px) {
		:global(html:not(.fluent-grid-custom-bp)) div[data-cq=""][data-xs] {
			--_col: var(--_sm, var(--_xs, 12));
		}
	}
	@container (min-width: 640px) {
		:global(html:not(.fluent-grid-custom-bp)) div[data-cq=""][data-xs] {
			--_col: var(--_md, var(--_sm, var(--_xs, 12)));
		}
	}
	@container (min-width: 900px) {
		:global(html:not(.fluent-grid-custom-bp)) div[data-cq=""][data-xs] {
			--_col: var(--_lg, var(--_md, var(--_sm, var(--_xs, 12))));
		}
	}
	@container (min-width: 1200px) {
		:global(html:not(.fluent-grid-custom-bp)) div[data-cq=""][data-xs] {
			--_col: var(--_xl, var(--_lg, var(--_md, var(--_sm, var(--_xs, 12)))));
		}
	}
	@container (min-width: 1600px) {
		:global(html:not(.fluent-grid-custom-bp)) div[data-cq=""][data-xs] {
			--_col: var(--_xxl, var(--_xl, var(--_lg, var(--_md, var(--_sm, var(--_xs, 12))))));
		}
	}
</style>
