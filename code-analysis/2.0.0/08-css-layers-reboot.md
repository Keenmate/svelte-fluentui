# 08 — Reboot + cascade layers: the reboot breaks layered Keenmate components

Recorded 2026-11-19 from a real breakage in GSD Forms (DHL, `gsd-forms-without-me`).

## What happened

GSD Forms uses svelte-fluentui **1.x** through `@dhl/svelte-fluentui-theme` (its `theme.scss` does
`@use 'svelte-fluentui/main'`, so `theme.css` carries the whole `main.css` **including the reboot**).
After upgrading `@keenmate/svelte-treeview` to 5.0.0-rc16, the tag tree's checkboxes lost their
border and margin; theming them with `--stv-checkbox-border-color` changed nothing.

Cause — this reboot rule (1.x `assets/styles/fluent-ui/reboot.scss` → `dist/main.css`; still the same in
2.0's opt-in `packages/svelte-fluentui/src/lib/reboot.css`, ~line 313):

```css
input, button, select, optgroup, textarea {
	margin: 0;
	font-family: inherit;
	font-size: inherit;
	line-height: inherit;
	border: 1px solid black;
}
```

- svelte-fluentui ships **no `@layer` anywhere** (main, styles, reboot) — all of it is unlayered.
- svelte-treeview (and every Keenmate light-DOM library: `@layer variables, component, overrides`)
  puts its CSS in cascade layers so consumers can override it without specificity fights.
- **An unlayered rule beats every layered rule, regardless of specificity.** So the reboot's
  `border` / `margin` won over `.stv__checkbox` in `@layer component`.
- It surfaced with svelte-treeview rc16 because its checkbox became a real styled
  `<input class="stv__checkbox">` (the shared Keenmate checkbox contract, same DOM as
  web-multiselect's `.ms__checkbox`); before it was a `<label>` + `<span>` box the reboot never matched.

Web components (web-multiselect, web-treeview, …) are immune — shadow DOM. Any **light-DOM** layered
library styling a native `<input>` / `<button>` / `<select>` / `<textarea>` hits the same wall.

## Workaround in the consumer (applied in GSD Forms, both apps' `overrides.scss`)

```scss
.stv__container .stv__checkbox {
	margin: revert-layer;
	border: revert-layer;
}
```

`revert-layer` in an unlayered rule falls back to the layered cascade, so the tree's own
unchecked / checked / hover / dark-mode borders apply (verified in Chromium). Every app that combines
the reboot with a layered library would need one of these per affected control — the fix belongs here.

## Fix in svelte-fluentui

1. **Ship the reboot inside a low-priority layer** — `@layer reset { … }` (the name the Keenmate
   suite uses; svelte-treeview's showcase declares `@layer kmwc, reset, variables, component, overrides;`).
   Then the reboot only fills in where nothing layered says otherwise, and any unlayered app rule
   still beats it. Both for 2.0's opt-in `reboot.css` and, if 1.x gets another release, 1.x's
   `reboot.scss` inside `main.css`.
2. **Drop `border: 1px solid black` from the element reset.** A reset shouldn't paint a border on every
   input on the page (checkboxes, radios, range, color, file…); FluentUI's own controls are web
   components / styled elsewhere and don't need it. Bootstrap's reboot doesn't do this either.
3. Consider layering the rest of the global CSS too (`styles.scss` / `main.scss` globals — the
   "global leaks into consumer apps" list in [04-styling.md](04-styling.md) §2): e.g.
   `@layer fluent-base` below the consumer, so other libraries' layered styles and the app's own
   rules aren't fought by element / bare-class selectors. Svelte-scoped component `<style>`s stay
   unlayered (Svelte emits them as-is) — fine, they only match the component's own markup.

Changelog wording for the consumer: "the reboot now lives in `@layer reset` (and no longer sets a
border on every input); a workaround like `.x { border: revert-layer }` can be removed".

Related: svelte-treeview `docs/theming.md` → "The unlayered-reset footgun" (the same advice from the
other side).
