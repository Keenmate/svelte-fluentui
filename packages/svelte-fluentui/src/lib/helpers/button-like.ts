/**
 * Keyboard support for an element that acts as a button but can't be a
 * `<button>` (an inline `<span>` chip / badge whose click handler is optional,
 * or a control nested inside another interactive element).
 *
 * Spread the result before `...rest`, so a consumer's own `role` / `tabindex` /
 * `onkeydown` still win:
 *
 * ```svelte
 * <span {...buttonLike(!!onclick)} {...rest} {onclick}>…</span>
 * ```
 */

/** Enter / Space on a `role="button"` element: activates it by synthesising a click. */
export function activateOnEnterOrSpace(event: KeyboardEvent): void {
	if (event.key !== "Enter" && event.key !== " ") return
	if (event.target !== event.currentTarget) return // a nested control handles its own keys
	event.preventDefault() // Space must not scroll the page
	;(event.currentTarget as HTMLElement).click()
}

/** `role="button"`, a tab stop and Enter / Space activation — or nothing when `clickable` is false. */
export function buttonLike(clickable: boolean): {role?: "button"; tabindex?: number; onkeydown?: (event: KeyboardEvent) => void} {
	return clickable ? {role: "button", tabindex: 0, onkeydown: activateOnEnterOrSpace} : {}
}
