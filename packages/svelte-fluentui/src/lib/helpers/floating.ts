/**
 * Shared popup positioning (Floating UI, `position: fixed`) for every anchored popup: dropdowns
 * (via PositioningRegion), menus, the InputFile popover, Tooltip.
 *
 * Writes three CSS variables on the floating element, so sizing stays a CSS decision:
 * - `--fluent-popup-available-height` — px left between the anchor and the viewport edge on the
 *   side the popup opened (minus `padding`); a popup caps itself with
 *   `max-height: min(<its own cap>, var(--fluent-popup-available-height, 100vh))`,
 * - `--fluent-popup-available-width` — the same horizontally,
 * - `--fluent-popup-anchor-width` — the anchor's width (`matchWidth` uses it).
 *
 * Reads one: `--fluent-popup-offset` (a length) overrides the gap between anchor and popup. It is
 * read from the anchor, not the popup — popups are portalled to `<body>` and wouldn't inherit a value
 * set on a container (`.my-form { --fluent-popup-offset: 4px }`). Registered as `<length> | auto` so
 * it computes to px; `auto` (unset) keeps the popup's own default.
 *
 * The side is locked after the first placement (`lockPlacement`): the popup doesn't jump above /
 * below while the page scrolls or a filter shrinks the list. It decides again on a viewport resize,
 * when it grows while capped by the available height (async results), or on `reposition()`.
 * The popup is transparent until it has been placed once (no flash at 0,0); `opacity`, not
 * `visibility`, so focus can move into it right away.
 */
import {
	arrow,
	autoUpdate,
	computePosition,
	flip,
	hide,
	offset,
	shift,
	size,
	type MiddlewareData,
	type OffsetOptions,
	type Placement,
	type ReferenceElement
} from "@floating-ui/dom"

export type FloatingOptions = {
	/** Preferred placement. Default: `"bottom-start"`. */
	placement?: Placement
	/** Placements `flip` tries, in order, when the preferred one doesn't fit. Default: the opposite side. */
	fallbackPlacements?: Placement[]
	/** Gap between anchor and popup: px, a CSS length (`"calc(var(--design-unit) * 2px)"`) or a Floating UI
	 * `offset` object. `--fluent-popup-offset` on the anchor overrides the main-axis gap. Default: `0`. */
	offset?: OffsetOptions | string
	/** Let `--fluent-popup-offset` override `offset`. Default: `true` (Tooltip: `false`, its arrow needs its gap). */
	offsetVariable?: boolean
	/** Minimum distance to the viewport edges, px. Default: `8`. */
	padding?: number
	/** Popup width = anchor width (`width: var(--fluent-popup-anchor-width)`). Default: `false`. */
	matchWidth?: boolean
	/** Keep the side chosen by the first placement. Default: `true`. */
	lockPlacement?: boolean
	/** Arrow element positioned by the `arrow` middleware (Tooltip). */
	arrow?: HTMLElement
	/** Report whether the anchor is scrolled out of view (`middlewareData.hide`). Default: `false`. */
	hide?: boolean
	/** After every placement. */
	onPlaced?: (ctx: {placement: Placement; middlewareData: MiddlewareData}) => void
}

export type FloatingHandle = {
	/** New options; decides the side again. */
	update(options: FloatingOptions): void
	/** Drops the locked side and places the popup again (e.g. after its content changed). */
	reposition(): void
	destroy(): void
}

const AVAILABLE_HEIGHT = "--fluent-popup-available-height"
const AVAILABLE_WIDTH = "--fluent-popup-available-width"
const ANCHOR_WIDTH = "--fluent-popup-anchor-width"
const OFFSET = "--fluent-popup-offset"

/** Default gap below a form field (Select, Combobox, Autocomplete, DatePicker, TimePicker) — FluentUI's
 * `<fluent-select>` listbox sits `designUnit * 2` (8px) from its control. */
export const FIELD_POPUP_OFFSET = "calc(var(--design-unit, 4) * 2px)"

// Registered so getComputedStyle resolves `calc(var(--design-unit) * 2px)` to px; `auto` = not set.
if (typeof CSS !== "undefined" && "registerProperty" in CSS) {
	try {
		CSS.registerProperty({name: OFFSET, syntax: "<length> | auto", inherits: true, initialValue: "auto"})
	} catch {
		/* already registered (HMR, two copies of the library) */
	}
}

/** px value of `--fluent-popup-offset` on `el`, or null when unset / not a length. */
function offsetVariable(el: Element): number | null {
	const value = parseFloat(getComputedStyle(el).getPropertyValue(OFFSET))
	return Number.isFinite(value) ? value : null
}

/** The gap to use: the anchor's `--fluent-popup-offset` if set, else `offset` (a CSS length resolved on the popup). */
function resolveOffset(reference: ReferenceElement, floating: HTMLElement, options: FloatingOptions): OffsetOptions {
	const anchorEl = reference instanceof Element ? reference : reference.contextElement
	const override = options.offsetVariable !== false && anchorEl ? offsetVariable(anchorEl) : null
	const own = options.offset ?? 0
	if (override !== null)
		return typeof own === "object" && typeof own !== "function" ? {...own, mainAxis: override} : override
	if (typeof own !== "string") return own
	floating.style.setProperty(OFFSET, own)
	const px = offsetVariable(floating)
	floating.style.removeProperty(OFFSET)
	return px ?? 0
}

export function anchorFloating(
	reference: ReferenceElement,
	floating: HTMLElement,
	initialOptions: FloatingOptions = {}
): FloatingHandle {
	let options = initialOptions
	let locked: Placement | null = null
	let placed = false
	let destroyed = false
	let run = 0
	let availableHeight = Infinity
	let lastHeight = 0
	let gap = resolveOffset(reference, floating, options)

	floating.style.position = "fixed"
	floating.style.opacity = "0"

	async function compute() {
		const id = ++run
		const {padding = 8, matchWidth = false, lockPlacement = true} = options
		floating.style.setProperty(ANCHOR_WIDTH, `${reference.getBoundingClientRect().width}px`)
		if (matchWidth) floating.style.width = `var(${ANCHOR_WIDTH})`

		const middleware = [offset(gap)]
		if (!locked) middleware.push(flip({padding, fallbackPlacements: options.fallbackPlacements}))
		middleware.push(
			shift({padding}),
			size({
				padding,
				apply({availableHeight: h, availableWidth: w, elements}) {
					availableHeight = Math.max(0, Math.floor(h))
					elements.floating.style.setProperty(AVAILABLE_HEIGHT, `${availableHeight}px`)
					elements.floating.style.setProperty(AVAILABLE_WIDTH, `${Math.max(0, Math.floor(w))}px`)
				}
			})
		)
		if (options.arrow) middleware.push(arrow({element: options.arrow, padding: 4}))
		if (options.hide) middleware.push(hide())

		const result = await computePosition(reference, floating, {
			placement: locked ?? options.placement ?? "bottom-start",
			strategy: "fixed",
			middleware
		})
		// Superseded by a newer run, or the popup closed while this one was in flight.
		if (destroyed || id !== run) return

		floating.style.left = `${result.x}px`
		floating.style.top = `${result.y}px`
		if (lockPlacement) locked = result.placement
		if (!placed) {
			placed = true
			floating.style.opacity = ""
			lastHeight = floating.getBoundingClientRect().height
		}
		options.onPlaced?.({placement: result.placement, middlewareData: result.middlewareData})
	}

	// Decide the side again with the popup at its natural (component-capped) height: without the
	// available-height variable the CSS falls back to the component cap. Removing it and measuring
	// happen in the same task, so the uncapped size is never painted.
	function reposition() {
		locked = null
		floating.style.removeProperty(AVAILABLE_HEIGHT)
		void compute()
	}

	// Grown while capped by the available height (e.g. async results replaced "Loading…"): the other
	// side may have more room. Shrinking never moves the popup.
	const resizeObserver =
		typeof ResizeObserver === "undefined"
			? null
			: new ResizeObserver(() => {
					const height = floating.getBoundingClientRect().height
					const grew = height > lastHeight + 0.5
					lastHeight = height
					if (grew && placed && height >= availableHeight - 1) reposition()
				})
	resizeObserver?.observe(floating)

	const onViewportResize = () => reposition()
	window.addEventListener("resize", onViewportResize)
	window.visualViewport?.addEventListener("resize", onViewportResize)

	const stopAutoUpdate = autoUpdate(reference, floating, () => void compute())

	return {
		update(next) {
			options = next
			gap = resolveOffset(reference, floating, options)
			reposition()
		},
		reposition,
		destroy() {
			destroyed = true
			stopAutoUpdate()
			resizeObserver?.disconnect()
			window.removeEventListener("resize", onViewportResize)
			window.visualViewport?.removeEventListener("resize", onViewportResize)
		}
	}
}

/** Svelte action form: `use:floating={{reference, ...options}}`. */
export function floating(node: HTMLElement, params: FloatingOptions & {reference: ReferenceElement}) {
	let {reference, ...options} = params
	let handle = anchorFloating(reference, node, options)
	return {
		update(next: FloatingOptions & {reference: ReferenceElement}) {
			const {reference: nextReference, ...nextOptions} = next
			if (nextReference !== reference) {
				handle.destroy()
				reference = nextReference
				handle = anchorFloating(reference, node, nextOptions)
			} else handle.update(nextOptions)
		},
		destroy() {
			handle.destroy()
		}
	}
}
