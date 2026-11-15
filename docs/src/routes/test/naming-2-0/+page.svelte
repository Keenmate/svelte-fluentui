<script lang="ts">
	import {Combobox, CommandPalette, DatePicker, Search, type CommandPaletteItem, type OptionItem} from "svelte-fluentui"

	const options: OptionItem[] = [
		{value: "a", label: "Alpha"},
		{value: "b", label: "Bravo"},
		{value: "c", label: "Charlie"}
	]

	let multiDefault = $state<string[]>([])
	let multiDefaultOpen = $state(false)
	let multiClose = $state<string[]>([])
	let multiCloseOpen = $state(false)

	let date = $state<Date | null>(new Date(2026, 4, 10))
	let dateOpen = $state(false)

	let terms = $state<string[]>([])

	let paletteOpen = $state(false)
	const items: CommandPaletteItem[] = [{id: "one", text: "One"}]

	const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : ""
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 320px">
	<Combobox id="empty-text" {options} emptyText="Nothing here" />
	<Combobox id="empty-snippet" {options}>
		{#snippet empty()}<span class="custom-empty">Custom empty</span>{/snippet}
	</Combobox>
	<Combobox id="multi-default" {options} multiple bind:value={multiDefault} bind:open={multiDefaultOpen} />
	<Combobox id="multi-close" {options} multiple closeOnSelect={true} bind:value={multiClose} bind:open={multiCloseOpen} />
	<DatePicker id="dp" bind:value={date} bind:open={dateOpen} closeOnSelect={false} />
	<Search id="search" immediate searchDelay={400} onSearch={({term}) => terms.push(term)} />
	<button id="open-palette" onclick={() => (paletteOpen = true)}>open palette</button>
</div>

<CommandPalette bind:open={paletteOpen} {items} emptyText="Nothing matches" enableShortcut={false} />

<output id="multi-default-open">{multiDefaultOpen}</output>
<output id="multi-default-value">{multiDefault.join(",")}</output>
<output id="multi-close-open">{multiCloseOpen}</output>
<output id="multi-close-value">{multiClose.join(",")}</output>
<output id="dp-open">{dateOpen}</output>
<output id="dp-value">{fmt(date)}</output>
<output id="terms">{terms.join(" | ")}</output>
