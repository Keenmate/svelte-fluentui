<script lang="ts">
	import {Textarea} from "svelte-fluentui"

	let bound = $state("initial")
</script>

<section id="bind-wrap">
	<Textarea id="bind-textarea" bind:value={bound} />
	<output id="bind-value">{bound}</output>
	<button id="bind-reset" onclick={() => (bound = "reset")}>reset</button>
</section>
