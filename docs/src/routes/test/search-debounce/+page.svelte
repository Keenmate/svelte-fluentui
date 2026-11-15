<script lang="ts">
	import {Search} from "svelte-fluentui"

	let shown = $state(true)
	let terms = $state<string[]>([])
</script>

<button id="unmount" onclick={() => (shown = false)}>unmount</button>
{#if shown}
	<Search id="debounced" immediate searchDelay={400} onSearch={({term}) => terms.push(term)} />
{/if}
<output id="terms">{terms.join(" | ")}</output>
