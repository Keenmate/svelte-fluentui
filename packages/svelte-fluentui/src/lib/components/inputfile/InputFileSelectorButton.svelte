<!--
 * InputFile — button selector
 * Internal (InputFile) sub-component. Renders a single Fluent
 * Button that opens the file picker. Not exported from the package barrel.
-->

<script lang="ts">
	import Button from "../Button.svelte"

	type Props = {
		disabled?: boolean
		label: string
		onclick: (e?: MouseEvent) => void
	}

	let {disabled = false, label, onclick}: Props = $props()
</script>

<Button appearance="accent" {onclick} {disabled}>
	{label}
</Button>
