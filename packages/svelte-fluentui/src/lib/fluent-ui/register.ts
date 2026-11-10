import {provideFluentDesignSystem} from "@fluentui/web-components"

type ElementRegistry = Parameters<ReturnType<typeof provideFluentDesignSystem>["register"]>[number]

/**
 * Registers FluentUI web components with the Fluent design system. Call it from a
 * component's `<script module>` so it runs once per component type rather than on
 * every instance. No-op where `customElements` doesn't exist; FAST itself skips
 * elements that are already defined.
 */
export function registerFluentElements(...elements: ElementRegistry[]): void {
	if (typeof customElements === "undefined") return
	provideFluentDesignSystem().register(...elements)
}
