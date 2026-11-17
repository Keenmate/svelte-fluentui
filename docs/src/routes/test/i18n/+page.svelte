<script lang="ts">
	import {Alert, Calendar, Paginator, i18n} from "svelte-fluentui"

	// An app-level override of a library key, added for German only.
	i18n.addTranslations("de", {"svelteFluentUI.paginator.paginationAriaLabel": "Seiten"})
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

<section id="pager">
	<Paginator id="pg-def" currentPageIndex={2} lastPageIndex={9} totalItemCount={1} />
	<Paginator id="pg-many" currentPageIndex={0} lastPageIndex={99} totalItemCount={1234} />
	<Paginator id="pg-own" currentPageIndex={2} lastPageIndex={9} labels={{pageInfo: "Strana {page} z {pageCount}"}} />
</section>

<section id="cal">
	<Calendar pickerMonth={new Date(2026, 4, 1)} />
</section>
