<script lang="ts">
	import {Autocomplete, Combobox, Select, Option} from "svelte-fluentui"

	// Fixture for e2e/min-selection.spec.ts: `minSelectionCount` and `required` in form validation.
	const fruits = [
		{value: "a", label: "Apple"},
		{value: "b", label: "Banana"},
		{value: "c", label: "Cherry"}
	]

	let ac = $state<string[]>([])
	let cb = $state<string[] | null | undefined>([])
	let sel = $state<string[] | undefined>([])
	let selRequired = $state<string | undefined>(undefined)
	let cbRequired = $state<string[] | null | undefined>([])
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 360px">
	<form id="f-ac">
		<Autocomplete id="ac" label="Autocomplete" options={fruits} minSelectionCount={2} bind:value={ac} />
	</form>
	<button id="ac-one" onclick={() => (ac = ["a"])}>ac one</button>
	<button id="ac-two" onclick={() => (ac = ["a", "b"])}>ac two</button>

	<form id="f-cb">
		<Combobox id="cb" label="Combobox" multiple options={fruits} minSelectionCount={2} bind:value={cb} />
	</form>
	<button id="cb-one" onclick={() => (cb = ["a"])}>cb one</button>
	<button id="cb-two" onclick={() => (cb = ["a", "b"])}>cb two</button>

	<form id="f-sel">
		<Select id="sel" label="Select" multiple minSelectionCount={2} bind:value={sel}>
			{#each fruits as f (f.value)}<Option value={f.value}>{f.label}</Option>{/each}
		</Select>
	</form>
	<button id="sel-one" onclick={() => (sel = ["a"])}>sel one</button>
	<button id="sel-two" onclick={() => (sel = ["a", "b"])}>sel two</button>

	<form id="f-sel-required">
		<Select id="sel-required" label="Required select" required bind:value={selRequired}>
			{#each fruits as f (f.value)}<Option value={f.value}>{f.label}</Option>{/each}
		</Select>
	</form>
	<button id="sel-required-pick" onclick={() => (selRequired = "a")}>pick</button>

	<form id="f-cb-required">
		<Combobox id="cb-required" label="Required combobox" multiple required options={fruits} bind:value={cbRequired} />
	</form>
	<button id="cb-required-pick" onclick={() => (cbRequired = ["a"])}>pick</button>
</div>
