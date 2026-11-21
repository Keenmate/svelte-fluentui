<script lang="ts">
	import {settings, toast, navigation, i18n, ToastContainer} from "svelte-fluentui"
</script>

<!-- toast / settings / navigation services (e2e/services.spec.ts) -->
<ToastContainer />
<button id="toast-success" onclick={() => toast.success("Saved", {persistent: true})}>success</button>
<button id="toast-titled" onclick={() => toast.info("Body", {title: "Custom", persistent: true})}>titled</button>
<button id="toast-clear" onclick={() => toast.dismissAll()}>clear</button>
<span id="toast-count">{toast.items.length}</span>

<button id="theme-dark" onclick={() => settings.setThemeMode("dark")}>dark</button>
<button id="theme-toggle" onclick={() => settings.toggleTheme()}>toggle</button>
<button id="settings-rtl" onclick={() => settings.setDirection("rtl")}>rtl</button>
<button id="settings-reset" onclick={() => settings.reset()}>reset</button>
<span id="theme-mode">{settings.themeMode}</span>
<span id="theme-effective">{settings.effectiveTheme}</span>

<button id="nav-set" onclick={() => navigation.setGroupExpanded("e2e-svc", true)}>nav</button>
<span id="nav-state">{navigation.isGroupExpanded("e2e-svc")}</span>

<button id="locale-de" onclick={() => i18n.setLocale("de")}>de</button>
