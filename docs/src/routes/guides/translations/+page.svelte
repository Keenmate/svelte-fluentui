<script lang="ts">
	import {Stack, Card, Paginator, TimePicker, DatePicker, Button, i18n, en, de} from "svelte-fluentui"
	import {Meta} from "$lib/components"

	type Row = {key: string; en: string; de: string}

	// The full dictionary, grouped by component (`svelteFluentUI.<component>.<key>`).
	const groups = $derived.by(() => {
		const byComponent = new Map<string, Row[]>()
		for (const [key, text] of Object.entries(en)) {
			const component = key.split(".")[1]
			const rows = byComponent.get(component) ?? []
			rows.push({key, en: text, de: de[key as keyof typeof en]})
			byComponent.set(component, rows)
		}
		return [...byComponent.entries()]
	})

	let pageIndex = $state(2)

	// Code samples (kept out of the markup, script tags built from pieces: literal ones trip svelte-check).
	const scriptOpen = "<" + "script>"
	const scriptClose = "</" + "script>"
	const sample1 = `${scriptOpen}
  import {i18n} from "svelte-fluentui"
${scriptClose}

<select value={i18n.currentLocale} onchange={(e) => i18n.setLocale(e.currentTarget.value)}>
  {#each i18n.languages as lang}
    <option value={lang.code}>{lang.nativeLabel ?? lang.code}</option>
  {/each}
</select>`
	const sample2 = `// src/routes/+layout.svelte
import {i18n} from "svelte-fluentui"

i18n.init({
  locale: "de",
  fallbackLocale: "en",
  languages: ["en", "de", {code: "fr", label: "French", nativeLabel: "Français"}],
  translations: {
    de: {
      "app.dashboard.title": "Übersicht",
      "svelteFluentUI.dialog.closeAriaLabel": "Fenster schließen"   // override a built-in text
    }
  },
  // Any locale that isn't loaded yet: from a file, an API or the database.
  loadTranslations: async (locale) => (await fetch(\`/locales/\${locale}.json\`)).json()
})`
	const sample3 = `${scriptOpen}
  import {_} from "svelte-fluentui"
${scriptClose}

<h1>{$_("app.dashboard.title")}</h1>`
	const sample4 = `<Paginator
  lastPageIndex={9}
  labels={{pageInfo: "Strana {page} z {pageCount}", paginationAriaLabel: "Stránkování"}}
/>`
</script>

<Stack orientation="vertical" gap="2rem">
	<Meta
		title="Translations"
		description="Translate the built-in texts of svelte-fluentui components with one app-wide svelte-i18n dictionary (English and German built in), or override them per instance with the labels prop."
		keywords="svelte, fluentui, translations, localisation, localization, i18n, svelte-i18n, labels, aria-label"
	/>

	<div>
		<h1>Translations</h1>
		<p class="description">
			Every text a component renders on its own — accessible names of icon buttons, tooltips, placeholders, empty
			states, pager text — comes from one flat dictionary of <code>svelteFluentUI.*</code> keys, run by
			<a href="https://github.com/kaisermann/svelte-i18n">svelte-i18n</a>. English and German are built in; other
			languages are one file (or one database query) away. The service and its API are the same as in
			svelte-pure-admin.
		</p>
	</div>

	<Card>
		<h2>Switching language</h2>
		<p>
			<code>i18n.setLocale()</code> switches every component on the page, open popups included. The
			<strong>EN / DE</strong> button in the header does the same for the whole docs site.
		</p>
		<pre><code>{sample1}</code></pre>
		<Stack orientation="horizontal" gap="0.5rem">
			<Button id="demo-en" appearance={i18n.currentLocale === "en" ? "accent" : "neutral"} onclick={() => i18n.setLocale("en")}>English</Button>
			<Button id="demo-de" appearance={i18n.currentLocale === "de" ? "accent" : "neutral"} onclick={() => i18n.setLocale("de")}>Deutsch</Button>
		</Stack>
		<Paginator bind:currentPageIndex={pageIndex} lastPageIndex={9} totalItemCount={200} />
		<Stack orientation="horizontal" gap="1rem">
			<div style="width: 240px"><DatePicker /></div>
			<div style="width: 240px"><TimePicker hourCycle="h12" /></div>
		</Stack>
		<p>
			Calendar and DatePicker month and weekday names follow the same locale (their <code>culture</code> defaults to
			<code>i18n.currentLocale</code>); pass <code>culture</code> to pin one.
		</p>
	</Card>

	<Card>
		<h2>Setup</h2>
		<p>
			Nothing is needed for English: the built-in dictionaries are registered when the library is imported. To use
			another language, call <code>i18n.init()</code> once in the root layout. Your app's own keys and overrides of
			the library's keys go in the same dictionary, so one <code>setLocale()</code> switches both.
		</p>
		<pre><code>{sample2}</code></pre>
		<p>
			Your own texts use svelte-i18n's <code>$_</code> store — import it from <code>svelte-fluentui</code> (not from
			<code>svelte-i18n</code>), so the library's setup has run first:
		</p>
		<pre><code>{sample3}</code></pre>
		<table class="api-table">
			<thead><tr><th>Member</th><th>Description</th></tr></thead>
			<tbody>
				<tr><td><code>init(options)</code></td><td><code>locale</code>, <code>fallbackLocale</code>, <code>languages</code>, <code>translations</code>, <code>loadTranslations</code></td></tr>
				<tr><td><code>setLocale(code)</code></td><td>Switch language (async; runs the loader for a locale that isn't loaded yet)</td></tr>
				<tr><td><code>addTranslations(code, obj)</code></td><td>Add or override keys for a locale without switching to it</td></tr>
				<tr><td><code>setTranslationLoader(fn)</code></td><td>Set the loader after <code>init()</code></td></tr>
				<tr><td><code>currentLocale</code>, <code>languages</code>, <code>isLoading</code>, <code>loadedLocales</code></td><td>Reactive state</td></tr>
				<tr><td><code>addLanguage</code>, <code>removeLanguage</code>, <code>setLanguages</code>, <code>getLanguage</code>, <code>isLocaleLoaded</code></td><td>Manage the languages list</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>Keys and values</h2>
		<p>
			Keys are <code>svelteFluentUI.&lt;component&gt;.&lt;purpose&gt;&lt;Surface&gt;</code>. The ending says where the
			text is rendered, so a button's visible caption, its tooltip and its screen-reader name can differ:
		</p>
		<table class="api-table">
			<thead><tr><th>Ending</th><th>Rendered as</th><th>Example</th></tr></thead>
			<tbody>
				<tr><td>none</td><td>visible text</td><td><code>svelteFluentUI.timePicker.apply</code></td></tr>
				<tr><td><code>Placeholder</code></td><td>input placeholder</td><td><code>svelteFluentUI.quickGrid.filterPlaceholder</code></td></tr>
				<tr><td><code>Tooltip</code></td><td>hover title</td><td><code>svelteFluentUI.tabs.closeTooltip</code></td></tr>
				<tr><td><code>AriaLabel</code></td><td>screen-reader-only name</td><td><code>svelteFluentUI.tabs.closeAriaLabel</code></td></tr>
			</tbody>
		</table>
		<p>
			Values are plain strings in ICU MessageFormat, so a dictionary is a JSON file or a table of rows:
			<code>"Page &#123;page&#125; of &#123;pageCount&#125;"</code>, and plurals
			<code>"&#123;count, plural, one &#123;# file&#125; other &#123;# files&#125;&#125;"</code>.
		</p>
	</Card>

	<Card>
		<h2>One instance: the labels prop</h2>
		<p>
			Every component with built-in text also takes <code>labels</code> — its own keys (without the
			<code>svelteFluentUI.&lt;component&gt;.</code> prefix), same ICU syntax. It wins over the dictionary for that
			instance only, in every locale. Per-instance props such as <code>placeholder</code> or <code>emptyText</code>
			win over both.
		</p>
		<pre><code>{sample4}</code></pre>
		<Paginator lastPageIndex={9} labels={{pageInfo: "Strana {page} z {pageCount}", paginationAriaLabel: "Stránkování"}} />
	</Card>

	<Card>
		<h2>All keys</h2>
		<p>The built-in dictionaries (exported as <code>en</code> and <code>de</code> — copy one as a starting file for a new language).</p>
		{#each groups as [component, rows] (component)}
			<h3>{component}</h3>
			<table class="api-table keys-table">
				<thead><tr><th>Key</th><th>English</th><th>Deutsch</th></tr></thead>
				<tbody>
					{#each rows as row (row.key)}
						<tr><td><code>{row.key.slice(`svelteFluentUI.${component}.`.length)}</code></td><td>{row.en}</td><td>{row.de}</td></tr>
					{/each}
				</tbody>
			</table>
		{/each}
	</Card>
</Stack>

<style>
	.api-table {
		border-collapse: collapse;
		width: 100%;
		margin-block: 0.5rem;
	}

	.api-table th,
	.api-table td {
		text-align: start;
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid var(--neutral-stroke-rest);
		vertical-align: top;
	}

	.keys-table td:first-child {
		white-space: nowrap;
	}
</style>
