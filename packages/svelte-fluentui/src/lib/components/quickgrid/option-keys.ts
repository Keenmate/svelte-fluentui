/**
 * Value ↔ key layer for the dropdown editors. Select / Combobox / Option work with
 * string values; a cell value may be a number, boolean or object. Every value gets a
 * stable string key — typed, so `1` and `"1"` stay apart; objects by identity — and
 * the key maps back to the original value on commit.
 */

/** The key of `null` / `undefined` (the select editor's `allowEmpty` row). */
export const EMPTY_KEY = "e:"

export class OptionKeys {
	readonly #values = new Map<string, unknown>([[EMPTY_KEY, null]])
	readonly #objectKeys = new Map<unknown, string>()

	keyOf(value: unknown): string {
		if (value === null || value === undefined) return EMPTY_KEY
		let key: string
		switch (typeof value) {
			case "string":
				key = `s:${value}`
				break
			case "number":
				key = `n:${value}`
				break
			case "boolean":
				key = `b:${value}`
				break
			case "bigint":
				key = `i:${value}`
				break
			default: {
				const known = this.#objectKeys.get(value)
				key = known ?? `o:${this.#objectKeys.size}`
				if (!known) this.#objectKeys.set(value, key)
			}
		}
		this.#values.set(key, value)
		return key
	}

	/** The value a key was made from (`undefined` for an unknown key). */
	valueOf(key: string): unknown {
		return this.#values.get(key)
	}
}
