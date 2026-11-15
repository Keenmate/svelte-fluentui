<script lang="ts">
	import "svelte-fluentui/reboot.css"
	import "svelte-fluentui/styles.scss"
	import "./test-fixtures.css"

	let {children} = $props()
</script>

{@render children()}
