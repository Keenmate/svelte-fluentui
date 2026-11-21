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
	 * Close on scroll outside the surfaces. Default `false` — for popups that
	 * don't follow their anchor (PositioningRegion's autoUpdate does follow).
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

	function onScroll(event: Event) {
		if (!isInside(event)) onDismiss("scroll", event)
	}

	document.addEventListener("pointerdown", onPointerDown, true)
	document.addEventListener("contextmenu", onContextMenu, true)
	if (focusOut) document.addEventListener("focusin", onFocusIn, true)
	// Scroll doesn't bubble; capture on window sees every scroll container.
	if (scroll) window.addEventListener("scroll", onScroll, true)

	return () => {
		document.removeEventListener("pointerdown", onPointerDown, true)
		document.removeEventListener("contextmenu", onContextMenu, true)
		document.removeEventListener("focusin", onFocusIn, true)
		window.removeEventListener("scroll", onScroll, true)
	}
}
