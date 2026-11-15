<script lang="ts">
	import {InputFile} from "svelte-fluentui"
</script>

<section id="pop">
	<InputFile multiple selectorAppearance="minimal" listAppearance="popover" />
	<button id="outside">outside</button>
</section>

<section id="minimal-drag">
	<!-- expandOnDrag has no overlay for non-card selectors -->
	<InputFile selectorAppearance="minimal" expandOnDrag />
</section>

<section id="card-drag">
	<InputFile expandOnDrag />
</section>
