<!-- Internal (InputFile): overall upload progress bar, totals line and Pause / Resume / Retry all buttons. Not exported from the package. -->

<script lang="ts">
	import type {InputFileItem} from "../InputFile.types.js"
	import type {Translate} from "../../i18n/translate.svelte.js"
	import {formatInputFileSize} from "../InputFile.utils.js"
	import {uploadTotals} from "./summary.js"

	type Props = {
		items: InputFileItem[]
		t: Translate<"inputFile">
		onPauseAll: () => void
		onResumeAll: () => void
		onRetryAll: () => void
	}

	let {items, t, onPauseAll, onResumeAll, onRetryAll}: Props = $props()

	// Batch buttons only show when they'd do something: Pause all while
	// something uploads, Resume all with a paused item, Retry all with a failure.
	const totals = $derived(uploadTotals(items))
	const anyFailed = $derived(totals.failed > 0)
</script>

<div class="file-list-footer">
	<div
		class="footer-progress"
		role="progressbar"
		aria-valuenow={Math.round(totals.percent)}
		aria-valuemin="0"
		aria-valuemax="100"
	>
		<div class="footer-progress-fill" style:width="{totals.percent}%"></div>
	</div>
	<div class="footer-stats">
		<span class="footer-stats-text">
			{t(totals.failed > 0 ? "totalProgressWithFailed" : "totalProgress", {
				completed: totals.completed,
				failed: totals.failed,
				total: items.length,
				uploadedSize: formatInputFileSize(totals.uploadedBytes),
				totalSize: formatInputFileSize(totals.totalBytes)
			})}
		</span>
		{#if totals.anyUploading || totals.anyPaused || anyFailed}
			<div class="footer-actions">
				{#if totals.anyUploading}
					<button
						type="button"
						class="footer-action-button"
						onclick={(e) => {
							e.stopPropagation()
							onPauseAll()
						}}
					>
						{t("pauseAll")}
					</button>
				{/if}
				{#if totals.anyPaused}
					<button
						type="button"
						class="footer-action-button"
						onclick={(e) => {
							e.stopPropagation()
							onResumeAll()
						}}
					>
						{t("resumeAll")}
					</button>
				{/if}
				{#if anyFailed}
					<button
						type="button"
						class="footer-action-button"
						onclick={(e) => {
							e.stopPropagation()
							onRetryAll()
						}}
					>
						{t("retryAll")}
					</button>
				{/if}
			</div>
		{/if}
		<span class="footer-stats-percent">{Math.round(totals.percent)}%</span>
	</div>
</div>
