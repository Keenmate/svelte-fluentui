<script lang="ts">
	import {Combobox, Listbox, Option, Select} from "svelte-fluentui"

	// Fixture for e2e/option-selected.spec.ts: `<Option selected>` seeds the parent's selection once,
	// like a native `<option selected>`; afterwards the selection decides.
	let multi = $state<string[] | undefined>(undefined)
	let single = $state<string | undefined>(undefined)
	let given = $state<string[] | undefined>(["c"])
	let cb = $state<string[] | null | undefined>(undefined)
	let lb = $state<string | string[] | null | undefined>(undefined)
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 360px">
	<Select id="multi" label="Multi" multiple bind:value={multi}>
		<Option value="a" selected>Apple</Option>
		<Option value="b" selected>Banana</Option>
		<Option value="c">Cherry</Option>
	</Select>
	<output id="multi-value">{(multi ?? []).join(",")}</output>

	<Select id="single" label="Single" bind:value={single}>
		<Option value="a">Apple</Option>
		<Option value="b" selected>Banana</Option>
		<Option value="c">Cherry</Option>
	</Select>
	<output id="single-value">{single ?? ""}</output>

	<Select id="given" label="Given" multiple bind:value={given}>
		<Option value="a" selected>Apple</Option>
		<Option value="c">Cherry</Option>
	</Select>
	<output id="given-value">{(given ?? []).join(",")}</output>

	<Combobox id="cb" label="Combobox" multiple bind:value={cb}>
		<Option value="a" selected>Apple</Option>
		<Option value="b">Banana</Option>
	</Combobox>
	<output id="cb-value">{(cb ?? []).join(",")}</output>

	<Listbox id="lb" label="Listbox" multiple bind:value={lb}>
		<Option value="a">Apple</Option>
		<Option value="b" selected>Banana</Option>
	</Listbox>
	<output id="lb-value">{Array.isArray(lb) ? lb.join(",") : (lb ?? "")}</output>
</div>
