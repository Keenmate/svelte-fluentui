<script lang="ts">
	import {TextField, NumberField, Search} from "svelte-fluentui"

	let text = $state("")
	let log = $state<string[]>([])
	let num = $state("")
	let terms = $state<string[]>([])
</script>

<section id="tf">
	<TextField
		id="tf-input"
		class="custom-class"
		data-testid="tf-host"
		bind:value={text}
		onChange={({value}) => log.push(`change:${value}`)}
		onkeydown={(e) => log.push(`key:${(e as KeyboardEvent).key}`)}
		onfocus={() => log.push("focus")}
	/>
	<output id="tf-value">{text}</output>
	<output id="tf-log">{log.join(",")}</output>
</section>

<section id="nf">
	<NumberField id="nf-input" bind:value={num} onChange={({value}) => log.push(`num:${value}`)} />
</section>

<section id="search">
	<Search id="search-input" onSearch={({term}) => terms.push(term)} />
	<output id="search-terms">{terms.join(",")}</output>
</section>
