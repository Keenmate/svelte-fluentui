export type Debounced<A extends unknown[]> = {
	(...args: A): void
	/** Drops the pending call, if any. */
	cancel(): void
	/** Whether a call is waiting for its delay. */
	readonly pending: boolean
}

/**
 * Trailing-edge debounce: each call restarts the timer; `fn` runs with the last
 * arguments once `delay` ms pass without a new call. `delay` may be a getter so
 * a prop change applies to the next call. Always async (a 0 delay still waits
 * for a macrotask). Call `cancel()` on unmount.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay: number | (() => number)): Debounced<A> {
	let timer: ReturnType<typeof setTimeout> | undefined

	const debounced = ((...args: A) => {
		if (timer !== undefined) clearTimeout(timer)
		const ms = typeof delay === "function" ? delay() : delay
		timer = setTimeout(
			() => {
				timer = undefined
				fn(...args)
			},
			Math.max(0, ms)
		)
	}) as Debounced<A>

	debounced.cancel = () => {
		if (timer !== undefined) clearTimeout(timer)
		timer = undefined
	}
	Object.defineProperty(debounced, "pending", {get: () => timer !== undefined})

	return debounced
}
