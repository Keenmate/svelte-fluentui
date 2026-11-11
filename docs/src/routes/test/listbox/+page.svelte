<script lang="ts">
	import {Listbox, Option} from "svelte-fluentui"

	let single = $state<string | string[] | null | undefined>("b")
	let multiple = $state<string | string[] | null | undefined>(["a"])
	let singleChanges = $state<string[]>([])
</script>

<section id="single-wrap">
	<Listbox bind:value={single} onChange={({value}) => singleChanges.push(JSON.stringify(value))}>
		<Option value="a">Alpha</Option>
		<Option value="b">Bravo</Option>
		<Option value="c">Charlie</Option>
	</Listbox>
	<output id="single-value">{JSON.stringify(single)}</output>
	<button id="single-set" onclick={() => (single = "c")}>set c</button>
	<output id="single-changes">{singleChanges.join(" ")}</output>
</section>

<section id="multi-wrap">
	<Listbox bind:value={multiple} multiple>
		<Option value="a">Alpha</Option>
		<Option value="b">Bravo</Option>
		<Option value="c">Charlie</Option>
	</Listbox>
	<output id="multi-value">{JSON.stringify(multiple)}</output>
</section>
