<script lang="ts">
	import {RadioGroup, Radio} from "svelte-fluentui"

	let value = $state<string | null | undefined>("a")
	let changes = $state<string[]>([])
</script>

<section id="group-wrap">
	<RadioGroup bind:value name="letters" onChange={({value}) => changes.push(value)}>
		<Radio value="a">Alpha</Radio>
		<Radio value="b">Bravo</Radio>
		<Radio value="c">Charlie</Radio>
	</RadioGroup>
	<output id="group-value">{value}</output>
	<output id="group-changes">{changes.join(",")}</output>
</section>
