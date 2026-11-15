<script lang="ts">
	import {Autocomplete, Combobox} from "svelte-fluentui"

	const fruits = [
		{value: "a", label: "Apple"},
		{value: "b", label: "Banana"},
		{value: "c", label: "Cherry"},
		{value: "d", label: "Date"},
		{value: "e", label: "Elderberry"}
	]

	let acValue = $state<string[]>(["a", "b", "c"])
	let cbValue = $state<string[] | null | undefined>(["a", "b", "c"])
</script>

<div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem; max-width: 420px">
	<Autocomplete id="ac" label="Autocomplete" options={fruits} bind:value={acValue} />
	<output id="ac-value">{acValue.join(",")}</output>

	<Combobox id="cb" label="Combobox" multiple options={fruits} bind:value={cbValue} />
	<output id="cb-value">{(cbValue ?? []).join(",")}</output>
</div>
