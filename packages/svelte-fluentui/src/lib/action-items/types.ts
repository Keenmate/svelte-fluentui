import type {Snippet} from "svelte"

/**
 * Which surface an action was triggered from. The known names keep the vocabulary
 * shared across components; a component may add its own.
 */
export type ActionSource =
	| "menu"
	| "context-menu"
	| "row-toolbar"
	| "dialog"
	| "palette"
	| "toast"
	| "toolbar"
	| "keyboard"
	| (string & {})

/**
 * One clickable item — a menu item, a toolbar button, a dialog action, a palette
 * command. Every dynamic field is a static value plus a separate `get*Callback(ctx)`;
 * the callback wins when both are set. `Ctx` is the surface context the component
 * builds when it renders or opens the surface (the row a context menu opened on, …);
 * `A` is the component's built-in action names.
 *
 * Ported from `@keenmate/web-components-core/actions` (SPEC §12.12) — same field
 * names and run order, Svelte flavour: `icon` may be a snippet, no element context.
 */
export interface ActionItem<Ctx = object, A extends string = string> {
	/** A built-in action name. Omit (or `"custom"`) for your own item, identified by `id`. */
	action?: A | "custom"
	/** Identifies a custom item; reported back in `onAction`. */
	id?: string
	/** Visible label. */
	text?: string
	/** Fluent icon name (as for `<Icon name>`) or a snippet. */
	icon?: string | Snippet
	tooltip?: string
	/** Display hint for a key chord (`"Ctrl+D"`). */
	shortcut?: string
	/** Extra CSS classes on the item. */
	cssClass?: string
	/** Default `true`. */
	isVisible?: boolean
	/** Greyed out, can't be clicked. Default `false`. */
	isDisabled?: boolean
	/** Destructive styling. Default `false`. */
	isDanger?: boolean
	/** Toggle state (rendered as `aria-pressed` / `menuitemcheckbox`). Still clickable. */
	isToggled?: boolean

	getTextCallback?(ctx: Ctx): string
	getIconCallback?(ctx: Ctx): string | Snippet
	getTooltipCallback?(ctx: Ctx): string
	getClassCallback?(ctx: Ctx): string | string[]
	getIsVisibleCallback?(ctx: Ctx): boolean
	getIsDisabledCallback?(ctx: Ctx): boolean
	getIsToggledCallback?(ctx: Ctx): boolean

	/** Runs on click with the surface context plus the invocation fields — the same object `onAction` gets. Awaited. */
	onClick?(detail: ActionEventDetail<Ctx, A>): unknown
}

/** A menu item: an `ActionItem` that may hold child items. */
export interface MenuItem<Ctx = object, A extends string = string> extends ActionItem<Ctx, A> {
	/** Child entries — a submenu (ContextMenu) or an inline section (MenuButton, or `isExpandable`). */
	children?: MenuEntry<Ctx, A>[]
	/** Dynamic / lazy children — wins over `children`. */
	getChildrenCallback?(ctx: Ctx): MenuEntry<Ctx, A>[] | Promise<MenuEntry<Ctx, A>[]>
	/** Render `children` as an inline collapsible section instead of a submenu. */
	isExpandable?: boolean
	/** Initial state of an expandable section. Default `true`. */
	isExpanded?: boolean
	/** Close the menu after this item runs. Default `true`. */
	shouldCloseOnClick?: boolean
}

/** A separator, optionally labelled (a group heading). Create with `createMenuDivider()`. */
export interface MenuDivider {
	divider: true
	text?: string
}

export type MenuEntry<Ctx = object, A extends string = string> = MenuItem<Ctx, A> | MenuDivider

/** The fields an invocation adds to the surface context. */
export interface ActionInvocation<Ctx = object, A extends string = string> {
	/** The built-in name, or `"custom"`. */
	action: A | "custom"
	id?: string
	/** The clicked item. */
	item: ActionItem<Ctx, A>
	source: ActionSource
	/** The DOM event that triggered it, when there was one. */
	sourceEvent?: Event
	/** The element that was activated. */
	triggerElement?: HTMLElement
}

/** What `onAction`, `beforeActionCallback` and an item's `onClick` receive. */
export type ActionEventDetail<Ctx = object, A extends string = string> = Ctx & ActionInvocation<Ctx, A>

/** An `ActionItem` with every field resolved against a context. */
export interface ResolvedActionItem<A extends string = string> {
	action: A | "custom"
	id?: string
	text: string
	icon?: string | Snippet
	tooltip?: string
	shortcut?: string
	/** Space-separated; `""` when none. */
	cssClass: string
	isVisible: boolean
	isDisabled: boolean
	isDanger: boolean
	isToggled: boolean
	/** The item has a toggle state at all (render it as a checkbox-like item). */
	isToggle: boolean
}
