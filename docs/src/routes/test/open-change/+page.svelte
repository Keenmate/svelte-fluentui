<script lang="ts">
	import {page} from "$app/state"
	import {untrack} from "svelte"
	import {Select, Combobox, Option, Autocomplete, DatePicker, TimePicker} from "svelte-fluentui"

	// One component per load (?c=select|combobox|autocomplete|datepicker|timepicker),
	// optionally starting open (?open=1), so popups never overlap between cases.
	// The component mounts on the #oc-mount click, after SvelteKit's initial
	// navigation focus reset (which would otherwise close a popup open at load).
	const c = untrack(() => page.url.searchParams.get("c") ?? "select")
	let open = $state(untrack(() => page.url.searchParams.get("open") === "1"))
	let log = $state<boolean[]>([])
	let mounted = $state(false)
	const onOpenChange = ({open}: {open: boolean}) => { log.push(open) }

	const fruits = [
		{value: "apple", label: "Apple"},
		{value: "avocado", label: "Avocado"},
		{value: "banana", label: "Banana"}
	]
</script>

<h1>onOpenChange</h1>

<!-- Controls sit above the component so its popup (which opens below) never covers them. -->
<button id="oc-mount" type="button" onclick={() => (mounted = true)}>mount</button>
<button id="oc-set-open" type="button" onclick={() => (open = true)}>open</button>
<button id="oc-set-close" type="button" onclick={() => (open = false)}>close</button>
<output id="oc-log">{log.join(",")}</output>
<output id="oc-open">{String(open)}</output>

<section id="oc" style="max-width: 320px">
	{#if !mounted}
		<!-- not mounted yet -->
	{:else if c === "select"}
		<Select id="oc-control" bind:open {onOpenChange}>
			<Option value="e">Echo</Option>
			<Option value="f">Foxtrot</Option>
		</Select>
	{:else if c === "combobox"}
		<Combobox id="oc-control" bind:open {onOpenChange}>
			<Option value="g">Golf</Option>
			<Option value="h">Hotel</Option>
		</Combobox>
	{:else if c === "autocomplete"}
		<Autocomplete id="oc-control" options={fruits} bind:open {onOpenChange} />
	{:else if c === "datepicker"}
		<DatePicker id="oc-control" bind:open {onOpenChange} />
	{:else if c === "timepicker"}
		<TimePicker id="oc-control" bind:open {onOpenChange} />
	{/if}
</section>

