<script lang="ts">
	import {Combobox, Select, Option} from "svelte-fluentui"

	// Fixture for e2e/max-selection.spec.ts: `maxSelectionCount` on Select / Combobox `multiple`.
	const fruits = [
		{value: "a", label: "Apple"},
		{value: "b", label: "Banana"},
		{value: "c", label: "Cherry"}
	]

	let sel = $state<string[] | undefined>([])
	let selChanges = $state(0)
	let cb = $state<string[] | null | undefined>([])
	let cbChanges = $state(0)
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 360px">
	<Select id="sel" label="Select" multiple maxSelectionCount={2} bind:value={sel} onChange={() => selChanges++}>
		{#each fruits as f (f.value)}<Option value={f.value}>{f.label}</Option>{/each}
	</Select>
	<output id="sel-value">{(sel ?? []).join(",")}</output>
	<output id="sel-changes">{selChanges}</output>

	<Combobox
		id="cb"
		label="Combobox"
		multiple
		options={fruits}
		maxSelectionCount={2}
		bind:value={cb}
		onChange={() => cbChanges++}
	/>
	<output id="cb-value">{(cb ?? []).join(",")}</output>
	<output id="cb-changes">{cbChanges}</output>
</div>
