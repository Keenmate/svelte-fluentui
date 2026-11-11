/**
 * The shared model for clickable items (menus, toolbars, dialog actions, palette
 * commands, toast actions) and the `onAction` event they fire. A port of
 * `@keenmate/web-components-core/actions` — same names and run order, no dependency.
 */
export type {
	ActionEventDetail,
	ActionInvocation,
	ActionItem,
	ActionSource,
	MenuDivider,
	MenuEntry,
	MenuItem,
	ResolvedActionItem
} from "./types.js"
export {
	createMenuDivider,
	getMenuChildren,
	isMenuDivider,
	normalizeActionItems,
	resolveActionItem,
	resolveMenuEntries,
	runAction
} from "./resolve.js"
export type {ResolvedMenuEntry, RunActionOptions} from "./resolve.js"
