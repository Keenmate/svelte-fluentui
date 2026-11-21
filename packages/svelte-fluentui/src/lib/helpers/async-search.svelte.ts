import {debounce} from "./debounce.js"

export type AsyncSearchOptions<T> = {
	/**
	 * Produces results for a term. May return them synchronously (local
	 * filtering — applied in the same call, no loading flash) or as a promise.
	 * `signal` aborts when a newer search starts or the search is cancelled.
	 */
	search: (term: string, signal: AbortSignal) => T[] | Promise<T[]>
	/** Receives the results of the latest search only (stale responses are dropped). */
	onResults: (results: T[], term: string) => void
	/** A non-abort failure of the latest search. */
	onError: (error: unknown, term: string) => void
	/** Debounce for `schedule()` in ms (or a getter). `<= 0` runs immediately. */
	delay?: number | (() => number)
}

function isAbortError(error: unknown): boolean {
	return (error as {name?: unknown} | null)?.name === "AbortError"
}

/**
 * Debounced search with an AbortController per request and a stale-response
 * guard: only the latest search ever reaches `onResults` / `onError`. Create it
 * in a component's script and call `cancel()` on unmount.
 */
export class AsyncSearch<T> {
	/** A promise-returning search is in flight. */
	loading = $state(false)
	#waiting = $state(false)
	#seq = 0
	#controller: AbortController | undefined
	#options: AsyncSearchOptions<T>
	#debounced

	constructor(options: AsyncSearchOptions<T>) {
		this.#options = options
		this.#debounced = debounce(
			(term: string) => this.run(term),
			() => this.#delay()
		)
	}

	/** Waiting out the debounce or loading — results for the current input are still coming. */
	get pending(): boolean {
		return this.#waiting || this.loading
	}

	#delay(): number {
		const {delay = 0} = this.#options
		return typeof delay === "function" ? delay() : delay
	}

	/** Searches after the debounce delay (immediately when the delay is `<= 0`). */
	schedule(term: string): void {
		if (this.#delay() <= 0) {
			this.run(term)
			return
		}
		this.#waiting = true
		this.#debounced(term)
	}

	/** Searches now, superseding any pending or in-flight search. */
	run(term: string): void {
		this.#debounced.cancel()
		this.#waiting = false
		this.#controller?.abort()
		const seq = ++this.#seq
		const controller = (this.#controller = new AbortController())
		const isStale = () => seq !== this.#seq || controller.signal.aborted

		let result: T[] | Promise<T[]>
		try {
			result = this.#options.search(term, controller.signal)
		} catch (error) {
			this.loading = false
			this.#options.onError(error, term)
			return
		}
		if (typeof (result as PromiseLike<T[]>)?.then !== "function") {
			this.loading = false
			this.#options.onResults(result as T[], term)
			return
		}

		this.loading = true
		Promise.resolve(result).then(
			(results) => {
				if (isStale()) return
				this.loading = false
				this.#options.onResults(results, term)
			},
			(error) => {
				if (isStale()) return
				this.loading = false
				if (!isAbortError(error)) this.#options.onError(error, term)
			}
		)
	}

	/** Drops the pending debounce and aborts the in-flight search. */
	cancel(): void {
		this.#debounced.cancel()
		this.#waiting = false
		this.#seq++
		this.#controller?.abort()
		this.#controller = undefined
		this.loading = false
	}
}
