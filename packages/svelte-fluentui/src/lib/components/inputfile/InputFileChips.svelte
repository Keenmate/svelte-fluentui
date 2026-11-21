<!-- Internal (InputFile): `listAppearance="chips"` file pile with remove buttons and the +N / − toggle. Not exported from the package. -->

<script lang="ts">
	import DismissIcon from "../icons/DismissIcon.svelte"
	import type {InputFileItem} from "../InputFile.types.js"
	import type {Translate} from "../../i18n/translate.svelte.js"

	type Props = {
		visibleItems: InputFileItem[]
		hiddenCount: number
		/** True when the list is expanded past `maxVisibleFileCount` and can collapse again. */
		canCollapse: boolean
		t: Translate<"inputFile">
		onRemove: (itemId: string) => void
		onShowAll: (showAll: boolean) => void
	}

	let {visibleItems, hiddenCount, canCollapse, t, onRemove, onShowAll}: Props = $props()
</script>

{#each visibleItems as item (item.id)}
	<span
		class="chip"
		class:error={item.status === "error"}
		class:uploading={item.status === "uploading"}
		class:completed={item.status === "completed"}
	>
		<span class="chip-info">
			<span class="chip-name" title={item.name}>{item.name}</span>
			{#if item.status === "uploading"}
				<span class="chip-progress">{item.progress}%</span>
			{/if}
		</span>
		<button
			type="button"
			class="chip-remove"
			onclick={() => onRemove(item.id)}
			aria-label={t("removeAriaLabel", {item: item.name})}
			title={t("removeTooltip", {item: item.name})}
		>
			<DismissIcon size={14} />
		</button>
	</span>
{/each}
{#if hiddenCount > 0}
	<button type="button" class="chip chip-more" onclick={() => onShowAll(true)}>
		+{hiddenCount}
	</button>
{:else if canCollapse}
	<button type="button" class="chip chip-more" onclick={() => onShowAll(false)}> − </button>
{/if}
