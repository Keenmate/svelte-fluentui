<script lang="ts">
	import {InputFile, type FileUploadHandler, type InputFileItem} from "svelte-fluentui"

	// Controllable upload: each call reports 30% and waits until the test calls
	// window.__finish(name, ok) (or the upload is aborted).
	const pending = new Map<string, (ok: boolean) => void>()
	if (typeof window !== "undefined") {
		;(window as any).__finish = (name: string, ok = true) => { pending.get(name)?.(ok); pending.delete(name) }
		;(window as any).__pending = () => [...pending.keys()]
	}
	let chunks = $state<string[]>([])
	const controlled: FileUploadHandler = ({file, signal, reportProgress, chunk}) => new Promise((resolve, reject) => {
		if (chunk) {
			chunks.push(`${chunk.offset}+${chunk.size}/${chunk.total}`)
			reportProgress(100)
			resolve(chunk.offset + chunk.size === chunk.total ? {downloadUrl: "about:blank"} : undefined)
			return
		}
		reportProgress(30)
		signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
		pending.set(file.name, ok => ok ? resolve({downloadUrl: "about:blank"}) : reject(new Error(`boom ${file.name}`)))
	})

	let log = $state<string[]>([])
	let changes = $state(0)
	let manual: {uploadAll: () => Promise<void>; clear: () => void; getItems: () => InputFileItem[]} | undefined = $state()
	let validity = $state("")
</script>

<section id="up">
	<InputFile multiple uploadCallback={controlled} concurrency={2}
		onFileError={({file, error}) => log.push(`error:${file.name}:${error}`)}
		onUploadComplete={({files}) => log.push(`complete:${files.length}`)}
		onChange={() => changes++} />
</section>
<output id="up-log">{log.join(" | ")}</output>
<output id="up-changes">{changes}</output>

<section id="rej">
	<InputFile multiple maxFileSize={10} maxFileCount={5} dedupe="name" accept=".txt,image/*" maxVisibleFileCount={2}
		onValidityChange={({isValid, reasons}) => (validity = `${isValid}:${reasons.length}`)} />
</section>
<output id="rej-validity">{validity}</output>

<section id="chips">
	<InputFile multiple listAppearance="chips" selectorAppearance="button" maxVisibleFileCount={2} />
</section>

<section id="manual">
	<InputFile bind:this={manual} multiple autoUpload={false} uploadCallback={controlled} allowReorder chunkSize={4}>
		{#snippet empty()}<p id="manual-empty">Nothing yet</p>{/snippet}
	</InputFile>
	<output id="chunks">{chunks.join(" ")}</output>
</section>

<section id="snips">
	<InputFile multiple selectorAppearance="card" cardSize="small" totalMaxSize={1000}
		formatLimits={({currentCount, maxFileCount}) => `${currentCount} of ${maxFileCount}`}>
		{#snippet fileItem({item, remove})}
			<div class="custom-row">{item.name}:{item.status} <button class="custom-remove" onclick={remove}>x</button></div>
		{/snippet}
		{#snippet actions({clearAll})}<button id="snips-clear" onclick={clearAll}>wipe</button>{/snippet}
	</InputFile>
</section>

<section id="ov">
	<InputFile multiple expandOnDrag />
</section>
