<!-- Internal (InputFile): drop-zone body (icon, message, Browse button, hint lines) shared by the card selector and the drag overlay. Not exported from the package. -->

<script lang="ts">
	import Button from "../Button.svelte"
	import type {InputFileLabels} from "../InputFile.types.js"

	type Props = {
		labels: InputFileLabels
		isDragging: boolean
		disabled: boolean
		hints: string[]
		onBrowse: () => void
	}

	let {labels, isDragging, disabled, hints, onBrowse}: Props = $props()
</script>

<div class="drop-zone-content">
	<div class="drop-zone-icon">
		<svg
			viewBox="0 0 48 48"
			fill="currentColor"
			class="upload-icon"
			aria-hidden="true"
		>
			<path
				d="M24 4a2 2 0 012 2v20.586l5.293-5.293a2 2 0 112.828 2.828l-8.707 8.708a2 2 0 01-2.828 0l-8.707-8.708a2 2 0 112.828-2.828L22 26.586V6a2 2 0 012-2z"
			/>
			<path
				d="M8 32a2 2 0 012-2h4a2 2 0 110 4h-2v6h24v-6h-2a2 2 0 110-4h4a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V32z"
			/>
		</svg>
	</div>
	<p class="drop-zone-text">
		{isDragging ? labels.dropHere : labels.dragAndDrop}
	</p>
	<div class="drop-zone-action">
		<Button
			appearance="accent"
			onclick={(e) => {
				e?.stopPropagation()
				onBrowse()
			}}
			{disabled}
		>
			{labels.browse}
		</Button>
	</div>
	{#if hints.length > 0}
		<div class="drop-zone-hints">
			{#each hints as hint}
				<p class="drop-zone-hint">{hint}</p>
			{/each}
		</div>
	{/if}
</div>
