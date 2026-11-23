<script lang="ts">
	import {Button, Chip, QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"
	import {References, Meta} from "$lib/components"

	type Property = {
		name: string
		type: string
		default: string
		description: string
	}

	const properties: Property[] = [
		{name: "text", type: "string", default: '""', description: "Chip text (truncated with an ellipsis past the max width)"},
		{name: "variant", type: '"inline" | "external"', default: '"inline"', description: "inline sits inside a field's border (no border of its own); external is standalone with its own 1px border"},
		{name: "contrast", type: "boolean", default: "false", description: "White fill + inset ring, for hosts whose background equals the default chip fill (readonly / filled fields)"},
		{name: "showRemove", type: "boolean", default: "true", description: "Render the × remove button"},
		{name: "removeFocusable", type: "boolean", default: "false", description: "Put the × button in the Tab order. Off by default because Combobox / Autocomplete move focus onto their inline chips with the arrow keys (Backspace / Delete remove the focused chip); set it for standalone chips"},
		{name: "title", type: "string", default: "undefined", description: "Native tooltip on the chip"},
		{name: "class", type: "string", default: '""', description: "Extra class on the root span"},
		{name: "...rest", type: "HTMLAttributes", default: "-", description: "Other native attributes and DOM events (lowercase onclick, onkeydown, aria-*, data-*, …) are forwarded untouched to the root span"},
		{name: "labels", type: "ChipLabels", default: "undefined", description: "Overrides the built-in text for this instance (svelteFluentUI.chip.* keys; see Guides → Translations). Keys: removeAriaLabel (accessible name of the × button), removeTooltip (its tooltip); both receive {item} = the chip text, default \"Remove {item}\"."},
	]

	const callbacks: Property[] = [
		{name: "onRemove", type: "(ctx: {sourceEvent: MouseEvent}) => void", default: "undefined", description: "Fires when the user activates the × button (click, or Enter / Space when removeFocusable)"}
	]

	const cssVars: Property[] = [
		{name: "--fluent-chip-bg", type: "color", default: "--neutral-fill-secondary-rest", description: "Chip background"},
		{name: "--fluent-chip-border", type: "color", default: "--neutral-stroke-rest", description: "1px inset ring (the border of an external chip)"},
		{name: "--fluent-chip-gap", type: "length", default: "0.25rem", description: "Gap between the text and the × button"},
		{name: "--fluent-chip-padding-block / -inline", type: "length", default: "0.125rem / 0.5rem", description: "Chip padding"},
		{name: "--fluent-chip-font-size", type: "length", default: "0.875rem", description: "Text size"},
		{name: "--fluent-chip-line-height", type: "number", default: "1.4", description: "Text line height"},
		{name: "--fluent-chip-max-width", type: "length", default: "9.375rem", description: "Max width of an inline chip"},
		{name: "--fluent-chip-external-max-width", type: "length", default: "12.5rem", description: "Max width of an external chip"},
		{name: "--fluent-chip-remove-text / -text-hover", type: "color", default: "--accent-fill-rest / -hover", description: "× glyph colour"},
		{name: "--fluent-chip-remove-bg-hover", type: "color", default: "--neutral-fill-secondary-hover", description: "× button hover background"},
		{name: "--fluent-chip-remove-padding", type: "length", default: "0.125rem", description: "× button padding"}
	]

	const propertyColumns = [
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "type", title: "Type", sortable: true, filterable: true},
		{field: "default", title: "Default", sortable: true},
		{field: "description", title: "Description", filterable: true}
	]

	let cities = $state(["Prague", "Vienna", "Berlin", "Lisbon", "A very long city name that gets truncated"])

	function remove(city: string) {
		cities = cities.filter((c) => c !== city)
	}

	function reset() {
		cities = ["Prague", "Vienna", "Berlin", "Lisbon", "A very long city name that gets truncated"]
	}
</script>

<Stack orientation="vertical" gap="1rem">
	<Meta
		title="Chip"
		description="A removable selection tag — the chip Combobox and Autocomplete use for multi-select values, available for your own tag lists."
		keywords="svelte, fluentui, chip, tag, token, removable, multi-select"
	/>

	<h1>Chip</h1>

	<p>
		A removable selection tag: text plus an optional × button that fires <code>onRemove</code>. It's the same chip
		<code>Combobox</code> and <code>Autocomplete</code> render for multi-select values, so your own tag lists match them.
		A custom component (no FluentUI web component), themed with FluentUI design tokens and the
		<code>--fluent-chip-*</code> custom properties.
	</p>

	<References links={[
		{label: "FluentUI Blazor (Autocomplete chips)", href: "https://www.fluentui-blazor.net/Autocomplete"}
	]} />

	<Card>
		<h2>Examples</h2>

		<h3>Removable tags</h3>
		<p>
			Standalone chips should set <code>removeFocusable</code> so keyboard users can Tab to the × and press Enter.
		</p>
		<div class="chip-row">
			{#each cities as city (city)}
				<Chip text={city} title={city} removeFocusable onRemove={() => remove(city)} />
			{/each}
			{#if cities.length === 0}
				<Button onclick={reset}>Reset</Button>
			{/if}
		</div>

		<h3>External variant</h3>
		<p><code>variant="external"</code> carries its own border, for chip rows above or below a field.</p>
		<div class="chip-row">
			<Chip text="Design" variant="external" removeFocusable />
			<Chip text="Engineering" variant="external" removeFocusable />
		</div>

		<h3>Contrast</h3>
		<p><code>contrast</code> keeps chips visible on a background equal to the default chip fill.</p>
		<div class="chip-row contrast-host">
			<Chip text="Readonly" contrast showRemove={false} />
			<Chip text="Filled field" contrast removeFocusable />
		</div>

		<h3>Without remove button</h3>
		<div class="chip-row">
			<Chip text="Read-only tag" showRemove={false} />
		</div>

		<h3>Custom styling</h3>
		<div class="chip-row">
			<Chip
				text="Accent"
				removeFocusable
				style="--fluent-chip-bg: var(--accent-fill-rest); color: var(--foreground-on-accent-rest); --fluent-chip-remove-text: var(--foreground-on-accent-rest);"
			/>
		</div>
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
				<h2>CSS custom properties</h2>
				<QuickGrid items={cssVars} columns={propertyColumns} sortMode="single" filterable striped />
			</Card>
		</GridItem>
	</Grid>
</Stack>

<style>
	.chip-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-block-end: 1rem;
	}

	.contrast-host {
		padding: 0.5rem;
		border-radius: var(--fluent-border-radius-md);
		background: var(--neutral-fill-secondary-rest);
	}
</style>
