<script lang="ts">
	import {Listbox, Option, QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	let selectedValue: string = "banana";

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "value", type: "string", default: "required", description: "Option value"},
		{name: "label", type: "string", default: "undefined", description: "Text used for filtering, type-ahead and the trigger display (default: the rendered text)"},
		{name: "disabled", type: "boolean", default: "false", description: "Disable the option"},
		{name: "selected", type: "boolean", default: "undefined", description: "Initially selected, like a native <option selected>: seeds the parent's selection and bound value on first render (a given value wins), then it can be deselected"},
		{name: "style", type: "string", default: "undefined", description: "Custom inline styles"},
		{name: "class", type: "string", default: "undefined", description: "Extra CSS class on the option row"},
		{name: "data", type: "Record<string, unknown>", default: "undefined", description: "Arbitrary context data, reported with the selection (Select onChange option.data)"}
	]

	const actions: Property[] = []

	const callbacks: Property[] = [
		{name: "onclick", type: "(event: MouseEvent) => void", default: "undefined", description: "Native click event, forwarded untouched"},
		{name: "...rest", type: "HTMLAttributes", default: "undefined", description: "Other native attributes and DOM events (onkeydown, onfocusin, data-*, aria-*, …), forwarded untouched to the option row <div> (OptionGroup: the group <div>)"}
	]

	const slots: Property[] = [
		{name: "children", type: "Snippet", default: "required", description: "Option label content"},
		{name: "icon", type: "Snippet", default: "undefined", description: "Icon rendered before the option text"}
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
		title="Option"
		description="A Svelte wrapper for FluentUI's option web component — a single selectable item used inside Listbox, Combobox, and Select components."
		keywords="svelte, fluentui, option, listbox, combobox, select, item"
	/>

	<h1>Option</h1>

	<p>
		A single selectable item that wraps the <code>&lt;fluent-option&gt;</code> element, used inside
		<code>Listbox</code>, <code>Combobox</code>, and <code>Select</code> components.
	</p>

	<References links={[
		{label: "FluentUI Web Component", href: "https://storybooks.fluentui.dev/web-components/?path=/docs/components-dropdown-option--docs"},
		{label: "FluentUI Blazor", href: "https://www.fluentui-blazor.net/Option"}
	]} />

	<Card>
		<h2 class="content-subhead">Examples</h2>

		<h3>Basic option in listbox</h3>
		<Listbox bind:value={selectedValue}>
			<Option value="apple">Apple</Option>
			<Option value="banana">Banana</Option>
			<Option value="cherry">Cherry</Option>
		</Listbox>
		<p>Selected: {selectedValue}</p>

		<h3>Disabled option</h3>
		<Listbox value="banana">
			<Option value="apple">Apple</Option>
			<Option value="banana" disabled={true}>Banana (disabled)</Option>
			<Option value="cherry">Cherry</Option>
		</Listbox>
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
