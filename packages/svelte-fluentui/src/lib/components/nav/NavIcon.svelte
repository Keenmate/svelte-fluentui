<script lang="ts">
	import type {Snippet} from "svelte"

	type Props = {
		children?: Snippet
	}

	let {
		children = undefined
	    }: Props = $props()
</script>

<span class="fluent-nav-icon">
	{@render children?.()}
</span>

<style>
	.fluent-nav-icon {
		min-width: 20px;
	}
</style>
