<script lang="ts">
	import {Stack, Card, Paginator, TimePicker} from "svelte-fluentui"
	import {Meta} from "$lib/components"

	const components: {component: string; type: string; defaults: string}[] = [
		{component: "Alert", type: "AlertLabels", defaults: "defaultAlertLabels"},
		{component: "Autocomplete", type: "AutocompleteLabels", defaults: "defaultAutocompleteLabels"},
		{component: "BadgeGroup", type: "BadgeGroupLabels", defaults: "defaultBadgeGroupLabels"},
		{component: "Calendar", type: "CalendarLabels", defaults: "defaultCalendarLabels"},
		{component: "Chip", type: "ChipLabels", defaults: "defaultChipLabels"},
		{component: "Combobox", type: "ComboboxLabels", defaults: "defaultComboboxLabels"},
		{component: "CommandPalette", type: "CommandPaletteLabels", defaults: "defaultCommandPaletteLabels"},
		{component: "CompositeBadge", type: "CompositeBadgeLabels", defaults: "defaultCompositeBadgeLabels"},
		{component: "DatePicker", type: "DatePickerLabels (includes CalendarLabels)", defaults: "defaultDatePickerLabels"},
		{component: "Dialog", type: "DialogLabels", defaults: "defaultDialogLabels"},
		{component: "InputFile", type: "InputFileLabels", defaults: "defaultInputFileLabels"},
		{component: "Paginator", type: "PaginatorLabels", defaults: "defaultPaginatorLabels"},
		{component: "Panel", type: "PanelLabels", defaults: "defaultPanelLabels"},
		{component: "QuickGrid", type: "QuickGridLabels", defaults: "defaultQuickGridLabels"},
		{component: "SiteSettings", type: "SiteSettingsLabels", defaults: "defaultSiteSettingsLabels"},
		{component: "Tabs", type: "TabsLabels", defaults: "defaultTabsLabels"},
		{component: "TimePicker", type: "TimePickerLabels", defaults: "defaultTimePickerLabels"},
		{component: "Toast", type: "ToastLabels", defaults: "defaultToastLabels"},
		{component: "ToastContainer", type: "ToastContainerLabels", defaults: "defaultToastContainerLabels"},
		{component: "TopNav", type: "TopNavLabels", defaults: "defaultTopNavLabels"}
	]
</script>

<Stack orientation="vertical" gap="2rem">
	<Meta
		title="Localisation"
		description="Translate the built-in texts of svelte-fluentui components (aria-labels, button texts, placeholders, pager text) with the labels prop."
		keywords="svelte, fluentui, localisation, localization, i18n, translation, labels, aria-label"
	/>

	<div>
		<h1>Localisation</h1>
		<p class="description">
			Every component that renders its own text — accessible names of icon buttons, placeholders, empty states,
			pager text, column headings — takes a <code>labels</code> prop. Pass a <em>partial</em> object; it is merged
			over the component's exported English defaults, so you only translate what you need.
		</p>
	</div>

	<Card>
		<h2>The labels prop</h2>
		<p>
			Each component exports a <code>&lt;Name&gt;Labels</code> type and a <code>default&lt;Name&gt;Labels</code>
			constant. Strings that contain a value are functions (<code>pageInfo: (page, pageCount) =&gt; string</code>,
			<code>removeChip: (label) =&gt; string</code>), so word order and plurals stay under your control.
		</p>
		<pre><code>{`<Paginator
  bind:currentPageIndex
  lastPageIndex={9}
  totalItemCount={200}
  labels={{
    pagination: "Stránkování",
    previousPage: "Předchozí strana",
    nextPage: "Další strana",
    pageInfo: (page, count) => \`Strana \${page} z \${count}\`,
    itemCount: (n) => \`\${n} položek\`
  }}
/>`}</code></pre>
		<Paginator
			lastPageIndex={9}
			totalItemCount={200}
			labels={{
				pagination: "Stránkování", firstPage: "První strana", previousPage: "Předchozí strana",
				nextPage: "Další strana", lastPage: "Poslední strana",
				pageInfo: (page, count) => `Strana ${page} z ${count}`, itemCount: (n) => `${n} položek`
			}}
		/>
		<div style="max-width: 240px">
			<TimePicker
				hourCycle="h12"
				labels={{placeholder: "Vyberte čas", hour: "Hodina", minute: "Minuta", period: "Část dne", am: "dop.", pm: "odp.", apply: "Použít"}}
			/>
		</div>
	</Card>

	<Card>
		<h2>Precedence</h2>
		<p>
			Some components already had single-string props for the same text (<code>placeholder</code>,
			<code>popupAriaLabel</code>, <code>emptyText</code>, <code>loadingText</code>, <code>removeLabel</code>,
			<code>buttonTitle</code>, <code>moreLabel</code> / <code>lessLabel</code>, …). They are kept: an explicit
			prop on the instance wins over <code>labels</code>, which wins over the default. Use <code>labels</code> for
			app-wide translations and the single props for per-instance wording.
		</p>
		<p>
			Month and weekday names in <code>Calendar</code> / <code>DatePicker</code> are not labels: they come from
			<code>culture</code> via <code>Intl</code>. <code>DatePicker</code>'s labels include the
			<code>CalendarLabels</code> keys and are forwarded to its popup calendar.
		</p>
	</Card>

	<Card>
		<h2>One translation module for the app</h2>
		<p>Keep the partials in one module and spread them where you use the components (or in your own wrappers):</p>
		<pre><code>{`// src/lib/i18n/fluent-cs.ts
import type {PaginatorLabels, TimePickerLabels, ComboboxLabels} from "svelte-fluentui"

export const paginatorCs: Partial<PaginatorLabels> = {
  pageInfo: (page, count) => \`Strana \${page} z \${count}\`,
  itemCount: (n) => \`\${n} položek\`
}
export const timePickerCs: Partial<TimePickerLabels> = {hour: "Hodina", minute: "Minuta", apply: "Použít"}
export const comboboxCs: Partial<ComboboxLabels> = {
  emptyText: "Nic nenalezeno",
  removeChip: (label) => \`Odebrat \${label}\`
}

// usage
<Paginator labels={paginatorCs} … />`}</code></pre>
	</Card>

	<Card>
		<h2>Components with labels</h2>
		<table class="labels-table">
			<thead>
				<tr><th>Component</th><th>Type</th><th>Defaults</th></tr>
			</thead>
			<tbody>
				{#each components as row (row.component)}
					<tr><td>{row.component}</td><td><code>{row.type}</code></td><td><code>{row.defaults}</code></td></tr>
				{/each}
			</tbody>
		</table>
		<p>The keys of each type are listed in the <code>labels</code> row of the component's API table.</p>
	</Card>
</Stack>

<style>
	.labels-table {
		border-collapse: collapse;
		width: 100%;
	}

	.labels-table th,
	.labels-table td {
		text-align: start;
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid var(--neutral-stroke-rest);
	}
</style>
