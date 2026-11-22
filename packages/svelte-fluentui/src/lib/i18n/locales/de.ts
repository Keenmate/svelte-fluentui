import type {SvelteFluentUITranslationKey} from "../types.js"

/**
 * German translations. Same keys as `en.ts` (a missing key is a type error).
 * Drafted, not yet reviewed by a native speaker.
 */
export const de: Record<SvelteFluentUITranslationKey, string> = {
	// Alert
	"svelteFluentUI.alert.dismissAriaLabel": "Schließen",

	// AppBar
	"svelteFluentUI.appBar.moreItemsTooltip": "Weitere Apps anzeigen",
	"svelteFluentUI.appBar.moreItemsAriaLabel": "Weitere Apps anzeigen",
	"svelteFluentUI.appBar.popupAriaLabel": "Weitere Apps",
	"svelteFluentUI.appBar.searchPlaceholder": "Apps durchsuchen",
	"svelteFluentUI.appBar.searchAriaLabel": "Apps durchsuchen",
	"svelteFluentUI.appBar.noResults": "Keine Apps gefunden",

	// Autocomplete
	"svelteFluentUI.autocomplete.placeholder": "Zum Suchen tippen...",
	"svelteFluentUI.autocomplete.noMatches": "Keine Ergebnisse gefunden",
	"svelteFluentUI.autocomplete.loadingAriaLabel": "Wird geladen",
	"svelteFluentUI.autocomplete.clearAriaLabel": "Auswahl löschen",
	"svelteFluentUI.autocomplete.clearTooltip": "Auswahl löschen",
	"svelteFluentUI.autocomplete.openPopupAriaLabel": "Optionen anzeigen",
	"svelteFluentUI.autocomplete.closePopupAriaLabel": "Optionen schließen",
	"svelteFluentUI.autocomplete.removeAriaLabel": "{item} entfernen",
	"svelteFluentUI.autocomplete.removeTooltip": "{item} entfernen",
	"svelteFluentUI.autocomplete.maxSelectionReached":
		"{max, plural, one {Maximal # Auswahl erreicht} other {Maximal # Auswahlen erreicht}}",
	"svelteFluentUI.autocomplete.minSelectionRequired":
		"{min, plural, one {Wählen Sie mindestens # Eintrag aus.} other {Wählen Sie mindestens # Einträge aus.}}",

	// BadgeGroup
	"svelteFluentUI.badgeGroup.showMore": "+{count} weitere",
	"svelteFluentUI.badgeGroup.showLess": "Weniger anzeigen",

	// Calendar
	"svelteFluentUI.calendar.previousPeriodAriaLabel": "{title}",
	"svelteFluentUI.calendar.previousPeriodTooltip": "{title}",
	"svelteFluentUI.calendar.nextPeriodAriaLabel": "{title}",
	"svelteFluentUI.calendar.nextPeriodTooltip": "{title}",
	"svelteFluentUI.calendar.maxSelectedDayCountExceeded":
		"{max, plural, one {Sie können höchstens # Tag auswählen.} other {Sie können höchstens # Tage auswählen.}} Entfernen Sie einen Tag, um einen neuen auszuwählen.",

	// Chip
	"svelteFluentUI.chip.removeAriaLabel": "{item} entfernen",
	"svelteFluentUI.chip.removeTooltip": "{item} entfernen",

	// Combobox
	"svelteFluentUI.combobox.noMatches": "Keine Ergebnisse gefunden",
	"svelteFluentUI.combobox.loading": "Suche läuft…",
	"svelteFluentUI.combobox.removeAriaLabel": "{item} entfernen",
	"svelteFluentUI.combobox.removeTooltip": "{item} entfernen",
	"svelteFluentUI.combobox.clearAriaLabel": "Auswahl löschen",
	"svelteFluentUI.combobox.clearTooltip": "Auswahl löschen",
	"svelteFluentUI.combobox.minSelectionRequired":
		"{min, plural, one {Wählen Sie mindestens # Eintrag aus.} other {Wählen Sie mindestens # Einträge aus.}}",

	// CommandPalette
	"svelteFluentUI.commandPalette.dialogAriaLabel": "Befehlspalette",
	"svelteFluentUI.commandPalette.placeholder": "Suchen…",
	"svelteFluentUI.commandPalette.resultsAriaLabel": "Ergebnisse der Befehlspalette",
	"svelteFluentUI.commandPalette.empty": "Keine Einträge",
	"svelteFluentUI.commandPalette.noMatches": "Keine Treffer für „{query}“",
	"svelteFluentUI.commandPalette.escapeHint": "Esc zum Schließen",
	"svelteFluentUI.commandPalette.navigateHint": "navigieren",
	"svelteFluentUI.commandPalette.selectHint": "auswählen",
	"svelteFluentUI.commandPalette.toggleHint": "umschalten",

	// CompositeBadge
	"svelteFluentUI.compositeBadge.dismissAriaLabel": "Schließen",

	// DatePicker
	"svelteFluentUI.datePicker.placeholder": "Datum auswählen",
	"svelteFluentUI.datePicker.openPopupAriaLabel": "Kalender öffnen",
	"svelteFluentUI.datePicker.popupAriaLabel": "Datum wählen",
	"svelteFluentUI.datePicker.clearAriaLabel": "Datum löschen",
	"svelteFluentUI.datePicker.clearTooltip": "Datum löschen",

	// Dialog
	"svelteFluentUI.dialog.closeAriaLabel": "Dialog schließen",
	"svelteFluentUI.dialog.dismiss": "Schließen",

	// InputFile
	"svelteFluentUI.inputFile.dropHere": "Dateien hier ablegen",
	"svelteFluentUI.inputFile.dragAndDrop": "Dateien hierher ziehen oder",
	"svelteFluentUI.inputFile.browse": "Durchsuchen",
	"svelteFluentUI.inputFile.browseAriaLabel": "Durchsuchen",
	"svelteFluentUI.inputFile.browseTooltip": "Durchsuchen",
	"svelteFluentUI.inputFile.selectFiles": "Dateien auswählen",
	"svelteFluentUI.inputFile.viewFilesAriaLabel": "Dateien anzeigen",
	"svelteFluentUI.inputFile.accepted": "Erlaubt: {accept}",
	"svelteFluentUI.inputFile.maxSize": "Max. Größe: {size}",
	"svelteFluentUI.inputFile.minSize": "Min. Größe: {size}",
	"svelteFluentUI.inputFile.totalMaxSize": "Max. Gesamtgröße: {size}",
	"svelteFluentUI.inputFile.totalMaxSizeRemaining": "Max. Gesamtgröße: {size} · noch {remaining}",
	"svelteFluentUI.inputFile.maxFiles": "Max. Dateien: {max}",
	"svelteFluentUI.inputFile.maxFilesRemaining": "Max. Dateien: {max} · noch {remaining}",
	"svelteFluentUI.inputFile.minFiles": "Min. Dateien: {min}",
	"svelteFluentUI.inputFile.clearAll": "Alle entfernen",
	"svelteFluentUI.inputFile.uploadAll": "Alle hochladen",
	"svelteFluentUI.inputFile.addMore": "+ Weitere hinzufügen",
	"svelteFluentUI.inputFile.showMore": "{count} weitere anzeigen",
	"svelteFluentUI.inputFile.showLess": "Weniger anzeigen",
	"svelteFluentUI.inputFile.pending": "Ausstehend",
	"svelteFluentUI.inputFile.uploading": "Wird hochgeladen",
	"svelteFluentUI.inputFile.paused": "Angehalten",
	"svelteFluentUI.inputFile.completed": "Abgeschlossen",
	"svelteFluentUI.inputFile.error": "Fehler",
	"svelteFluentUI.inputFile.cancelled": "Abgebrochen",
	"svelteFluentUI.inputFile.removeAriaLabel": "{item} entfernen",
	"svelteFluentUI.inputFile.removeTooltip": "{item} entfernen",
	"svelteFluentUI.inputFile.retryAriaLabel": "Hochladen wiederholen",
	"svelteFluentUI.inputFile.pauseAriaLabel": "Hochladen anhalten",
	"svelteFluentUI.inputFile.resumeAriaLabel": "Hochladen fortsetzen",
	"svelteFluentUI.inputFile.cancelAriaLabel": "Hochladen abbrechen",
	"svelteFluentUI.inputFile.downloadAriaLabel": "Herunterladen",
	"svelteFluentUI.inputFile.pauseAll": "Alle anhalten",
	"svelteFluentUI.inputFile.resumeAll": "Alle fortsetzen",
	"svelteFluentUI.inputFile.retryAll": "Alle wiederholen",
	"svelteFluentUI.inputFile.fileTooLarge": "Dateigröße überschreitet {max}",
	"svelteFluentUI.inputFile.totalSizeExceeded": "Gesamtgröße würde {max} überschreiten",
	"svelteFluentUI.inputFile.fileTooSmall": "Dateigröße unter {min}",
	"svelteFluentUI.inputFile.fileTypeNotAccepted": "Dateityp nicht erlaubt. Erlaubt: {accept}",
	"svelteFluentUI.inputFile.tooManyFiles": "Höchstens {max} Dateien erlaubt",
	"svelteFluentUI.inputFile.tooFewFiles":
		"{min, plural, one {Mindestens # Datei erforderlich} other {Mindestens # Dateien erforderlich}}",
	"svelteFluentUI.inputFile.duplicate": "Doppelte Datei",
	"svelteFluentUI.inputFile.fileCount": "{count, plural, one {# Datei} other {# Dateien}}",
	"svelteFluentUI.inputFile.totalProgress": "{completed} von {total} fertig · {uploadedSize} / {totalSize}",
	"svelteFluentUI.inputFile.totalProgressWithFailed":
		"{completed} von {total} fertig · {failed} fehlgeschlagen · {uploadedSize} / {totalSize}",
	"svelteFluentUI.inputFile.empty": "Keine Dateien ausgewählt",
	"svelteFluentUI.inputFile.uploadedAnnouncement": "{name} hochgeladen",
	"svelteFluentUI.inputFile.failedAnnouncement": "{name} konnte nicht hochgeladen werden: {error}",

	// Paginator
	"svelteFluentUI.paginator.paginationAriaLabel": "Seitennavigation",
	"svelteFluentUI.paginator.firstPageAriaLabel": "Zur ersten Seite",
	"svelteFluentUI.paginator.firstPageTooltip": "Zur ersten Seite",
	"svelteFluentUI.paginator.previousPageAriaLabel": "Zur vorherigen Seite",
	"svelteFluentUI.paginator.previousPageTooltip": "Zur vorherigen Seite",
	"svelteFluentUI.paginator.nextPageAriaLabel": "Zur nächsten Seite",
	"svelteFluentUI.paginator.nextPageTooltip": "Zur nächsten Seite",
	"svelteFluentUI.paginator.lastPageAriaLabel": "Zur letzten Seite",
	"svelteFluentUI.paginator.lastPageTooltip": "Zur letzten Seite",
	"svelteFluentUI.paginator.pageInfo": "Seite {page} von {pageCount}",
	"svelteFluentUI.paginator.itemCount": "{count, plural, one {# Eintrag} other {# Einträge}}",

	// Panel
	"svelteFluentUI.panel.closeAriaLabel": "Bereich schließen",

	// QuickGrid
	"svelteFluentUI.quickGrid.filterPlaceholder": "Filtern...",
	"svelteFluentUI.quickGrid.filterAriaLabel": "{column} filtern",
	"svelteFluentUI.quickGrid.empty": "Keine Einträge vorhanden",
	"svelteFluentUI.quickGrid.paginationAriaLabel": "Seitennavigation",
	"svelteFluentUI.quickGrid.previousPage": "Zurück",
	"svelteFluentUI.quickGrid.nextPage": "Weiter",
	"svelteFluentUI.quickGrid.pageInfo": "Seite {page} von {pageCount}",
	"svelteFluentUI.quickGrid.itemCount": "{count, plural, one {# Eintrag} other {# Einträge}}",
	"svelteFluentUI.quickGrid.perPage": "pro Seite",
	"svelteFluentUI.quickGrid.sortedBy":
		"Sortiert nach {column}, {direction, select, ascending {aufsteigend} other {absteigend}}",
	"svelteFluentUI.quickGrid.sortCleared": "Sortierung von {column} entfernt",
	"svelteFluentUI.quickGrid.expandAriaLabel": "Aufklappen",
	"svelteFluentUI.quickGrid.expandTooltip": "Aufklappen",
	"svelteFluentUI.quickGrid.collapseAriaLabel": "Zuklappen",
	"svelteFluentUI.quickGrid.collapseTooltip": "Zuklappen",
	"svelteFluentUI.quickGrid.clearFilterToCollapseTooltip": "Filter löschen, um zuzuklappen",
	"svelteFluentUI.quickGrid.rowActionsAriaLabel": "Zeilenaktionen",
	"svelteFluentUI.quickGrid.rowActionsTooltip": "Zeilenaktionen",
	"svelteFluentUI.quickGrid.addRow": "Zeile darunter einfügen",
	"svelteFluentUI.quickGrid.deleteRow": "Zeile löschen",
	"svelteFluentUI.quickGrid.duplicateRow": "Zeile duplizieren",
	"svelteFluentUI.quickGrid.moveRowUp": "Zeile nach oben",
	"svelteFluentUI.quickGrid.moveRowDown": "Zeile nach unten",
	"svelteFluentUI.quickGrid.expandAll": "Alle aufklappen",
	"svelteFluentUI.quickGrid.collapseAll": "Alle zuklappen",
	"svelteFluentUI.quickGrid.expandTree": "Gesamten Baum aufklappen",
	"svelteFluentUI.quickGrid.collapseTree": "Gesamten Baum zuklappen",
	"svelteFluentUI.quickGrid.editing": "Wird bearbeitet...",
	"svelteFluentUI.quickGrid.validatingAriaLabel": "Wird geprüft",
	"svelteFluentUI.quickGrid.validatingTooltip": "Wird geprüft",
	"svelteFluentUI.quickGrid.loadingOptionsAriaLabel": "Optionen werden geladen",
	"svelteFluentUI.quickGrid.loadingOptionsTooltip": "Optionen werden geladen",
	"svelteFluentUI.quickGrid.editAriaLabel": "Bearbeiten",
	"svelteFluentUI.quickGrid.editTooltip": "Bearbeiten",
	"svelteFluentUI.quickGrid.invalidValueTooltip": "Ungültiger Wert",
	"svelteFluentUI.quickGrid.editorEmptyOption": "-- Auswählen --",
	"svelteFluentUI.quickGrid.editorSelectPlaceholder": "Auswählen...",
	"svelteFluentUI.quickGrid.editorSearchPlaceholder": "Zum Suchen tippen...",
	"svelteFluentUI.quickGrid.editorLoading": "Wird geladen...",
	"svelteFluentUI.quickGrid.editorSearching": "Suche läuft...",
	"svelteFluentUI.quickGrid.editorEmpty": "Keine Optionen",
	"svelteFluentUI.quickGrid.editorNoMatches": "Keine passenden Optionen",

	// Select
	"svelteFluentUI.select.clearTooltip": "Auswahl löschen",
	"svelteFluentUI.select.minSelectionRequired":
		"{min, plural, one {Wählen Sie mindestens # Eintrag aus.} other {Wählen Sie mindestens # Einträge aus.}}",

	// SiteSettings
	"svelteFluentUI.siteSettings.heading": "Website-Einstellungen",
	"svelteFluentUI.siteSettings.theme": "Design",
	"svelteFluentUI.siteSettings.themeSystem": "System",
	"svelteFluentUI.siteSettings.themeLight": "Hell",
	"svelteFluentUI.siteSettings.themeDark": "Dunkel",
	"svelteFluentUI.siteSettings.color": "Farbe",
	"svelteFluentUI.siteSettings.neutralColor": "Neutrale Grundfarbe",
	"svelteFluentUI.siteSettings.direction": "Richtung",
	"svelteFluentUI.siteSettings.leftToRight": "Links nach rechts",
	"svelteFluentUI.siteSettings.rightToLeft": "Rechts nach links",
	"svelteFluentUI.siteSettings.persistenceNote":
		"Diese Werte (außer der Richtung) werden im LocalStorage gespeichert und bei Ihrem nächsten Besuch wiederhergestellt.",
	"svelteFluentUI.siteSettings.resetNote":
		"Mit der Schaltfläche „Einstellungen zurücksetzen“ unten kehren Sie zum System-Design und zur Standardfarbe zurück.",
	"svelteFluentUI.siteSettings.reset": "Einstellungen zurücksetzen",
	"svelteFluentUI.siteSettings.ok": "OK",

	// Tabs
	"svelteFluentUI.tabs.closeAriaLabel": "Tab schließen",
	"svelteFluentUI.tabs.closeTooltip": "Schließen",
	"svelteFluentUI.tabs.editNameTooltip": "Klicken, um den Tab-Namen zu bearbeiten",
	"svelteFluentUI.tabs.moreTabsAriaLabel": "Weitere Tabs anzeigen",
	"svelteFluentUI.tabs.scrollBackwardAriaLabel": "Zu vorherigen Tabs scrollen",
	"svelteFluentUI.tabs.scrollForwardAriaLabel": "Zu nächsten Tabs scrollen",

	// TimePicker
	"svelteFluentUI.timePicker.placeholder": "Uhrzeit auswählen",
	"svelteFluentUI.timePicker.openPopupAriaLabel": "Zeitauswahl öffnen",
	"svelteFluentUI.timePicker.popupAriaLabel": "Uhrzeit wählen",
	"svelteFluentUI.timePicker.clearAriaLabel": "Uhrzeit löschen",
	"svelteFluentUI.timePicker.clearTooltip": "Uhrzeit löschen",
	"svelteFluentUI.timePicker.hour": "Stunde",
	"svelteFluentUI.timePicker.minute": "Minute",
	"svelteFluentUI.timePicker.second": "Sekunde",
	"svelteFluentUI.timePicker.period": "Tageszeit",
	"svelteFluentUI.timePicker.am": "AM",
	"svelteFluentUI.timePicker.pm": "PM",
	"svelteFluentUI.timePicker.apply": "OK",

	// Toast
	"svelteFluentUI.toast.dismissAriaLabel": "Schließen",
	"svelteFluentUI.toast.dismissTooltip": "Schließen",

	// ToastContainer
	"svelteFluentUI.toastContainer.closeAriaLabel": "Schließen",
	"svelteFluentUI.toastContainer.successTitle": "Erfolg",
	"svelteFluentUI.toastContainer.errorTitle": "Fehler",
	"svelteFluentUI.toastContainer.warningTitle": "Warnung",
	"svelteFluentUI.toastContainer.infoTitle": "Information",

	// TopNav
	"svelteFluentUI.topNav.openMenuAriaLabel": "Menü öffnen",
	"svelteFluentUI.topNav.closeMenuAriaLabel": "Menü schließen"
}
