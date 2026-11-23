<script lang="ts">
	import {Button, MenuButton, Stack, Card, Grid, GridItem, QuickGrid, Icon} from "svelte-fluentui"
	import type {MenuEntry} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "items", type: "MenuEntry[]", default: "— (required)", description: "Menu entries rendered as a dropdown when the button is clicked: items and {divider: true} separators."},
		{name: "appearance", type: "string", default: "undefined", description: "Passed through to <fluent-button>. Options: 'accent', 'lightweight', 'outline', 'stealth', 'neutral'."},
		{name: "disabled", type: "boolean", default: "undefined", description: "Disables both the trigger button and opening the menu."},
		{name: "class", type: "string", default: '""', description: "Extra class on the button element."},
		{name: "style", type: "string", default: '""', description: "Inline style on the button element."},
		{name: "position", type: '"bottom" | "top"', default: '"bottom"', description: "Preferred side to open the menu on. Auto-flips to the other side if there's no room."},
		{name: "open", type: "boolean (bindable)", default: "false", description: "Controls the menu's open state. Bind it if you want to open/close from outside."},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the trigger fluent-button"}
	]

	const itemProps: Property[] = [
		{name: "id", type: "string", default: "undefined", description: "Identifies the item; reported back in onAction."},
		{name: "text", type: "string", default: "—", description: "Displayed text of the menu item (or getTextCallback)."},
		{name: "icon", type: "string | Snippet", default: "undefined", description: "Fluent icon name (regular variant) or a snippet, rendered before the text."},
		{name: "isDisabled", type: "boolean", default: "false", description: "Disables the item — the click is ignored and the item is rendered dimmed (or getIsDisabledCallback)."},
		{name: "isVisible", type: "boolean", default: "true", description: "When false, the item is skipped entirely (or getIsVisibleCallback)."},
		{name: "isDanger", type: "boolean", default: "false", description: "Paints the item in the destructive color. Useful for delete/remove actions."},
		{name: "isToggled", type: "boolean", default: "undefined", description: "Makes it a checkable item (menuitemcheckbox) showing this state."},
		{name: "shortcut", type: "string", default: "undefined", description: "Key-chord hint shown at the end (display only)."},
		{name: "shouldCloseOnClick", type: "boolean", default: "true", description: "Close the menu after the item runs."},
		{name: "onClick", type: "(detail) => void | Promise<void>", default: "undefined", description: "Runs when the item is clicked (after beforeActionCallback). Awaited; the menu closes first."},
		{name: "{divider: true, text?}", type: "MenuDivider", default: "—", description: "A separator entry; with text it is a group heading. Leading/trailing/double dividers are dropped."}
	]

	const callbacks: Property[] = [
		{name: "onOpenChange", type: "(ctx: {open: boolean}) => void", default: "undefined", description: "Fires when the menu opens or closes (click-outside, Escape, or an item click)."},
		{name: "onAction", type: "(detail: {action, id, item, source, sourceEvent}) => void", default: "undefined", description: "Fires after any item ran — one handler for the whole menu."},
		{name: "beforeActionCallback", type: "(detail) => unknown", default: "undefined", description: "Called before an item runs; return false (or resolve to false) to cancel."}
	]

	const slots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "Default slot — the button's label / content."},
		{name: "start", type: "Snippet", default: "undefined", description: "Rendered in the button's `start` slot (icon before label)."},
		{name: "end", type: "Snippet", default: "undefined", description: "Rendered in the button's `end` slot (icon after label, e.g. a chevron)."}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]

	// --- Demo state ---
	let lastAction = $state("—")
	let controlledOpen = $state(false)

	function setAction(name: string) {
		lastAction = name
	}

	const basicItems: MenuEntry[] = [
		{text: "Edit", icon: "edit", onClick: () => setAction("Edit")},
		{text: "Duplicate", icon: "copy", onClick: () => setAction("Duplicate")},
		{text: "Share", icon: "share", onClick: () => setAction("Share")},
		{divider: true},
		{text: "Delete", icon: "delete", isDanger: true, onClick: () => setAction("Delete")}
	]

	const withDisabledItems: MenuEntry[] = [
		{text: "Save", icon: "save", onClick: () => setAction("Save")},
		{text: "Save As…", icon: "save_copy", isDisabled: true},
		{text: "Export", icon: "arrow_download", onClick: () => setAction("Export")},
		{divider: true},
		{text: "Archive (coming soon)", icon: "archive", isDisabled: true}
	]

	let allowDelete = $state(false)
	const conditionalItems = $derived<MenuEntry[]>([
		{text: "View", icon: "eye", onClick: () => setAction("View")},
		{text: "Download", icon: "arrow_download", onClick: () => setAction("Download")},
		{divider: true},
		{text: "Delete", icon: "delete", isDanger: true, isVisible: allowDelete, onClick: () => setAction("Delete")}
	])

	async function asyncAction() {
		lastAction = "Running…"
		await new Promise(resolve => setTimeout(resolve, 1500))
		lastAction = "Finished async action"
	}

	const asyncItems: MenuEntry[] = [
		{text: "Sync now", icon: "arrow_sync", onClick: asyncAction},
		{text: "Publish", icon: "rocket", onClick: asyncAction}
	]
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="MenuButton"
		description="A Svelte button that opens a dropdown context menu on click, sharing the same visual language as QuickGrid context menus and Tabs overflow menus."
		keywords="svelte, fluentui, menu button, dropdown, menu, action, popup"
	/>

	<h1>MenuButton</h1>

	<p>
		A button that opens a dropdown context menu on click instead of firing a
		single <code>onclick</code>. Uses the same visual language as the QuickGrid
		context menu and the <code>Tabs</code> <code>responsive="menu"</code> overflow
		dropdown so menus look consistent across the library.
	</p>

	<p>
		The menu is portalled to <code>&lt;body&gt;</code> via
		<code>PositioningRegion</code> so it escapes ancestor stacking contexts. It
		opens below the button by default and auto-flips to above when there isn't
		enough room below.
	</p>

	<References links={[
		{label: "FluentUI Web Component", na: true},
		{label: "FluentUI Blazor", na: "Not available in FluentUI Blazor"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Basic usage</h3>
		<p>
			Pass an array of <code>items</code>. Click the button to open, click an
			item to run its <code>onClick</code>; the menu auto-closes first.
			Use <code>isDanger</code> for destructive actions and <code>{'{'}divider: true{'}'}</code> entries
			to group them.
		</p>
		<div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
			<MenuButton appearance="accent" items={basicItems}>
				Actions
			</MenuButton>

			<MenuButton appearance="outline" items={basicItems}>
				Outline
			</MenuButton>

			<MenuButton appearance="stealth" items={basicItems}>
				{#snippet start()}<Icon name="more_horizontal" size={16} />{/snippet}
				More
			</MenuButton>

			<span style="margin-left: auto; color: var(--neutral-foreground-hint);">
				Last action: <strong>{lastAction}</strong>
			</span>
		</div>

		<h3>Disabled items</h3>
		<p>
			Individual items can be disabled — they render dimmed and their
			<code>onClick</code> is ignored.
		</p>
		<MenuButton items={withDisabledItems}>File</MenuButton>

		<h3>Conditional visibility</h3>
		<p>
			Set <code>isVisible: false</code> on an item to omit it entirely — useful for
			permission-based menus. Toggle the checkbox below and reopen the menu to
			see the Delete item appear.
		</p>
		<div style="display: flex; align-items: center; gap: 1rem;">
			<label style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer;">
				<input type="checkbox" bind:checked={allowDelete} />
				Allow delete
			</label>
			<MenuButton appearance="neutral" items={conditionalItems}>
				Document
			</MenuButton>
		</div>

		<h3>Async item handler</h3>
		<p>
			<code>onClick</code> can return a promise. The menu closes immediately
			but you can safely perform async work after.
		</p>
		<MenuButton items={asyncItems}>Run</MenuButton>

		<h3>Controlled open state</h3>
		<p>
			Use <code>bind:open</code> to control the menu from outside — useful for
			closing it in response to some external event, or for imperatively opening
			it (e.g. from a keyboard shortcut).
		</p>
		<div style="display: flex; gap: 1rem; align-items: center;">
			<MenuButton bind:open={controlledOpen} items={basicItems} appearance="accent">
				Controlled
			</MenuButton>
			<Button onclick={() => controlledOpen = !controlledOpen}>
				Toggle from outside (currently {controlledOpen ? "open" : "closed"})
			</Button>
		</div>

		<h3>Open upward</h3>
		<p>
			Set <code>position="top"</code> to prefer opening above the button. The
			menu still auto-flips to below if there's no room above.
		</p>
		<div style="padding-top: 10rem;">
			<MenuButton position="top" items={basicItems} appearance="accent">
				Opens upward
			</MenuButton>
		</div>
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Properties</h2>
				<QuickGrid items={properties} columns={propertyColumns} />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Callbacks</h2>
				<QuickGrid items={callbacks} columns={propertyColumns} />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Slots</h2>
				<QuickGrid items={slots} columns={propertyColumns} />
			</Card>
		</GridItem>
	</Grid>

	<Card>
		<h2>MenuEntry</h2>
		<p>Shape of each entry in the <code>items</code> array.</p>
		<QuickGrid items={itemProps} columns={propertyColumns} />
	</Card>
</Stack>
