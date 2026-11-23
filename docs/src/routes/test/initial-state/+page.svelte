<script lang="ts">
	import {Accordion, AccordionItem, Radio, RadioGroup} from "svelte-fluentui"

	// Fixture for e2e/initial-state.spec.ts: a child's `checked` / `expanded` seeds the parent's value on
	// first render (a given value wins); afterwards the parent decides.
	let rv = $state<string | undefined>(undefined)
	let rGiven = $state<string | undefined>("b")
	let av = $state<string | string[] | null | undefined>(undefined)
	let aMulti = $state<string | string[] | null | undefined>(undefined)
	let twoExpanded = $state(false)
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 420px">
	<RadioGroup id="rg" bind:value={rv}>
		<Radio value="a" checked>A</Radio>
		<Radio value="b">B</Radio>
	</RadioGroup>
	<output id="rv">{rv ?? ""}</output>

	<RadioGroup id="rg-given" bind:value={rGiven}>
		<Radio value="a" checked>A</Radio>
		<Radio value="b">B</Radio>
	</RadioGroup>
	<output id="rg-given-value">{rGiven ?? ""}</output>

	<Accordion id="acc" bind:value={av}>
		<AccordionItem id="i1" heading="One" expanded={true}>one</AccordionItem>
		<AccordionItem id="i2" heading="Two" bind:expanded={twoExpanded}>two</AccordionItem>
	</Accordion>
	<output id="av">{JSON.stringify(av ?? null)}</output>
	<output id="two-expanded">{twoExpanded}</output>
	<button id="open-two" onclick={() => (twoExpanded = true)}>open two</button>

	<Accordion id="acc-multi" multiple bind:value={aMulti}>
		<AccordionItem id="m1" heading="M1" expanded>m1</AccordionItem>
		<AccordionItem id="m2" heading="M2" expanded>m2</AccordionItem>
		<AccordionItem id="m3" heading="M3">m3</AccordionItem>
	</Accordion>
	<output id="a-multi">{JSON.stringify(aMulti ?? null)}</output>
</div>
