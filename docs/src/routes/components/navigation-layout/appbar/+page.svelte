<script lang="ts">
	import {AppBar, AppBarItem, ResourcesIcon, QuickGrid, Stack, Grid, GridItem, Card, Switch} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"
	import {AppBarOrientation} from "svelte-fluentui/constants"

	// Overflow demo
	let showSearch = $state(true)
	let vertical = $state(true)
	let activeApp = $state("Console")
	const apps = [
		{label: "Resources", count: 0},
		{label: "Console", count: 2},
		{label: "Logs", count: 4},
		{label: "Traces", count: 0},
		{label: "Metrics", count: 0},
		{label: "Settings", count: 0},
		{label: "Help", count: 0}
	]

	// Regular / horizontal demos: clicking an item makes it the active one.
	let activeRegular = $state("Home")
	let activeHorizontal = $state("Item 1")

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const appBarProperties: Property[] = [
		{name: "orientation", type: '"horizontal" | "vertical"', default: '"vertical"', description: "AppBar orientation. Vertical fills its container's height, horizontal its width."},
		{name: "showSearch", type: "boolean", default: "false", description: "Search field in the overflow popover. A term searches every item (visible ones too), matched with searchBehavior."},
		{name: "searchBehavior", type: '"normalized" | "case-insensitive" | "exact"', default: '"normalized"', description: "How the popover search matches item labels (normalized ignores case and diacritics)"},
		{name: "labels", type: "AppBarLabels", default: "undefined", description: "Overrides of the built-in text (svelteFluentUI.appBar.* keys: moreItemsTooltip, moreItemsAriaLabel, popupAriaLabel, searchPlaceholder, searchAriaLabel, noResults) for this instance"},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the root nav"}
	]

	const appBarCallbacks: Property[] = [
		{name: "onOverflowOpenChange", type: "(ctx: {open: boolean}) => void", default: "undefined", description: "Fires when the overflow popover opens or closes"}
	]

	const appBarSlots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "AppBarItem components"}
	]

	const appBarItemProperties: Property[] = [
		{name: "href", type: "string", default: "undefined", description: "URL — renders the item as a link. Without it the item is a <button type=\"button\"> (keyboard-operable onclick items)."},
		{name: "count", type: "number", default: "undefined", description: "Counter badge on the icon (danger fill, top end corner). Hidden when 0 or undefined. The full count is appended to the link's accessible name as visually hidden text (and to a consumer aria-label / aria-labelledby). Restyle via the --fluent-appbar-count-* CSS variables."},
		{name: "maxCount", type: "number", default: "99", description: "Largest count shown verbatim; above it the badge reads e.g. \"99+\". The accessible name always carries the full count."},
		{name: "countLabel", type: "(count: number) => string", default: "undefined", description: "Localisable wording for the count in the accessible name, e.g. (count) => `${count} unread`. Receives the full, uncapped count. Default: the bare number."},
		{name: "active", type: "boolean", default: "undefined", description: "Marks the item as active: accent indicator on the start edge (vertical) or the bottom (horizontal), and the icon-active icon. Controlled by the app, e.g. from the current route."},
		{name: "tooltip", type: "string", default: "undefined", description: "Tooltip on hover / focus, beside a vertical bar and below a horizontal one"},
		{name: "class", type: "string", default: "undefined", description: "Additional CSS class"},
		{name: "...rest", type: "HTMLAnchorAttributes", default: "-", description: "Other native and anchor attributes (target, rel, download, hreflang, title, aria-*, data-*, …) and DOM events (lowercase onclick, onkeydown, …) are forwarded untouched to the inner a"}
	]

	const appBarItemCallbacks: Property[] = [
		{name: "onclick", type: "(ev: MouseEvent) => void", default: "undefined", description: "Native click event, forwarded untouched"}
	]

	const appBarItemSlots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "Item label content"},
		{name: "icon", type: "Snippet", default: "undefined", description: "Icon rendered above the label. Two SVGs marked part=icon-rest / part=icon-active swap on hover and while active."}
	]

	const appBarItemCssVariables: Property[] = [
		{name: "--fluent-appbar-background", type: "color", default: "var(--neutral-layer-2)", description: "Bar background"},
		{name: "--fluent-appbar-item-size", type: "number", default: "68", description: "Item width in px (unitless); the item height derives from it"},
		{name: "--fluent-appbar-item-block-size", type: "length", default: "item size - 5 design units", description: "Item (and more button) height"},
		{name: "--fluent-appbar-padding-block", type: "length", default: "1 design unit", description: "Block padding of the item strip (room for the count badge above the first icon)"},
		{name: "--fluent-appbar-indicator-color", type: "color", default: "var(--accent-fill-rest)", description: "Active indicator colour"},
		{name: "--fluent-appbar-popover-padding", type: "length", default: "2 design units", description: "Overflow popover padding"},
		{name: "--fluent-appbar-popover-gap", type: "length", default: "2 design units", description: "Gap between the popover search and the tiles"},
		{name: "--fluent-appbar-count-bg", type: "color", default: "var(--fluent-color-danger)", description: "Count badge fill"},
		{name: "--fluent-appbar-count-text", type: "color", default: "var(--fluent-color-danger-contrast)", description: "Count badge text colour"},
		{name: "--fluent-appbar-count-ring-color", type: "color", default: "var(--fluent-appbar-background)", description: "1px ring separating the badge from the icon"},
		{name: "--fluent-appbar-count-size", type: "length", default: "16px", description: "Badge height, minimum width and line height"},
		{name: "--fluent-appbar-count-font-size", type: "length", default: "10px", description: "Badge text size"},
		{name: "--fluent-appbar-count-font-weight", type: "number", default: "600", description: "Badge text weight"},
		{name: "--fluent-appbar-count-padding-inline", type: "length", default: "4px", description: "Inline padding (matters for multi-digit counts)"},
		{name: "--fluent-appbar-count-radius", type: "length", default: "9999px", description: "Badge corner radius (pill by default)"},
		{name: "--fluent-appbar-count-offset-block", type: "length", default: "-6px", description: "Offset from the icon's top edge (inset-block-start)"},
		{name: "--fluent-appbar-count-overlap", type: "length", default: "8px", description: "How far the badge reaches over the icon's end edge; longer counts grow outward (flips in RTL)"}
	]

	const unreadLabel = (count: number) => `${count} unread`
	const czechLabel = (count: number) => `${count} nepřečtených`

	const countBadgeCode = [
		`<AppBarItem href="/inbox" icon={inboxIcon} count={unread}`,
		`            countLabel={(count) => \`\${count} unread\`}>Inbox</AppBarItem>`,
		``,
		`<AppBar class="accent-count">…</AppBar>`,
		``,
		`.accent-count {`,
		`  --fluent-appbar-count-bg: var(--accent-fill-rest);`,
		`  --fluent-appbar-count-text: var(--foreground-on-accent-rest);`,
		`  --fluent-appbar-count-size: 18px;`,
		`  --fluent-appbar-count-font-size: 11px;`,
		`  --fluent-appbar-count-radius: 4px;`,
		`  --fluent-appbar-count-offset-block: -8px;`,
		`}`
	].join("\n")

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]
</script>

{#snippet commonItemIcon()}
	<ResourcesIcon aria-hidden="true" part="icon-rest" />
	<ResourcesIcon aria-hidden="true" part="icon-active" active />
{/snippet}

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="AppBar"
		description="A persistent application bar of icon-and-label items for top-level Svelte navigation, rendered vertically or horizontally. Inspired by FluentUI Blazor."
		keywords="svelte, fluentui, appbar, app bar, navigation, sidebar, layout"
	/>

	<h1>AppBar</h1>

	<p>
		A persistent application bar of icon-and-label items rendered vertically or horizontally, typically
		used for top-level navigation. Inspired by the FluentUI Blazor AppBar component.
	</p>

	<References links={[
		{label: "AppBar", custom: true},
		{label: "FluentUI Blazor", href: "https://www.fluentui-blazor.net/AppBar"}
	]} />

	<Card>
		<h2 id="examples">Examples</h2>
		<div class="examples-container">
			<div class="example-item">
				<h3>Regular AppBar</h3>
				<p>
					Click an item to make it active. "Microsoft" is an external link (new tab); "Home" and "Item 4" are
					links (<code>href</code>); "Item 2" and "Item 5" have only <code>onclick</code>, so they render as
					buttons. "Item 2" and "Item 4" show the <code>count</code> badge (250 is capped to "99+" by
					<code>maxCount</code>).
				</p>

				<Stack verticalAlign="start" horizontalAlign="start">
					<AppBar>
						<AppBarItem href="https://microsoft.com" rel="noopener noreferrer" target="_blank" icon={commonItemIcon}>
							Microsoft
						</AppBarItem>
						<AppBarItem href="#examples" icon={commonItemIcon} active={activeRegular === "Home"} onclick={() => (activeRegular = "Home")}>
							Home
						</AppBarItem>
						<AppBarItem icon={commonItemIcon} count={3} active={activeRegular === "Item 2"} onclick={() => (activeRegular = "Item 2")}>
							Item 2
						</AppBarItem>
						<AppBarItem href="#examples" icon={commonItemIcon} count={250} active={activeRegular === "Item 4"} onclick={() => (activeRegular = "Item 4")}>
							Item 4
						</AppBarItem>
						<AppBarItem icon={commonItemIcon} active={activeRegular === "Item 5"} onclick={() => (activeRegular = "Item 5")}>
							Item 5
						</AppBarItem>
					</AppBar>
				</Stack>
			</div>
			<div class="example-item">
				<h3>Horizontal AppBar menu</h3>
				<p>Click an item to make it active; hover for its <code>tooltip</code>.</p>

				<Stack verticalAlign="start" horizontalAlign="start">
					<AppBar orientation={AppBarOrientation.Horizontal}>
						{#each ["Item 1", "Item 2", "Item 3"] as label (label)}
							<AppBarItem
								tooltip="{label} tooltip"
								icon={commonItemIcon}
								active={activeHorizontal === label}
								onclick={() => (activeHorizontal = label)}
							>{label}</AppBarItem>
						{/each}
					</AppBar>
				</Stack>
			</div>
		</div>
	</Card>

	<Card>
		<h2 id="overflow">Overflow and active item</h2>
		<p>
			Drag the corner of the box to make it smaller. Items that don't fit move into the <strong>…</strong>
			popover (in order); with <code>showSearch</code> its search field finds any item, visible ones too. The
			active item has the accent indicator on the bar's start edge (bottom when horizontal); click an item to
			move it.
		</p>
		<Stack orientation="horizontal" gap="1.5rem">
			<Switch bind:checked={showSearch} label="Show search in popover" />
			<Switch bind:checked={vertical} label="Vertical" />
		</Stack>
		<div class="resizable-box" class:horizontal={!vertical}>
			<AppBar orientation={vertical ? "vertical" : "horizontal"} {showSearch}>
				{#each apps as app (app.label)}
					<AppBarItem
						href="#overflow"
						icon={commonItemIcon}
						count={app.count}
						active={activeApp === app.label}
						tooltip={app.label}
						onclick={() => (activeApp = app.label)}
					>{app.label}</AppBarItem>
				{/each}
			</AppBar>
		</div>
	</Card>

	<Card>
		<h2 id="count-badge">Count badge</h2>
		<p>
			<code>count</code> shows a small badge on the icon; it is hidden at 0 / undefined and capped at
			<code>maxCount</code> (default 99, so 250 reads "99+"). The badge itself is <code>aria-hidden</code>;
			screen readers hear the full, uncapped count appended to the item's name. <code>countLabel</code>
			words it for your locale, and a consumer <code>aria-label</code> keeps the count too
			(e.g. "Mailbox, 3 unread").
		</p>
		<div class="examples-container">
			<div class="example-item">
				<h3>Default, capped, maxCount</h3>
				<AppBar>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={3}>Inbox</AppBarItem>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={250}>Alerts</AppBarItem>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={42} maxCount={9}>Tasks</AppBarItem>
				</AppBar>
				<p class="caption">3 &middot; 250 → "99+" &middot; 42 with <code>maxCount=&#123;9&#125;</code> → "9+"</p>
			</div>
			<div class="example-item">
				<h3>countLabel and aria-label</h3>
				<AppBar>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={3} countLabel={unreadLabel}>Inbox</AppBarItem>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={120} countLabel={czechLabel}>Pošta</AppBarItem>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={3} countLabel={unreadLabel} aria-label="Mailbox">Mail</AppBarItem>
				</AppBar>
				<p class="caption">Accessible names: "Inbox, 3 unread" &middot; "Pošta, 120 nepřečtených" &middot; "Mailbox, 3 unread"</p>
			</div>
			<div class="example-item">
				<h3>Restyled via CSS variables</h3>
				<AppBar class="accent-count">
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={5}>Errors</AppBarItem>
					<AppBarItem href="#count-badge" icon={commonItemIcon} count={1234} maxCount={999}>Logs</AppBarItem>
				</AppBar>
				<p class="caption">Accent fill, larger badge, square-ish corners</p>
			</div>
		</div>
		<pre class="code">{countBadgeCode}</pre>
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>AppBar Properties</h2>
				<QuickGrid items={appBarProperties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>AppBar Callbacks</h2>
				<QuickGrid items={appBarCallbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>AppBar Slots</h2>
				<QuickGrid items={appBarSlots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>AppBarItem Properties</h2>
				<QuickGrid items={appBarItemProperties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>AppBarItem Callbacks</h2>
				<QuickGrid items={appBarItemCallbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>AppBarItem Slots</h2>
				<QuickGrid items={appBarItemSlots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12}>
			<Card>
				<h2 id="css-variables">AppBarItem CSS Variables</h2>
				<p>Count badge styling. Set them on the AppBar, an AppBarItem (via <code>class</code>) or any ancestor.</p>
				<QuickGrid items={appBarItemCssVariables} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>
</Stack>

<style>
	.component-name {
		font-family: monospace;
	}

	.examples-container {
		display: flex;
		gap: 1rem;
	}

	.example-item {
		flex: 1;
	}

	.resizable-box {
		block-size: 260px;
		inline-size: fit-content;
		min-block-size: 120px;
		margin-block-start: 1rem;
		padding: calc(var(--design-unit) * 2px);
		overflow: hidden;
		resize: vertical;
		border: 1px solid var(--neutral-stroke-rest);
		border-radius: calc(var(--control-corner-radius) * 1px);
	}

	.resizable-box.horizontal {
		block-size: auto;
		inline-size: 360px;
		min-inline-size: 160px;
		max-inline-size: 100%;
		resize: horizontal;
	}

	.caption {
		font-size: 12px;
		color: var(--neutral-foreground-hint);
	}

	.code {
		padding: 0.75rem;
		overflow-x: auto;
		background: var(--neutral-layer-2);
		border-radius: 4px;
		font-size: 12px;
	}

	:global(.accent-count) {
		--fluent-appbar-count-bg: var(--accent-fill-rest);
		--fluent-appbar-count-text: var(--foreground-on-accent-rest);
		--fluent-appbar-count-size: 18px;
		--fluent-appbar-count-font-size: 11px;
		--fluent-appbar-count-radius: 4px;
		--fluent-appbar-count-offset-block: -8px;
	}
</style>
