import type {ActionInvocation, ActionItem, MenuDivider, MenuEntry, MenuItem, ResolvedActionItem} from "./types.js"

function report(field: string, error: unknown): void {
	console.error(`[svelte-fluentui] action item ${field} threw — using the static value`, error)
}

/** Call `cb(ctx)` if set; a throw is logged and falls back to `undefined`. */
function call<Ctx, R>(cb: ((ctx: Ctx) => R) | undefined, ctx: Ctx, field: string): R | undefined {
	if (typeof cb !== "function") return undefined
	try {
		return cb(ctx)
	} catch (error) {
		report(field, error)
		return undefined
	}
}

function classList(value: string | string[] | undefined): string {
	if (!value) return ""
	return (Array.isArray(value) ? value : [value])
		.flatMap((c) => c.split(/\s+/))
		.filter(Boolean)
		.join(" ")
}

/**
 * Resolve every field of an item against `ctx`: the `get*Callback` wins, else the
 * static field, else `defaults` (a component's built-in state), else the base default.
 */
export function resolveActionItem<Ctx, A extends string>(
	item: ActionItem<Ctx, A>,
	ctx: Ctx,
	defaults: Partial<ResolvedActionItem<A>> = {}
): ResolvedActionItem<A> {
	const cbClass = call(item.getClassCallback, ctx, "getClassCallback")
	return {
		action: item.action ?? defaults.action ?? "custom",
		id: item.id ?? defaults.id,
		text: call(item.getTextCallback, ctx, "getTextCallback") ?? item.text ?? defaults.text ?? "",
		icon: call(item.getIconCallback, ctx, "getIconCallback") ?? item.icon ?? defaults.icon,
		tooltip: call(item.getTooltipCallback, ctx, "getTooltipCallback") ?? item.tooltip ?? defaults.tooltip,
		shortcut: item.shortcut ?? defaults.shortcut,
		cssClass: cbClass !== undefined ? classList(cbClass) : classList(item.cssClass ?? defaults.cssClass),
		isVisible:
			call(item.getIsVisibleCallback, ctx, "getIsVisibleCallback") ?? item.isVisible ?? defaults.isVisible ?? true,
		isDisabled:
			call(item.getIsDisabledCallback, ctx, "getIsDisabledCallback") ?? item.isDisabled ?? defaults.isDisabled ?? false,
		isDanger: item.isDanger ?? defaults.isDanger ?? false,
		isToggled:
			call(item.getIsToggledCallback, ctx, "getIsToggledCallback") ?? item.isToggled ?? defaults.isToggled ?? false,
		isToggle:
			item.isToggled !== undefined ||
			typeof item.getIsToggledCallback === "function" ||
			defaults.isToggled !== undefined ||
			defaults.isToggle === true
	}
}

/** A separator entry, optionally labelled. */
export function createMenuDivider(text?: string): MenuDivider {
	return text === undefined ? {divider: true} : {divider: true, text}
}

export function isMenuDivider(entry: unknown): entry is MenuDivider {
	return typeof entry === "object" && entry !== null && (entry as MenuDivider).divider === true
}

/** Expand the string shorthand for built-ins: `["add", {id: "x", text: "X"}]` → `[{action: "add"}, {id: "x", text: "X"}]`. */
export function normalizeActionItems<T extends ActionItem<any, any>>(
	items: readonly (string | T | null | undefined | false)[] | null | undefined
): T[] {
	const out: T[] = []
	for (const entry of items ?? []) {
		if (!entry) continue // a conditional item (`cond && item`) that resolved to nothing
		out.push(typeof entry === "string" ? ({action: entry} as T) : entry)
	}
	return out
}

export type ResolvedMenuEntry<Ctx, A extends string> =
	| {kind: "item"; item: MenuItem<Ctx, A>; resolved: ResolvedActionItem<A>; hasChildren: boolean}
	| {kind: "divider"; text?: string}

/**
 * Resolve a menu level: hidden items are dropped, then dividers are trimmed — no
 * leading (unless labelled: a group heading) or trailing divider, no two in a row.
 */
export function resolveMenuEntries<Ctx, A extends string>(
	entries: readonly (MenuEntry<Ctx, A> | string | null | undefined | false)[] | null | undefined,
	ctx: Ctx,
	defaults?: (item: MenuItem<Ctx, A>) => Partial<ResolvedActionItem<A>> | undefined
): ResolvedMenuEntry<Ctx, A>[] {
	const out: ResolvedMenuEntry<Ctx, A>[] = []
	for (const raw of entries ?? []) {
		if (!raw) continue
		const entry = typeof raw === "string" ? ({action: raw} as MenuItem<Ctx, A>) : raw
		if (isMenuDivider(entry)) {
			const last = out[out.length - 1]
			if (!last) {
				if (entry.text !== undefined) out.push({kind: "divider", text: entry.text})
				continue
			}
			const divider: ResolvedMenuEntry<Ctx, A> =
				entry.text === undefined
					? {kind: "divider", ...(last.kind === "divider" && last.text !== undefined ? {text: last.text} : {})}
					: {kind: "divider", text: entry.text}
			if (last.kind === "divider") out[out.length - 1] = divider
			else out.push(divider)
			continue
		}
		const resolved = resolveActionItem(entry, ctx, defaults?.(entry))
		if (!resolved.isVisible) continue
		const hasChildren = typeof entry.getChildrenCallback === "function" || !!entry.children?.length
		out.push({kind: "item", item: entry, resolved, hasChildren})
	}
	while (out.length && out[out.length - 1]!.kind === "divider") out.pop()
	return out
}

/** A menu item's children: `getChildrenCallback` (may be async) wins over `children`. */
export async function getMenuChildren<Ctx, A extends string>(
	item: MenuItem<Ctx, A>,
	ctx: Ctx
): Promise<MenuEntry<Ctx, A>[]> {
	if (typeof item.getChildrenCallback === "function") {
		try {
			return (await item.getChildrenCallback(ctx)) ?? []
		} catch (error) {
			report("getChildrenCallback", error)
			return item.children ?? []
		}
	}
	return item.children ?? []
}

// Running activations per host (component instance), keyed by item id (or object).
const busy = new WeakMap<object, Set<unknown>>()

function busyKey(item: object): unknown {
	const id = (item as {id?: unknown}).id
	return typeof id === "string" && id !== "" ? `id:${id}` : item
}

export type RunActionOptions<D extends ActionInvocation<any, any>> = {
	/** The surface context plus the invocation fields. */
	detail: D
	/** Any object identifying the component instance — scopes the busy state. */
	host: object
	/** `false` (or a Promise resolving to `false`) cancels everything; a throw cancels and is logged. */
	beforeActionCallback?: ((detail: D) => unknown) | null
	/** The built-in behaviour for `detail.action`, if any. */
	runBuiltIn?(detail: D): void | Promise<void>
	/** Fire the component's `onAction` (after the built-in). */
	emitAction?(detail: D): void
}

/**
 * Run one activation in the shared order: `beforeActionCallback` (`false` cancels —
 * nothing else runs) → the item's `onClick` → the built-in → `onAction`. `onAction`
 * is a notification after the fact. A throwing `onClick` / built-in is logged and the
 * event still fires. The item is busy while it runs (a second activation is ignored,
 * the trigger gets `aria-busy`). Resolves `false` when cancelled, disabled or busy.
 */
export async function runAction<D extends ActionInvocation<any, any>>(opts: RunActionOptions<D>): Promise<boolean> {
	const {detail, host} = opts
	const item = detail.item as ActionItem<any, any>
	const disabled = call(item.getIsDisabledCallback, detail, "getIsDisabledCallback") ?? item.isDisabled
	if (disabled === true) return false

	let running = busy.get(host)
	if (!running) busy.set(host, (running = new Set()))
	const key = busyKey(item as object)
	if (running.has(key)) return false
	running.add(key)
	const trigger = detail.triggerElement
	const previousBusy = trigger?.getAttribute("aria-busy") ?? null
	trigger?.setAttribute("aria-busy", "true")
	try {
		if (opts.beforeActionCallback) {
			try {
				if ((await opts.beforeActionCallback(detail)) === false) return false
			} catch (error) {
				console.error("[svelte-fluentui] beforeActionCallback threw — action cancelled", error)
				return false
			}
		}
		if (typeof item.onClick === "function") {
			try {
				await item.onClick(detail)
			} catch (error) {
				console.error("[svelte-fluentui] action item onClick threw", error)
			}
		}
		if (opts.runBuiltIn) {
			try {
				await opts.runBuiltIn(detail)
			} catch (error) {
				console.error(`[svelte-fluentui] built-in action "${detail.action}" threw`, error)
			}
		}
		try {
			opts.emitAction?.(detail)
		} catch (error) {
			console.error(`[svelte-fluentui] onAction handler for "${detail.action}" threw`, error)
		}
		return true
	} finally {
		running.delete(key)
		if (previousBusy === null) trigger?.removeAttribute("aria-busy")
		else trigger?.setAttribute("aria-busy", previousBusy)
	}
}

/**
 * Activation for an `<a>` item whose navigation `beforeActionCallback` must be able to veto.
 * Attach the returned handler with `onclickcapture` (so it runs before the host router):
 * it cancels the native click while `run()` decides, then replays the click once it
 * resolved `true`, letting the router handle the navigation as usual.
 */
export function createLinkActivation() {
	const allowed = new WeakSet<HTMLElement>()
	return async function activate(event: MouseEvent, run: () => Promise<boolean>, canVeto: boolean): Promise<boolean> {
		const anchor = event.currentTarget as HTMLElement
		if (allowed.has(anchor)) {
			// The replayed click: let it through untouched.
			allowed.delete(anchor)
			return false
		}
		if (canVeto) event.preventDefault()
		const ran = await run()
		if (ran && canVeto) {
			allowed.add(anchor)
			anchor.click()
		}
		return ran
	}
}
