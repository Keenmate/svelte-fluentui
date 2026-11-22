/**
 * Light dismiss for popups (dropdowns, pickers): close when the user presses,
 * focuses, opens a context menu (incl. the keyboard ContextMenu key / Shift+F10,
 * which fire no `pointerdown`) or (optionally) scrolls somewhere outside the
 * popup's own surfaces.
 * Escape is not handled here — that goes through `pushLayer` (layer-stack.ts).
 *
 * Call it from an `$effect` while the popup is open and return the cleanup:
 *
 * ```ts
 * $effect(() => {
 *   if (!isOpen) return
 *   return dismissOnOutside(() => [triggerEl, listEl], () => close(false))
 * })
 * ```
 */

export type DismissReason = "pointer" | "focus" | "scroll" | "contextmenu"

export type DismissOptions = {
	/** Close on focus moving outside (Tab-ing away, a modal opening). Default `true`. */
	focusOut?: boolean
	/**
	 * Close when a scroll outside the surfaces moves the anchor (`inside()[0]`) by 3px or
	 * more. Scrolling an unrelated panel, a 1px correction or the browser scrolling a
	 * focused field into view right after opening (first two frames) doesn't close.
	 * Default `false`.
	 */
	scroll?: boolean
}

/**
 * Listens (capture phase, so handlers that stop propagation can't hide events)
 * for outside `pointerdown`, `contextmenu`, `focusin` and optionally `scroll`, and calls
 * `onDismiss` with the reason. Returns the function that removes the listeners.
 *
 * - `inside` returns the elements that count as "inside" — the anchor first,
 *   then any portalled popup. Read on every event, so late-bound refs work.
 *   Inside tests use `composedPath()`, so shadow-DOM targets count too.
 * - Focus landing on `<body>` is ignored: that is a focus reset (SvelteKit
 *   does it after every navigation, a removed element drops focus there), not
 *   the user moving somewhere else.
 * - Focus-trap exception: a portalled popup sits outside the DOM subtree of
 *   the dialog that owns the anchor, so the dialog's focus trap pulls focus
 *   back into the dialog mid-click. Focus landing inside the anchor's own
 *   dialog therefore doesn't dismiss; focus moving into a different dialog does.
 */
export function dismissOnOutside(
	inside: () => readonly (Element | null | undefined)[],
	onDismiss: (reason: DismissReason, event: Event) => void,
	{focusOut = true, scroll = false}: DismissOptions = {}
): () => void {
	function isInside(event: Event): boolean {
		const path = event.composedPath()
		return inside().some((el) => !!el && path.includes(el))
	}

	function onPointerDown(event: PointerEvent) {
		if (!isInside(event)) onDismiss("pointer", event)
	}

	// A context menu requested elsewhere: a right-click already closed through `pointerdown`,
	// but the keyboard ContextMenu key / Shift+F10 on another element only fires this.
	function onContextMenu(event: MouseEvent) {
		if (!isInside(event)) onDismiss("contextmenu", event)
	}

	function onFocusIn(event: FocusEvent) {
		if (isInside(event)) return
		const target = event.target as Node | null
		if (!target || target === document.body || target === document.documentElement) return
		const anchorDialog = inside()[0]?.closest("fluent-dialog, [role='dialog']")
		if (anchorDialog && anchorDialog.contains(target)) return
		onDismiss("focus", event)
	}

	// Where the anchor was once the popup settled (two frames after opening).
	let anchorAt: {x: number; y: number} | null = null
	let settleFrame = 0
	// A `display: contents` anchor (ContextMenu's wrapper) has no box: measure its first child that has one.
	function anchorPosition() {
		let el: Element | null | undefined = inside()[0]
		while (el) {
			const rect = el.getBoundingClientRect()
			if (rect.width || rect.height) return {x: rect.left, y: rect.top}
			el = el.firstElementChild
		}
		return null
	}
	if (scroll)
		settleFrame = requestAnimationFrame(
			() =>
				(settleFrame = requestAnimationFrame(() => {
					settleFrame = 0
					anchorAt = anchorPosition()
				}))
		)

	function onScroll(event: Event) {
		if (settleFrame || isInside(event)) return
		const now = anchorPosition()
		if (anchorAt && now && Math.abs(now.x - anchorAt.x) < 3 && Math.abs(now.y - anchorAt.y) < 3) return
		onDismiss("scroll", event)
	}

	document.addEventListener("pointerdown", onPointerDown, true)
	document.addEventListener("contextmenu", onContextMenu, true)
	if (focusOut) document.addEventListener("focusin", onFocusIn, true)
	// Scroll doesn't bubble; capture on window sees every scroll container.
	if (scroll) window.addEventListener("scroll", onScroll, true)

	return () => {
		if (settleFrame) cancelAnimationFrame(settleFrame)
		document.removeEventListener("pointerdown", onPointerDown, true)
		document.removeEventListener("contextmenu", onContextMenu, true)
		document.removeEventListener("focusin", onFocusIn, true)
		window.removeEventListener("scroll", onScroll, true)
	}
}
