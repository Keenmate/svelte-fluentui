<script lang="ts">
	import {Alert, i18n} from "svelte-fluentui"

	// An app-level override of a library key, added for German only.
	i18n.addTranslations("de", {"svelteFluentUI.dialog.closeAriaLabel": "Fenster schließen"})
</script>

<h1>i18n</h1>
<p>
	<button id="to-de" onclick={() => i18n.setLocale("de")}>de</button>
	<button id="to-en" onclick={() => i18n.setLocale("en")}>en</button>
	<span id="current">{i18n.currentLocale}</span>
</p>

<section id="alert">
	<Alert id="alert-def" dismissible>Default text</Alert>
	<Alert id="alert-own" dismissible labels={{dismissAriaLabel: "Zavřít"}}>Own labels</Alert>
</section>
