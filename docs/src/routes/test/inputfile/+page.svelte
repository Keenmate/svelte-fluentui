<script lang="ts">
	import {InputFile, type FileUploadHandler, type InputFileItem} from "svelte-fluentui"

	let log = $state<string[]>([])
	let input: {removeAt: (i: number) => void} | undefined = $state()

	const upload: FileUploadHandler = async ({file, signal, reportProgress}) => {
		if (signal.aborted) throw new DOMException("Aborted", "AbortError")
		reportProgress(50)
		reportProgress(100)
		return {metadata: {uploadedName: file.name}}
	}
	const name = (f: InputFileItem) => f.name
</script>

<section id="if">
	<InputFile
		bind:this={input}
		multiple
		maxFileSize={100}
		rejectionMode="callback"
		uploadCallback={upload}
		onFileAdd={({files}) => log.push(`add:${files.map(name).join("+")}`)}
		onFileUpload={({file, fileIndex}) => log.push(`upload:${file.name}@${fileIndex}:${file.metadata?.uploadedName}`)}
		onFileError={({file, error}) => log.push(`error:${file.name}:${error ? "yes" : "no"}`)}
		onUploadComplete={({files}) => log.push(`complete:${files.length}`)}
		onFileRemove={({file}) => log.push(`remove:${file.name}`)}
	/>
	<button id="remove-first" onclick={() => input?.removeAt(0)}>remove first</button>
	<output id="if-log">{log.join(" | ")}</output>
</section>
