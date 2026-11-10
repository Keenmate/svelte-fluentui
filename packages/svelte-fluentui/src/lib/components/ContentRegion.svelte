<script lang="ts">
	import type {Snippet} from "svelte"


	type Props = {
		children?: Snippet
	}

	let {
		    children = undefined
	    }: Props = $props()
</script>

<div class="content-region">
	{@render children?.()}
</div>
