<!--
@component
FluentUI system icon rendered as inline SVG (resolved at build time by the `svelteFluentUI()` Vite plugin).

```svelte
<Icon name="folder" size={20} color="accent" />
```
-->
<script lang="ts">
	import iconMap from 'virtual:fluentui-icons'
	import type {RestProps} from '../types/index.js'

	type IconSize = 16 | 20 | 24 | 28 | 32 | 48
	type IconVariant = 'regular' | 'filled'
	type IconColor = 'neutral' | 'accent' | 'warning' | 'info' | 'error' | 'success' | 'fill' | 'fill-inverse' | 'lightweight' | 'disabled' | 'custom'

	type OwnProps = {
		/** FluentUI icon name without the `ic_fluent_` prefix and size/variant suffix, e.g. "folder". */
		name: string
		/** Icon size in px; the icon must exist at that size. Default: 24. */
		size?: IconSize
		/** `regular` (outline) or `filled`. Default: `regular`. */
		variant?: IconVariant
		/** Theme colour token for the fill; `custom` uses `customColor`. Default: inherits `currentColor`. */
		color?: IconColor
		/** CSS colour used when `color="custom"`. */
		customColor?: string
		/** Swap to the filled variant on hover (regular variant only). */
		hoverEffect?: boolean
		/** Extra class on the root `<span>`. */
		class?: string
		/** Inline style on the root `<span>`. */
		style?: string
		/** Tooltip (`title`) on the icon. */
		title?: string
		/** CSS width override of the root `<span>` (e.g. "100%"). */
		width?: string
	}

	/** Other native attributes and events (`id`, `role`, `aria-*`, `onclick`, …) go to the root `<span>`. */
	type Props = OwnProps & RestProps<OwnProps>

	// Color enum to CSS variable mapping (matching FluentUI Blazor)
	const colorMap: Record<IconColor, string> = {
		'neutral': 'var(--neutral-foreground-rest)',
		'accent': 'var(--accent-fill-rest)',
		'warning': 'var(--fluent-color-warning-foreground)',
		'info': 'var(--fluent-color-info-foreground)',
		'error': 'var(--fluent-color-danger-foreground)',
		'success': 'var(--fluent-color-success-foreground)',
		'fill': 'var(--neutral-fill-rest)',
		'fill-inverse': 'var(--neutral-fill-inverse-rest)',
		'lightweight': 'var(--neutral-layer-1)',
		'disabled': 'var(--neutral-stroke-rest)',
		'custom': ''  // Uses customColor prop
	}

	let {
		name,
		size = 24,
		variant = 'regular',
		color = undefined,
		customColor = undefined,
		hoverEffect = false,
		class: className = '',
		style: styleParam = '',
		title = undefined,
		width = undefined,
		...rest
	}: Props = $props()

	// Resolve the fill color: color enum > customColor > currentColor
	let resolvedFill = $derived.by(() => {
		if (color === 'custom' && customColor) {
			return customColor
		}
		if (color && colorMap[color]) {
			return colorMap[color]
		}
		return 'currentColor'
	})

	let svgContent = $state<string>('')
	let svgContentFilled = $state<string>('')
	let isLoading = $state<boolean>(true)
	let error = $state<string | null>(null)

	// Derived computed style
	let computedStyle = $derived.by(() => {
		let styles = styleParam || ''
		styles += ` --fluent-icon-size: ${size}px;`
		styles += ` --fluent-icon-fill: ${resolvedFill};`
		if (width) {
			styles += ` width: ${width};`
		}
		return styles
	})

	const icons = iconMap as Record<string, string>

	// An inline-mode entry is raw SVG markup; an asset-mode entry is a URL.
	function isMarkup(entry: string): boolean {
		return entry.trimStart().startsWith('<')
	}

	// Resolve one icon key to its SVG markup. Inline entries are returned as-is;
	// asset URLs are fetched (so the SVG can be injected for `currentColor`).
	async function resolveMarkup(key: string): Promise<string> {
		const entry = icons[key]
		if (entry === undefined) {
			throw new Error(`Icon not found: ${key}`)
		}
		if (isMarkup(entry)) {
			return entry
		}
		const response = await fetch(entry)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}
		return response.text()
	}

	// Resolve the requested icon (and the filled variant when hoverEffect is on)
	// from the virtual map whenever the inputs change.
	$effect(() => {
		const key = `${name}_${size}_${variant}`
		const entry = icons[key]

		if (entry === undefined) {
			console.error(
				`[svelte-fluentui] ${key}.svg not found. If this icon is referenced only ` +
					`through a dynamic name, add it to the svelteFluentUI({ iconsInclude: [...] }) option.`
			)
			error = `Icon not found: ${name}`
			svgContent = ''
			isLoading = false
			return
		}

		error = null

		if (isMarkup(entry)) {
			// Inline mode: markup is already in the bundle, no request needed.
			svgContent = entry
			isLoading = false
		} else {
			// Asset mode: fetch the hashed asset URL.
			isLoading = true
			resolveMarkup(key)
				.then((content) => {
					svgContent = content
				})
				.catch((err) => {
					console.error(`[svelte-fluentui] Failed to load icon: ${key}`, err)
					error = `Icon not found: ${name}`
					svgContent = ''
				})
				.finally(() => {
					isLoading = false
				})
		}

		// If hover effect is enabled, also resolve the filled variant.
		if (hoverEffect && variant === 'regular') {
			resolveMarkup(`${name}_${size}_filled`)
				.then((content) => {
					svgContentFilled = content
				})
				.catch(() => {
					svgContentFilled = ''
				})
		} else {
			svgContentFilled = ''
		}
	})
</script>

{#if error}
	<span {...rest} class="fluent-icon-error" style={computedStyle} title={error}>⚠️</span>
{:else if isLoading}
	<span {...rest} class="fluent-icon-loading" style={computedStyle} title="Loading icon..."></span>
{:else if hoverEffect && svgContentFilled}
	<!-- Hover effect: show both regular and filled -->
	<span {...rest} class="fluent-icon fluent-icon-hoverable {className}" style={computedStyle}>
		<span class="icon-regular" {title}>{@html svgContent}</span>
		<span class="icon-filled" {title}>{@html svgContentFilled}</span>
	</span>
{:else}
	<!-- Standard icon without hover effect -->
	<span {...rest} class="fluent-icon {className}" style={computedStyle} {title}>
		{@html svgContent}
	</span>
{/if}

<style>
	.fluent-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--fluent-icon-size, 24px);
		height: var(--fluent-icon-size, 24px);
		color: var(--fluent-icon-fill, currentColor);
		line-height: 1;
		vertical-align: middle;
	}

	.fluent-icon :global(svg) {
		width: 100%;
		height: 100%;
		fill: var(--fluent-icon-fill, currentColor);
		display: block;
	}

	/* Hover effect styles */
	.fluent-icon-hoverable {
		position: relative;
	}

	.fluent-icon-hoverable .icon-regular,
	.fluent-icon-hoverable .icon-filled {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	/* Default: show regular, hide filled */
	.fluent-icon-hoverable .icon-regular {
		display: inline-flex;
	}
	.fluent-icon-hoverable .icon-filled {
		display: none;
	}

	/* On hover/active: show filled, hide regular */
	.fluent-icon-hoverable:hover .icon-regular,
	.fluent-icon-hoverable:active .icon-regular {
		display: none;
	}
	.fluent-icon-hoverable:hover .icon-filled,
	.fluent-icon-hoverable:active .icon-filled {
		display: inline-flex;
	}

	/* Trigger icon change when parent button/link is hovered */
	:global(fluent-button:hover) .fluent-icon-hoverable .icon-regular,
	:global(button:hover) .fluent-icon-hoverable .icon-regular,
	:global(a:hover) .fluent-icon-hoverable .icon-regular,
	:global(.fluent-nav-link:hover) .fluent-icon-hoverable .icon-regular {
		display: none;
	}

	:global(fluent-button:hover) .fluent-icon-hoverable .icon-filled,
	:global(button:hover) .fluent-icon-hoverable .icon-filled,
	:global(a:hover) .fluent-icon-hoverable .icon-filled,
	:global(.fluent-nav-link:hover) .fluent-icon-hoverable .icon-filled {
		display: inline-flex;
	}

	/* Also trigger on active state */
	:global(fluent-button:active) .fluent-icon-hoverable .icon-regular,
	:global(button:active) .fluent-icon-hoverable .icon-regular,
	:global(a:active) .fluent-icon-hoverable .icon-regular,
	:global(.fluent-nav-link:active) .fluent-icon-hoverable .icon-regular {
		display: none;
	}

	:global(fluent-button:active) .fluent-icon-hoverable .icon-filled,
	:global(button:active) .fluent-icon-hoverable .icon-filled,
	:global(a:active) .fluent-icon-hoverable .icon-filled,
	:global(.fluent-nav-link:active) .fluent-icon-hoverable .icon-filled {
		display: inline-flex;
	}

	.fluent-icon-error,
	.fluent-icon-loading {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--fluent-icon-size, 24px);
		height: var(--fluent-icon-size, 24px);
		font-size: calc(var(--fluent-icon-size, 24px) * 0.75);
	}

	.fluent-icon-loading {
		opacity: 0.5;
	}
</style>
