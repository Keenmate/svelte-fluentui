<script lang="ts">
	import {NavMenu, NavGroup, NavLinkItem, QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	function onNavClick(ev: Event) {
		console.log("Nav link/group clicked", ev)
	}

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const navMenuProperties: Property[] = [
		{name: "width", type: "string", default: "undefined", description: "Explicit NavMenu width. Defaults to 100% of parent"},
		{name: "collapsed", type: "boolean", default: "undefined", description: "Collapsed state (bindable). Shrinks the menu to a narrow rail"},
		{name: "collapsible", type: "boolean", default: "undefined", description: "Show a collapse/expand button at the top of the menu"},
		{name: "class", type: "string", default: "undefined", description: "Additional CSS class"},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the root div role=menu"}
	]

	const navMenuCallbacks: Property[] = []

	const navMenuSlots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "NavLinkItem, NavGroup and nested NavMenu components"}
	]

	const navGroupProperties: Property[] = [
		{name: "persistKey", type: "string", default: "undefined", description: "Opt-in persistence of the expanded state in localStorage (map under \"svelte-fluentui-nav-state\", keyed by persistKey). Omit to disable persistence. 2.0: replaces the implicit persistence via title; set persistKey to your old title value to keep previously saved state."},
		{name: "title", type: "string", default: "undefined", description: "Native tooltip attribute on the outer NavItem div. Plain attribute since 2.0 (no longer a persistence key)."},
		{name: "expanded", type: "boolean", default: "false", description: "Expanded state (bindable)"},
		{name: "disabled", type: "boolean", default: "undefined", description: "Disables the group and all its children"},
		{name: "class", type: "string", default: "undefined", description: "Additional CSS class"},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the outer NavItem div"}
	]

	const navGroupCallbacks: Property[] = []

	const navGroupSlots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "NavLinkItem or nested NavGroup components"},
		{name: "linkIcon", type: "Snippet", default: "undefined", description: "Icon rendered at the start of the group header"},
		{name: "linkText", type: "Snippet", default: "undefined", description: "Custom header text content"}
	]

	const navLinkItemProperties: Property[] = [
		{name: "href", type: "string", default: "undefined", description: "URL — renders the item as a link"},
		{name: "rel", type: "string", default: "undefined", description: "Link rel attribute"},
		{name: "target", type: "string", default: "undefined", description: "Link target attribute"},
		{name: "title", type: "string", default: "undefined", description: "Tooltip text (useful in collapsed mode)"},
		{name: "disabled", type: "boolean", default: "undefined", description: "Disables the item"},
		{name: "group", type: "boolean", default: "undefined", description: "Style the item as a group header"},
		{name: "linkProps", type: "HTMLAnchorAttributes", default: "undefined", description: "Attributes and events spread on the inner link element (the a, or a div without href): download, hreflang, referrerpolicy, aria-current, data-*, onkeydown, … Top-level href / rel / target / title win over the same keys here."},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (class, style, lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the outer NavItem div role=menuitem; use linkProps for the inner link"}
	]

	const linkPropsCode = [
		`<NavLinkItem href={csvDataUrl} linkProps={{download: "sample.csv"}}>`,
		`  Download sample.csv`,
		`</NavLinkItem>`,
		`<NavLinkItem href="https://github.com" linkProps={{target: "_blank", rel: "noopener noreferrer"}}>`,
		`  GitHub (new tab)`,
		`</NavLinkItem>`
	].join("\n")

	const csvDataUrl = "data:text/csv;charset=utf-8," + encodeURIComponent("name,value\nalpha,1\nbeta,2\n")

	const navLinkItemCallbacks: Property[] = [
		{name: "onclick", type: "(ev: MouseEvent) => void", default: "undefined", description: "Native click event, forwarded untouched"},
		{name: "linkAction", type: "(node: HTMLElement) => void", default: "undefined", description: "Svelte action invoked on the underlying link element"}
	]

	const navLinkItemSlots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "Link label content"},
		{name: "icon", type: "Snippet", default: "undefined", description: "Icon rendered before the label"},
		{name: "afterText", type: "Snippet", default: "undefined", description: "Content rendered after the label (e.g. badges)"}
	]

	const navItemProperties: Property[] = [
		{name: "disabled", type: "boolean", default: "undefined", description: "Disables the item"},
		{name: "group", type: "boolean", default: "undefined", description: "Style the item as a group header"},
		{name: "class", type: "string", default: "undefined", description: "Additional CSS class"},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the root div role=menuitem"}
	]

	const navItemCallbacks: Property[] = [
		{name: "onclick", type: "(ev: MouseEvent) => void", default: "undefined", description: "Native click event, forwarded untouched"}
	]

	const navItemSlots: Property[] = [
		{name: "children", type: "Snippet", default: "undefined", description: "Generic item content"}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="Navigation"
		description="Svelte navigation primitives — NavMenu, NavGroup, NavLinkItem, and NavItem — for building sidebar and grouped navigation menus."
		keywords="svelte, fluentui, navigation, navmenu, navgroup, navlinkitem, sidebar"
	/>

	<h1>Navigation</h1>

	<p>
		The Navigation system is composed of several building blocks:
		<span class="component-name">NavMenu</span>,
		<span class="component-name">NavGroup</span>,
		<span class="component-name">NavLinkItem</span>, and
		<span class="component-name">NavItem</span>.
	</p>

	<References links={[
		{label: "NavMenu", custom: true},
		{label: "FluentUI Blazor", href: "https://www.fluentui-blazor.net/NavMenu"}
	]} />

	<Card>
		<h2>Examples</h2>
		<div class="examples-container">
			<div class="example-item">
				<h3>Regular nav menu</h3>
				<p>"Item 6" sets <code>persistKey</code>, so its expanded state survives a reload; the other groups reset.</p>

				<NavMenu width="250px">
					<NavLinkItem href="https://microsoft.com" rel="noopener noreferrer" target="_blank">
						Microsoft
					</NavLinkItem>

					<NavLinkItem href="/">
						Home
					</NavLinkItem>
					<NavLinkItem href="/NavMenu">Item 2</NavLinkItem>
					<NavGroup>
						{#snippet linkText()}
							<h3>Item 3</h3>
						{/snippet}

						<NavLinkItem onclick={onNavClick}>
							Item 3.1
						</NavLinkItem>
						<NavLinkItem onclick={onNavClick}>
							Item 3.2
						</NavLinkItem>
					</NavGroup>
					<NavLinkItem disabled href="https://microsoft.com">
						Item 4
					</NavLinkItem>
					<NavLinkItem disabled>
						Item 5
					</NavLinkItem>
					<NavGroup
						expanded
						persistKey="docs-navigation-item-6"
					>
						{#snippet linkText()}
							Item 6 Item 6 Item 6 Item 6 Item 6
						{/snippet}

						<NavLinkItem>
							Item 6.1
						</NavLinkItem>
						<NavLinkItem>
							Item 6.2
						</NavLinkItem>
						<NavGroup expanded>
							{#snippet linkText()}
								Item 6.3
							{/snippet}

							<NavLinkItem>
								Item 6.3.1 Item 6.3.1 Item 6.3.1
							</NavLinkItem>
							<NavLinkItem>
								Item 6.3.2
							</NavLinkItem>
							<NavGroup
								expanded
							>
								{#snippet linkText()}
									Item 6.3.3 Item 6.3.3 Item 6.3.3
								{/snippet}

								<NavLinkItem>
									Item 6.3.3.1
								</NavLinkItem>
								<NavLinkItem disabled>
									Item 6.3.3.2
								</NavLinkItem>
								<NavGroup
									disabled
									expanded
								>
									{#snippet linkText()}
										Item 6.3.3.3
									{/snippet}

									<NavLinkItem>
										Item 6.3.3.3.1
									</NavLinkItem>
									<NavLinkItem>
										Item 6.3.3.3.2
									</NavLinkItem>
								</NavGroup>
							</NavGroup>
						</NavGroup>
					</NavGroup>
				</NavMenu>
			</div>
			<NavMenu class="example-item">
				<h3>Collapsible nav menu</h3>

				<NavMenu collapsible>
					<NavLinkItem title="Item 1 tooltip">
						Item 1
					</NavLinkItem>
					<NavLinkItem title="Item 2 tooltip" disabled>
						Item 2
					</NavLinkItem>
					<NavGroup>
						{#snippet linkText()}
							Item 3
						{/snippet}

						<NavMenu>
							<NavLinkItem title="Item 3.1 tooltip">
								Item 3.1
							</NavLinkItem>
							<NavLinkItem title="Item 3.2 tooltip" disabled>
								Item 3.2
							</NavLinkItem>
							<NavGroup>
								{#snippet linkText()}
									Item 3.3
								{/snippet}

								<NavMenu>
									<NavLinkItem href="https://microsoft.com" title="Item 3.3.1 tooltip">
										https://microsoft.com
									</NavLinkItem>
								</NavMenu>
							</NavGroup>
							<NavGroup title="Item 3.4 tooltip" disabled>
								{#snippet linkText()}
									Item 3.4
								{/snippet}

								<NavMenu>
									<NavLinkItem
										title="Item 3.4.1 tooltip"
										href="https://microsoft.com"
										rel=""
									>
										https://microsoft.com
									</NavLinkItem>
								</NavMenu>
							</NavGroup>
						</NavMenu>
					</NavGroup>
					<NavLinkItem title="Item 4 tooltip" disabled>
						Item 4
					</NavLinkItem>
				</NavMenu>
			</NavMenu>
		</div>
	</Card>

	<Card>
		<h2 id="link-attributes">Link attributes (linkProps)</h2>
		<p>
			NavLinkItem renders an outer <code>div role="menuitem"</code> around the actual link. <code>...rest</code>
			(<code>class</code>, <code>style</code>, <code>data-*</code>, …) stays on that outer element; anchor attributes
			such as <code>download</code>, <code>hreflang</code> or <code>referrerpolicy</code> go through
			<code>linkProps</code>, which is spread on the inner <code>a</code>. <code>href</code>, <code>rel</code>,
			<code>target</code> and <code>title</code> are also available as top-level props and win when both are given.
		</p>
		<div style="max-inline-size: 320px">
			<NavMenu>
				<NavLinkItem href={csvDataUrl} linkProps={{download: "sample.csv"}}>
					Download sample.csv
				</NavLinkItem>
				<NavLinkItem href="https://github.com" linkProps={{target: "_blank", rel: "noopener noreferrer"}}>
					GitHub (new tab)
				</NavLinkItem>
			</NavMenu>
		</div>
		<pre class="code">{linkPropsCode}</pre>
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavMenu Properties</h2>
				<QuickGrid items={navMenuProperties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavMenu Callbacks</h2>
				<QuickGrid items={navMenuCallbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavMenu Slots</h2>
				<QuickGrid items={navMenuSlots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavGroup Properties</h2>
				<QuickGrid items={navGroupProperties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavGroup Callbacks</h2>
				<QuickGrid items={navGroupCallbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavGroup Slots</h2>
				<QuickGrid items={navGroupSlots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavLinkItem Properties</h2>
				<QuickGrid items={navLinkItemProperties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavLinkItem Callbacks</h2>
				<QuickGrid items={navLinkItemCallbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavLinkItem Slots</h2>
				<QuickGrid items={navLinkItemSlots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavItem Properties</h2>
				<QuickGrid items={navItemProperties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavItem Callbacks</h2>
				<QuickGrid items={navItemCallbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>NavItem Slots</h2>
				<QuickGrid items={navItemSlots} columns={propertyColumns} sortMode="single" filterable striped />
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

	.code {
		padding: 0.75rem;
		overflow-x: auto;
		background: var(--neutral-layer-2);
		border-radius: 4px;
		font-size: 12px;
	}
</style>
