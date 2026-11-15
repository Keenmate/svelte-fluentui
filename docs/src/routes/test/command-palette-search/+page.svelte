<script lang="ts">
	import {CommandPalette, type CommandPaletteItem, type SearchBehavior} from "svelte-fluentui"

	let open = $state(false)
	let behavior = $state<SearchBehavior>("normalized")
	let log = $state<string[]>([])

	const run = (id: string) => () => log.push(id)
	const items: CommandPaletteItem[] = [
		{id: "cafe", text: "Café", onClick: run("cafe")},
		{id: "creme", text: "Crème brûlée", onClick: run("creme")},
		{id: "strasse", text: "Hauptstraße", onClick: run("strasse")},
		{id: "decomposed", text: "Pate\u0301 board", onClick: run("decomposed")},
		...Array.from({length: 5}, (_, i) => ({id: `row${i + 1}`, text: `Row ${i + 1}`, onClick: run(`row${i + 1}`)}))
	]
</script>

<button id="open" onclick={() => (open = true)}>open</button>
<select id="behavior" bind:value={behavior}>
	<option value="normalized">normalized</option>
	<option value="case-insensitive">case-insensitive</option>
	<option value="exact">exact</option>
</select>
<CommandPalette bind:open {items} searchBehavior={behavior} enableShortcut={false} />
<output id="log">{log.join(" | ")}</output>
