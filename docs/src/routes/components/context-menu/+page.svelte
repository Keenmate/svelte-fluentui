<script lang="ts">
	import {ContextMenu, Stack, Card, Grid, GridItem, QuickGrid, Slider} from "svelte-fluentui"
	import type {MenuEntry} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "items", type: "MenuEntry[]", default: "[]", description: "Menu entries rendered when the child area is right-clicked: items, {divider: true} separators, and items with children (submenu, or an inline section with isExpandable). Same entry shape as <MenuButton>"},
		{name: "disabled", type: "boolean", default: "false", description: "When true, right-clicks fall through to the browser's native context menu as usual"},
		{name: "offsetMenuX", type: "number", default: "8", description: "Horizontal offset (pixels) pushing the menu further right of the cursor. Default 8px keeps the cursor off the first menu item after right-click"},
		{name: "offsetMenuY", type: "number", default: "0", description: "Vertical offset (pixels) pushing the menu further below the cursor. Stacks on top of a small baseline gap"},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the trigger-zone span"}
	]

	const callbacks: Property[] = [
		{name: "onAction", type: "(detail: {x, y, action, id, item, source, sourceEvent}) => void", default: "undefined", description: "Fires after any item ran — one handler for the whole menu; x/y is where the menu opened"},
		{name: "beforeActionCallback", type: "(detail) => unknown", default: "undefined", description: "Called before an item runs; return false (or resolve to false) to cancel"},
		{name: "onOpenChange", type: "(ctx: {open: boolean; x?: number; y?: number}) => void", default: "undefined", description: "Fires when the menu opens (x/y = viewport-relative cursor position) or closes (click-outside, Escape, right-click elsewhere, or an item click)"}
	]

	const slots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "Children rendered inside the right-click trigger zone. The wrapper uses `display: contents` so it doesn't affect layout"}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]

	// --- Demo state ---
	let lastAction = $state("—")
	let lastCursor = $state<{x: number; y: number} | null>(null)
	let blockDelete = $state(false)
	let offsetX = $state(8)
	let offsetY = $state(0)

	function setAction(name: string) {
		lastAction = name
	}

	const fileItems: MenuEntry[] = [
		{text: "Open", icon: "open", onClick: () => setAction("Open")},
		{text: "Rename", icon: "rename", onClick: () => setAction("Rename")},
		{text: "Duplicate", icon: "copy", onClick: () => setAction("Duplicate")},
		{divider: true},
		{text: "Download", icon: "arrow_download", onClick: () => setAction("Download")},
		{text: "Share", icon: "share", onClick: () => setAction("Share")},
		{divider: true},
		{text: "Delete", icon: "delete", isDanger: true, onClick: () => setAction("Delete")}
	]

	const conditionalItems = $derived<MenuEntry[]>([
		{text: "Open", icon: "open", onClick: () => setAction("Open")},
		{text: "Rename", icon: "rename", onClick: () => setAction("Rename")},
		{divider: true},
		{text: "Delete", icon: "delete", isDanger: true, isDisabled: blockDelete, onClick: () => setAction("Delete")}
	])

	// Side-opening submenus — items with `children` (and no `isExpandable` flag)
	// render as submenu triggers that open a floating popover to the right.
	const submenuItems: MenuEntry[] = [
		{text: "New", icon: "add", children: [
			{text: "Document", icon: "document", onClick: () => setAction("New / Document")},
			{text: "Folder", icon: "folder", onClick: () => setAction("New / Folder")},
			{text: "From template", icon: "document_copy", children: [
				{text: "Meeting notes", onClick: () => setAction("New / Template / Meeting notes")},
				{text: "Weekly report", onClick: () => setAction("New / Template / Weekly report")},
				{text: "Empty", onClick: () => setAction("New / Template / Empty")}
			]}
		]},
		{text: "Open", icon: "open", onClick: () => setAction("Open")},
		{text: "Share", icon: "share", children: [
			{text: "Copy link", icon: "link", onClick: () => setAction("Share / Copy link")},
			{text: "Email", icon: "mail", onClick: () => setAction("Share / Email")},
			{text: "Export", icon: "arrow_download", onClick: () => setAction("Share / Export")}
		]},
		{divider: true},
		{text: "Delete", icon: "delete", isDanger: true, onClick: () => setAction("Delete")}
	]

	// Sidebar-style nested menu — two expandable sections ("Form & Inputs",
	// "List") followed by ungrouped items with dividers.
	const navItems: MenuEntry[] = [
		{
			id: "forms",
			text: "Form & Inputs",
			icon: "form",
			isExpandable: true,
			children: [
				{text: "Overview", icon: "form", onClick: () => setAction("Forms / Overview")},
				{text: "Checkbox", icon: "checkbox_checked", onClick: () => setAction("Forms / Checkbox")},
				{text: "Date & Time", icon: "calendar_ltr", onClick: () => setAction("Forms / Date & Time")},
				{text: "InputFile", icon: "arrow_upload", onClick: () => setAction("Forms / InputFile")}
			]
		},
		{
			id: "list",
			text: "List",
			icon: "list",
			isExpandable: true,
			children: [
				{text: "Autocomplete", icon: "edit", onClick: () => setAction("List / Autocomplete")},
				{text: "Combobox", onClick: () => setAction("List / Combobox")},
				{text: "Listbox", icon: "list", onClick: () => setAction("List / Listbox")},
				{text: "Select", icon: "list", onClick: () => setAction("List / Select")},
				{text: "Option", icon: "options", onClick: () => setAction("List / Option")}
			]
		},
		{divider: true},
		{text: "Number Field", icon: "number_symbol", onClick: () => setAction("Number Field")},
		{text: "Radio", icon: "radio_button", onClick: () => setAction("Radio")},
		{text: "Radio Group", icon: "radio_button", onClick: () => setAction("Radio Group")},
		{divider: true},
		{text: "Slider", icon: "options", onClick: () => setAction("Slider")},
		{text: "Switch", icon: "toggle_left", onClick: () => setAction("Switch")},
		{text: "Text Area", icon: "document", onClick: () => setAction("Text Area")},
		{text: "Text Field", icon: "text_t", onClick: () => setAction("Text Field")}
	]

	type ImageItem = {id: number; title: string; color: string}
	let images: ImageItem[] = $state([
		{id: 1, title: "Sunrise", color: "#fda4af"},
		{id: 2, title: "Forest", color: "#86efac"},
		{id: 3, title: "Ocean", color: "#7dd3fc"},
		{id: 4, title: "Desert", color: "#fdba74"}
	])

	function makeImageItems(img: ImageItem): MenuEntry[] {
		return [
			{text: `Preview "${img.title}"`, icon: "eye", onClick: () => setAction(`Preview ${img.title}`)},
			{text: "Favorite", icon: "heart", onClick: () => setAction(`Favorite ${img.title}`)},
			{text: "Share", icon: "share", onClick: () => setAction(`Share ${img.title}`)},
			{divider: true},
			{text: "Delete", icon: "delete", isDanger: true, onClick: () => {
				images = images.filter(i => i.id !== img.id)
				setAction(`Deleted ${img.title}`)
			}}
		]
	}
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="ContextMenu"
		description="Right-click anywhere inside wrapped children to open a floating menu at the cursor, auto-flipping and shifting away from viewport edges."
		keywords="svelte, fluentui, context menu, right click, popup, menu, contextmenu"
	/>

	<h1>ContextMenu</h1>

	<p>
		Right-click anywhere inside the wrapped children to open a floating menu at the
		cursor. Uses the same <code>MenuEntry</code> shape as <code>&lt;MenuButton&gt;</code>
		— text, icon, isDisabled, isVisible, isDanger, onClick, divider entries — and the same
		visual language as QuickGrid's built-in context menu.
	</p>

	<p>
		Positioning is handled by <a href="https://floating-ui.com/" target="_blank" rel="noopener">Floating UI</a>
		so the menu automatically flips away from the viewport edge (right-click near the
		bottom of the screen and it opens upward), shifts horizontally to stay visible,
		and caps its own height when space is tight so it becomes scrollable instead of
		being cut off.
	</p>

	<References links={[
		{label: "FluentUI Web Component", na: true},
		{label: "FluentUI Blazor", na: "Not available in FluentUI Blazor"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Basic usage</h3>
		<p>
			Right-click inside the box below. The browser's native context menu is
			suppressed for this area and ours opens at the cursor.
		</p>
		<ContextMenu items={fileItems} onOpenChange={({open, x, y}) => { if (open && x !== undefined && y !== undefined) lastCursor = {x, y} }}>
			<div class="demo-box">
				<strong>Right-click me</strong>
				<div class="demo-hint">
					The menu opens wherever the cursor is — try the top-left, bottom-right,
					or near the edges of the viewport to see the flip/shift behaviour.
				</div>
			</div>
		</ContextMenu>

		<div class="demo-status">
			Last action: <strong>{lastAction}</strong>
			{#if lastCursor}
				&middot; opened at <code>({lastCursor.x}, {lastCursor.y})</code>
			{/if}
		</div>

		<h3>Side-opening submenus</h3>
		<p>
			Pass <code>children</code> without <code>isExpandable</code> to render an
			item as a submenu trigger — hover (or focus) opens a floating submenu
			to the right. The submenu auto-flips to the left when there's no room on
			the right and can be nested arbitrarily (the <em>New / From template</em>
			item below opens a third level). Hover intent delays (150ms open / 250ms
			close) prevent flicker and let you diagonally swoop from trigger to submenu.
		</p>
		<ContextMenu items={submenuItems}>
			<div class="demo-box">
				<strong>Right-click me</strong>
				<div class="demo-hint">
					Hover <em>New</em> or <em>Share</em> to open submenus; hover
					<em>From template</em> inside New to nest further.
				</div>
			</div>
		</ContextMenu>

		<h3>Expandable sections</h3>
		<p>
			Pass <code>children</code> plus <code>isExpandable: true</code> on a menu item
			to render it as an inline section header. Clicking the chevron expands or
			collapses the nested items in place — ideal for sidebar-style component
			pickers or grouped action lists. Mix expandable sections with regular items
			and dividers freely.
		</p>
		<ContextMenu items={navItems}>
			<div class="demo-box">
				<strong>Right-click me</strong>
				<div class="demo-hint">
					Right-click to open a menu with expandable <em>Form &amp; Inputs</em> and
					<em>List</em> sections at the top, followed by ungrouped items
					separated by dividers. Click a section's chevron to collapse it.
				</div>
			</div>
		</ContextMenu>

		<h3>Offset from cursor</h3>
		<p>
			By default the menu opens right at the click position, which means the
			cursor is sitting on the first menu item. Use
			<code>offsetMenuX</code> and <code>offsetMenuY</code> to push the menu
			away from the cursor so the user doesn't have to move the mouse back to
			click an item.
		</p>

		<div class="offset-controls">
			<label class="offset-field">
				<span>offsetMenuX: <strong>{offsetX}px</strong></span>
				<Slider min={0} max={40} step={1} bind:value={offsetX} style="flex: 1; max-width: 240px;" />
			</label>
			<label class="offset-field">
				<span>offsetMenuY: <strong>{offsetY}px</strong></span>
				<Slider min={0} max={40} step={1} bind:value={offsetY} style="flex: 1; max-width: 240px;" />
			</label>
		</div>

		<ContextMenu items={fileItems} offsetMenuX={offsetX} offsetMenuY={offsetY}>
			<div class="demo-box">
				<strong>Right-click me</strong>
				<div class="demo-hint">
					Adjust the sliders and right-click — the menu will open further away
					from the cursor.
				</div>
			</div>
		</ContextMenu>

		<h3>Conditional items</h3>
		<p>
			Toggle the checkbox below, then right-click the box — the Delete item
			becomes disabled when the lock is on.
		</p>
		<label class="demo-toggle">
			<input type="checkbox" bind:checked={blockDelete} />
			Lock destructive actions (Delete will be disabled)
		</label>

		<ContextMenu items={conditionalItems}>
			<div class="demo-box">
				<strong>Right-click for conditional menu</strong>
			</div>
		</ContextMenu>

		<h3>Per-item menus in a list</h3>
		<p>
			Each item has its own <code>&lt;ContextMenu&gt;</code> with actions tailored to
			the item. Right-click any card to see its own menu; pick Delete to remove it.
		</p>
		<div class="demo-grid">
			{#each images as img (img.id)}
				<ContextMenu items={makeImageItems(img)}>
					<div class="demo-card" style="background: {img.color};">
						<div class="demo-card-title">{img.title}</div>
						<div class="demo-card-hint">right-click</div>
					</div>
				</ContextMenu>
			{/each}
		</div>
		{#if images.length === 0}
			<p>
				<em>All items deleted.</em>
				<button type="button" onclick={() => images = [
					{id: 1, title: "Sunrise", color: "#fda4af"},
					{id: 2, title: "Forest", color: "#86efac"},
					{id: 3, title: "Ocean", color: "#7dd3fc"},
					{id: 4, title: "Desert", color: "#fdba74"}
				]}>Reset</button>
			</p>
		{/if}

		<h3>Disabled trigger</h3>
		<p>
			Set <code>disabled</code> to fall back to the browser's native right-click menu —
			useful when an element should opt out of the custom menu (e.g. an editable
			textarea where users still need Paste/Undo).
		</p>
		<ContextMenu items={fileItems} disabled>
			<div class="demo-box demo-box-disabled">
				<strong>Right-click falls through to the browser menu</strong>
			</div>
		</ContextMenu>
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
</Stack>

<style>
	.demo-box {
		padding: 2rem;
		border: 2px dashed var(--neutral-stroke-rest, #d1d1d1);
		border-radius: 6px;
		text-align: center;
		background: var(--neutral-layer-2);
		min-height: 120px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.5rem;
		user-select: none;
	}

	.demo-hint {
		font-size: 0.85rem;
		color: var(--neutral-foreground-hint);
		max-width: 40em;
		margin: 0 auto;
	}

	.demo-status {
		margin-top: 0.75rem;
		font-size: 0.9rem;
		color: var(--neutral-foreground-hint);
	}

	.demo-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		margin-bottom: 0.75rem;
	}

	.demo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
	}

	.demo-card {
		padding: 1.25rem 1rem;
		border-radius: 6px;
		min-height: 90px;
		color: #1f2937;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		cursor: context-menu;
		user-select: none;
	}

	.demo-card-title {
		font-weight: 600;
	}

	.demo-card-hint {
		font-size: 0.75rem;
		opacity: 0.6;
	}

	.demo-box-disabled {
		border-color: var(--neutral-stroke-hint, #b0b0b0);
		background: transparent;
	}

	.offset-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.offset-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 18rem;
	}

	.offset-field span {
		min-width: 9rem;
	}
</style>
