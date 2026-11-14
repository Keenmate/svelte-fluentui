<script lang="ts">
	import {Paginator, QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	let currentPage = $state(0)
	let lastPage = 9
	let totalItems = 250
	let lastPageEvent = $state("")

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "class", type: "string", default: '""', description: "Custom CSS classes"},
		{name: "style", type: "string", default: '""', description: "Custom inline styles"},
		{name: "disabled", type: "boolean", default: "false", description: "Disables the paginator"},
		{name: "totalItemCount", type: "number", default: "undefined", description: "Total items"},
		{name: "currentPageIndex", type: "number", default: "0", description: "Current page (0-based, bindable)"},
		{name: "lastPageIndex", type: "number", default: "0", description: "Last page (0-based)"},
		{name: "canGoBack", type: "boolean", default: "currentPageIndex > 0", description: "Allow navigating backwards"},
		{name: "canGoForwards", type: "boolean", default: "currentPageIndex < lastPageIndex", description: "Allow navigating forwards"}
	]

	const callbacks: Property[] = [
		{name: "onPageChange", type: "(ctx: {pageIndex: number}) => void", default: "undefined", description: "Fires when the user moves to another page (first / previous / next / last)"},
		{name: "...rest", type: "HTMLAttributes", default: "undefined", description: "Other native attributes and DOM events (onkeydown, onfocusin, data-*, aria-*, …), forwarded untouched to the root <div>"}
	]

	const slots: Property[] = [
		{name: "summaryTemplate", type: "Snippet", default: "undefined", description: "Custom summary markup"},
		{name: "paginationTextTemplate", type: "Snippet", default: "undefined", description: "Custom page info markup"}
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
		title="Paginator"
		description="A standalone Svelte pagination control with first, previous, next, and last buttons plus customizable summary templates. Inspired by FluentUI Blazor."
		keywords="svelte, fluentui, paginator, pagination, pager, navigation"
	/>

	<h1>Paginator</h1>

	<p>
		A standalone pagination control with first/previous/next/last buttons and customizable summary
		templates. Inspired by the FluentUI Blazor Paginator component.
	</p>

	<References links={[
		{label: "Paginator", custom: true},
		{label: "FluentUI Blazor", href: "https://www.fluentui-blazor.net/Paginator"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Basic paginator</h3>
		<Paginator
			totalItemCount={totalItems}
			bind:currentPageIndex={currentPage}
			lastPageIndex={lastPage}
			onPageChange={({pageIndex}) => lastPageEvent = `Moved to page ${pageIndex + 1}`}
		/>
		<p>{lastPageEvent || "Use the buttons to move between pages"}</p>

		<h3>Disabled paginator</h3>
		<Paginator
			totalItemCount={totalItems}
			currentPageIndex={currentPage}
			lastPageIndex={lastPage}
			disabled={true}
		/>
	</Card>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Properties</h2>
				<QuickGrid items={properties} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Callbacks</h2>
				<QuickGrid items={callbacks} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6} xxl={4}>
			<Card>
				<h2>Slots</h2>
				<QuickGrid items={slots} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>
</Stack>
