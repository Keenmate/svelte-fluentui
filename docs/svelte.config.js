import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess({ script: true }),

	kit: {
		// Resolve the library from source for type-checking too (vite.config.ts already does
		// it for the dev server); otherwise svelte-check reads the stale dist/ typings.
		alias: {
			'svelte-fluentui': '../packages/svelte-fluentui/src/lib'
		},
		// Using adapter-static for static site generation
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		})
	}
};

export default config;
