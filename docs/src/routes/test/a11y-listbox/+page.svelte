<script lang="ts">
	import {Select, Combobox, Autocomplete, Option, OptionGroup} from "svelte-fluentui"

	let fruit = $state("")
	let colors = $state<string[]>([])
	let city = $state<string[]>([])
	let tags = $state<string[]>(["prg", "brn"])
	let countries = $state<string[]>([])
	let formValid = $state("")

	const cities = [
		{value: "prg", label: "Prague", group: "Czechia"},
		{value: "brn", label: "Brno", group: "Czechia"},
		{value: "bts", label: "Bratislava", group: "Slovakia"}
	]
	const countryOptions = [
		{value: "cz", label: "Czechia"},
		{value: "sk", label: "Slovakia"},
		{value: "at", label: "Austria"}
	]

	function checkForm(event: SubmitEvent) {
		event.preventDefault()
	}
</script>

<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; max-width: 360px">
	<div id="select-single">
		<Select label="Fruit" required bind:value={fruit} placeholder="Pick one">
			<Option value="apple">Apple</Option>
			<Option value="banana">Banana</Option>
			<Option value="cherry">Cherry</Option>
		</Select>
	</div>

	<div id="select-multi">
		<Select label="Colors" multiple bind:value={colors}>
			<Option value="red">Red</Option>
			<Option value="green">Green</Option>
			<Option value="blue">Blue</Option>
		</Select>
	</div>

	<div id="combo">
		<Combobox label="City" required options={cities} bind:value={city} />
	</div>

	<div id="combo-tags">
		<Combobox label="Tags" multiple tagsPosition="bottom" options={cities} bind:value={tags} />
	</div>

	<div id="combo-groups">
		<Combobox label="Grouped">
			<OptionGroup label="Fruits">
				<Option value="apple">Apple</Option>
			</OptionGroup>
			<OptionGroup label="Vegetables">
				<Option value="carrot">Carrot</Option>
			</OptionGroup>
		</Combobox>
	</div>

	<form id="ac-form" onsubmit={checkForm}>
		<Autocomplete label="Country" required options={countryOptions} bind:value={countries} />
		<button id="ac-check" type="button" onclick={(e) => (formValid = String((e.currentTarget as HTMLButtonElement).form!.checkValidity()))}>check</button>
	</form>
</div>

<output id="fruit">{fruit}</output>
<output id="colors">{colors.join(",")}</output>
<output id="countries">{countries.join(",")}</output>
<output id="form-valid">{formValid}</output>
