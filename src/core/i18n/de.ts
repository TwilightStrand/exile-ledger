import type { ImportError } from "../exchange";
import type { HotkeyAction } from "../hotkeys";
import type { ImportSource } from "../importers";
import type { FolderIcon } from "../model";
import type { GemKind, SocketItemKind } from "../searchChecks";
import type { PanelWidthUnit } from "../settings";
import type { ThemeId } from "../themes";
import type { Game } from "../tradeUrl";
import type { ListingWatcher } from "../watchers";
import type { Messages } from "./en";
import { plural } from "./plural";

const locale = "de";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, { one: `${n} Lesezeichen`, other: `${n} Lesezeichen` });

const folders = (n: number) =>
	plural(locale, n, { one: `${n} Ordner`, other: `${n} Ordner` });

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} Ergebnis`,
		other: `${number(n)} Ergebnisse`,
	});

const fixCorrupted = "Setze „Verderbt“ auf „Egal“ oder „Ja“.";

export const de: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Beliebiger Gegenstand",
		cancel: "Abbrechen",
		delete: "Löschen",
		keep: "Behalten",
		liveSearch: "Live-Suche",
		savedToBookmarks: "In Lesezeichen gespeichert",
		results,
	},
	time: {
		justNow: "gerade eben",
		minutesAgo: (n: number) => `vor ${n} Min.`,
		hoursAgo: (n: number) => `vor ${n} Std.`,
		yesterday: "gestern",
		daysAgo: (n: number) => `vor ${n} T.`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Panelgröße ändern",
		resizeValue: (percent: number) => `${percent} % des Fensters`,
		resizeValuePx: (px: number) => `${px} px`,
		collapse: "Exile Ledger einklappen",
		expand: "Exile Ledger ausklappen",
		expandTab: "Ledger",
		sections: "Panelbereiche",
		tabs: {
			bookmarks: "Lesezeichen",
			history: "Verlauf",
			pinned: "Angepinnt",
			watchers: "Beobachten",
		},
	},
	currentSearch: {
		heading: "Aktuelle Suche",
		problems: "Suchprobleme",
		save: "Suche speichern",
		empty: "Starte eine Suche auf der Handelsseite, dann erscheint sie hier.",
	},
	bookmarks: {
		defaultFolder: "Gespeicherte Suchen",
		nav: "Lesezeichen",
		emptyTitle: "Noch keine Lesezeichen",
		emptyBody:
			"Speichere eine Suche, um sie hier aufzubewahren. Ordner werden mit deinen anderen Browsern synchronisiert.",
		newFolder: "Neuer Ordner",
		newFolderName: "Name des neuen Ordners",
		folderNamePlaceholder: "Ordnername",
		folderName: "Ordnername",
		bookmarkName: "Name des Lesezeichens",
		archived: "Archiviert",
		folderIcon: "Ordnersymbol",
		folderIcons: {
			folder: "Ordner",
			sword: "Schwert",
			bow: "Bogen",
			shield: "Schild",
			helmet: "Helm",
			ring: "Ring",
			amulet: "Amulett",
			gem: "Edelstein",
			flask: "Flakon",
			map: "Karte",
			coin: "Währung",
			star: "Stern",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `${name} umbenennen`,
		delete: (name: string) => `${name} löschen`,
		archive: (name: string) => `${name} archivieren`,
		restore: (name: string) => `${name} wiederherstellen`,
		newFolderIn: (name: string) => `Neuer Ordner in ${name}`,
		changeIcon: (name: string) => `Symbol von ${name} ändern`,
		copyShareFor: (name: string) => `Freigabetext für ${name} kopieren`,
		copyShare: "Freigabetext kopieren",
		shareCopied: "Freigabetext kopiert",
		copied: "Kopiert",
		overwrite: (name: string) => `${name} durch die aktuelle Suche ersetzen`,
		confirmOverwrite: (name: string) =>
			`„${name}“ durch die aktuelle Suche ersetzen?`,
		replace: "Ersetzen",
		watch: (name: string) => `${name} auf neue Ergebnisse beobachten`,
		unwatch: (name: string) =>
			`Beobachtung von ${name} auf neue Ergebnisse beenden`,
		markDone: (name: string) => `${name} als erledigt markieren`,
		markNotDone: (name: string) => `${name} als nicht erledigt markieren`,
		done: "Erledigt",
		more: (name: string) => `Mehr für ${name}`,
		allDone: "Alle als erledigt markieren",
		allNotDone: "Alle als nicht erledigt markieren",
		changeLeague: "Liga ändern",
		league: "Liga",
		leaguePlaceholder: "Liganame, z. B. Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Alles hier war bereits in ${league}.`
				: `${bookmarks(n)} nach ${league} verschoben.`,
		confirmDeleteBookmark: (name: string) => `„${name}“ löschen?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} Unterordner`,
							other: `${subfolders} Unterordner`,
						})
					: null,
			].filter(Boolean);
			return `„${name}“${inside.length ? ` und ${inside.length > 1 ? "die enthaltenen" : "das enthaltene"} ${inside.join(" und ")}` : ""} löschen?`;
		},
	},
	history: {
		emptyTitle: "Noch kein Verlauf",
		emptyBody: "Suchen, die du auf der Handelsseite startest, stehen hier.",
		clear: "Verlauf löschen",
		saveAs: (title: string) => `${title} als Lesezeichen speichern`,
	},
	watchers: {
		emptyTitle: "Nichts beobachtet",
		emptyBody:
			"Nutze „Beobachten“ bei einem Ergebnis oder das Auge bei einem Lesezeichen, dann prüft Exile Ledger es im Hintergrund.",
		needsAccess:
			"Hintergrundprüfungen brauchen die Berechtigung, auf die Handelsseite zuzugreifen. Erlaube das auf der Einstellungsseite.",
		allow: "Einstellungen öffnen",
		listings: "Angebote",
		searches: "Suchen",
		status: {
			listed: "Angeboten",
			gone: "Verkauft oder entfernt",
			back: "Wieder angeboten",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "Kein Preis",
		notChecked: "Noch nicht geprüft",
		checked: (ago: string) => `geprüft ${ago}`,
		retrying: "Handelsseite ausgelastet, neuer Versuch später",
		newResults: (n: number) => `${number(n)} neu`,
		total: (n: number) => results(n),
		remove: (name: string) => `Beobachtung von ${name} beenden`,
		every: (minutes: number) => `alle ${minutes} Min.`,
	},
	notices: {
		goneTitle: (name: string) => `${name} ist weg`,
		goneBody: (seller: string) =>
			seller
				? `Verkauft oder entfernt von ${seller}.`
				: "Verkauft oder entfernt.",
		backTitle: (name: string) => `${name} wird wieder angeboten`,
		repricedTitle: (name: string) => `Preis von ${name} geändert`,
		newTitle: (name: string) => `Neue Ergebnisse für ${name}`,
		moreTitle: (n: number) =>
			plural(locale, n, {
				one: `${number(n)} weitere Beobachtungsmeldung`,
				other: `${number(n)} weitere Beobachtungsmeldungen`,
			}),
		moreBody:
			"Öffne den Tab Beobachten im Exile-Ledger-Panel, um alle zu sehen.",
	},
	pins: {
		emptyTitle: "Nichts angepinnt",
		emptyBody:
			"Nutze „Anpinnen“ bei einem Ergebnis, um es hier zu behalten, während du weitersuchst.",
		gone: "Nicht mehr auf dieser Seite",
		noPrice: "Kein Preis",
		unpin: (name: string) => `${name} lösen`,
	},
	trade: {
		watch: "Beobachten",
		watching: "Beobachtet",
		watchTitle:
			"Prüft dieses Angebot im Hintergrund und meldet sich, wenn sich der Preis ändert oder es verkauft wird",
		pin: "Anpinnen",
		unpin: "Lösen",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`Stapel mit ${stackSize} Stück im Wert von ≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) =>
			`Angeboten ${new Date(at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}P · ${suffixes}S`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} Präfix`, other: `${prefixes} Präfixe` })}, ${plural(locale, suffixes, { one: `${suffixes} Suffix`, other: `${suffixes} Suffixe` })}`,
		copyItem: "Gegenstand kopieren",
		copyItemTitle:
			"Kopiert den Gegenstand als Spieltext, für Path of Building oder die Einfügesuche der Handelsseite",
		copied: "Kopiert",
		copyFailed: "Kopieren fehlgeschlagen",
		wiki: "Wiki",
		wikiTitle: (page: string) => `${page} im Wiki öffnen`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Gegenstandsstufe ${itemLevel}: höchstens ${max} Sockel`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Ermächtigungs-Edelsteine",
			enlighten: "Erleuchtungs-Edelsteine",
			enhance: "Verbesserungs-Edelsteine",
			awakened: "Erwachte Edelsteine",
			any: "Edelsteine",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Helme, Handschuhe und Stiefel",
			shields: "Schilde",
			"one-handed": "Einhandwaffen",
			any: "Gegenstände",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems} erreichen höchstens Stufe ${maxLevel}, und nur wenn verderbt. Nichts kann ein Minimum von ${wanted} erfüllen.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems} kommen nur durch Verderbnis über Stufe ${maxLevel}, aber diese Suche schließt verderbte Gegenstände aus. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems} erreichen höchstens ${maxQuality} % Qualität, und nur wenn verderbt. Nichts kann ein Minimum von ${wanted} % erfüllen.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems} kommen nur durch Verderbnis über ${maxQuality} % Qualität, aber diese Suche schließt verderbte Gegenstände aus. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} haben höchstens ${max} Sockel, daher kann nichts ein Minimum von ${wanted} Sockeln erfüllen.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} haben höchstens ${max} Sockel, daher kann nichts ein Minimum von ${wanted} Verbindungen erfüllen.`,
		mirroredAndCorrupted:
			"Verderbte Gegenstände können nicht gespiegelt sein, und gespiegelte Gegenstände können nicht verderbt sein. Setze „Gespiegelt“ oder „Verderbt“ auf „Egal“.",
		fracturedUnique:
			"Einzigartige Gegenstände sind nie zersplittert. Setze „Zersplittert“ auf „Egal“ oder wähle eine andere Seltenheit.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter} hat ein Minimum von ${min} über dem Maximum von ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`Die Anzahl oder Summe einer Eigenschaftsgruppe hat ein Minimum von ${min} über dem Maximum von ${max}.`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`Ein Eigenschaftsfilter hat ein Minimum von ${min} über dem Maximum von ${max}.`,
	},
	sync: {
		off: "Synchronisierung ist aus. Lesezeichen bleiben auf diesem Gerät.",
		on: (ago: string | null, percent: number) =>
			`Synchronisiert${ago ? ` ${ago}` : ""} · ${percent} % des Sync-Speichers belegt`,
		waiting: "Ein anderer Browser schreibt gerade; neuer Versuch gleich.",
		quota:
			"Zu viele Lesezeichen für die Browser-Synchronisierung. Deine Lesezeichen sind auf diesem Gerät sicher; archiviere oder lösche einige, um die Synchronisierung fortzusetzen.",
		newer:
			"Ein anderer Browser hat mit einer neueren Version von Exile Ledger synchronisiert. Aktualisiere die Erweiterung hier, um weiter zu synchronisieren; deine Lesezeichen auf diesem Gerät sind sicher.",
		failed: "Synchronisierung fehlgeschlagen.",
	},
	imports: {
		title: "Sicherung und Teilen",
		description:
			"Importe fügen immer neue Ordner neben deinen hinzu. Nichts, was du schon hast, wird geändert oder entfernt.",
		backupLabel: "Alles sichern",
		backupHint:
			"Eine Datei mit allen Ordnern, Lesezeichen und Einstellungen. Der Verlauf bleibt auf diesem Gerät.",
		saveBackup: "Sicherungsdatei speichern",
		restoreLabel: "Aus einer Sicherungsdatei wiederherstellen",
		restoreHint: "Wähle eine von Exile Ledger gespeicherte Datei.",
		chooseFile: "Datei wählen",
		shareLabel: "Freigegebenen Ordner importieren",
		shareHint:
			"Füge einen Text ein, der mit „Freigabetext kopieren“ bei einem Ordner im Panel kopiert wurde, oder einen Export von Better Trading, Poe Trade Plus oder TFT.",
		shareInput: "Freigabetext",
		sharePlaceholder: "EL1:…",
		read: "Lesen",
		restoreSettings: "Einstellungen ebenfalls wiederherstellen",
		import: "Importieren",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} und ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Sicherung gespeichert mit ${summary}.`,
		imported: (summary: string) => `Importiert: ${summary}.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Sicherung vom ${new Date(exportedAt).toLocaleString(locale)}: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed:
			"Der Import konnte nicht gespeichert werden. Lade diese Seite neu und versuche es erneut.",
		sources: {
			"exile-ledger": "Freigegebener Ordner",
			"better-trading": "Better-Trading-Export",
			"poe-trade-plus": "Poe-Trade-Plus-Export",
			tft: "TFT-Trade-Extension-Export",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "Das ist kein Exile-Ledger-Freigabetext.",
			"share-damaged": "Der Freigabetext ist beschädigt oder unvollständig.",
			"share-empty": "Der Freigabetext enthält keine Ordner.",
			"not-backup":
				"Diese Datei ist keine Exile-Ledger-Sicherung oder sie ist beschädigt.",
			"unknown-format":
				"Das ist kein Export von Exile Ledger, Better Trading oder Poe Trade Plus.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Exile-Ledger-Einstellungen",
		versionLine: (version: string) => `Einstellungen · Version ${version}`,
		panel: {
			title: "Panel",
			description: "Wie das Panel auf der Handelsseite sitzt.",
			side: "Andockseite",
			sides: { left: "Links", right: "Rechts" },
			layout: "Layout",
			layoutHint:
				"Über der Seite schweben oder die Seite beiseiteschieben, damit das Panel nie Ergebnisse verdeckt.",
			modes: { overlay: "Schweben", push: "Beiseiteschieben" },
			width: "Breite",
			widthHintPercent: (minPx: number, maxPx: number) =>
				`Prozent des Browserfensters, das Panel wächst und schrumpft also mit dem Fenster. Es wird nie schmaler als ${minPx} px oder breiter als ${maxPx} px. Du kannst auch den Innenrand des Panels ziehen.`,
			widthHintPx: (minPx: number, maxPx: number) =>
				`Eine feste Breite in Pixeln, von ${minPx} bis ${maxPx} px, unabhängig von der Fenstergröße. Du kannst auch den Innenrand des Panels ziehen.`,
			widthUnit: "Einheit der Breite",
			widthUnits: { percent: "%", px: "px" } satisfies Record<
				PanelWidthUnit,
				string
			>,
			widthInput: "Panelbreite",
		},
		appearance: {
			title: "Darstellung",
			description:
				"Farben für das Panel, diese Seite und die Markierungen, die Exile Ledger zu Handelsergebnissen hinzufügt.",
			theme: "Design",
			themes: {
				gold: "Dunkles Gold",
				blood: "Blut",
				verdant: "Grün",
				azure: "Azur",
				bone: "Knochen",
			} satisfies Record<ThemeId, string>,
			language: "Sprache",
			languageHint:
				"Andere Sprachen als Englisch wurden maschinell übersetzt. Korrekturen von Muttersprachlern sind auf GitHub willkommen.",
			languageAuto: "Wie der Browser",
			compact: "Kompakter Modus",
			compactHint: "Kürzere Zeilen im Panel, damit mehr Lesezeichen passen.",
		},
		sync: {
			title: "Synchronisierung",
			description:
				"Lesezeichen und Ordner folgen dir über dein Browserkonto. Der Verlauf bleibt auf jedem Gerät.",
			toggle: "Lesezeichen synchronisieren",
			space: "Sync-Speicher",
		},
		results: {
			title: "Ergebnisse",
			description: "Ergänzungen zur Ergebnisliste der Handelsseite.",
			highlight: "Gesuchte Modifikatoren hervorheben",
			highlightHint:
				"Markiert die Modifikatorzeilen jedes Ergebnisses, nach denen deine Suche gefiltert hat.",
			prices: "Äquivalente Preise",
			pricesHint:
				"Zeigt jeden Preis in Chaos und Divine (PoE1) oder Exalted und Divine (PoE2), mit poe.ninja-Kursen, die alle 30 Minuten aktualisiert werden. Beim Einschalten wird um die Berechtigung gebeten, poe.ninja zu lesen.",
			pricesMissingAccess:
				"Äquivalente Preise sind in einem anderen Browser aktiv, aber dieser darf poe.ninja nicht lesen. Schalte den Schalter ein, um es zu erlauben.",
			listingTime: "Genaue Angebotszeit",
			listingTimeHint:
				"Zeigt Datum und Uhrzeit, zu der jeder Gegenstand angeboten wurde, neben dem „vor 2 Stunden“ der Seite.",
			affixCount: "Anzahl Präfixe und Suffixe",
			affixCountHint:
				"Zeigt, wie viele Präfixe und Suffixe jeder Gegenstand hat, anhand der Modifikatorstufen, die die Seite sendet.",
			itemTools: "Gegenstand kopieren und Wiki-Link",
			itemToolsHint:
				"Fügt eine Schaltfläche hinzu, die den Gegenstand als Spieltext kopiert, und einen Link zur Wiki-Seite des Gegenstands.",
			socketWarning: "Sockelwarnung (PoE1)",
			socketWarningHint:
				"Weist auf Gegenstände hin, deren Gegenstandsstufe sie unter der Sockelzahl der Basis hält, etwa eine Basis mit 6 Sockeln, die nie 6 haben kann.",
			pricesDenied:
				"Äquivalente Preise brauchen Zugriff auf poe.ninja. Nichts wurde geändert.",
		},
		trade: {
			title: "Handelsseite",
			tabTitles: "Tab-Titel",
			tabTitlesHint:
				"Setzt den Lesezeichennamen oder Gegenstand und Liga in den Browser-Tab, mit ⚡ bei Live-Suchen.",
			fuzzy: "Unscharfe Gegenstandssuche",
			fuzzyHint:
				"Fügt ~ hinzu, sobald du im Gegenstandssuchfeld zu tippen beginnst. Beginne mit einem Leerzeichen für eine exakte Suche.",
			fuzzyFilters: "Unscharfe Suche für Eigenschaftsfilter",
			fuzzyFiltersHint:
				"Dasselbe für die Felder, in denen du einen Eigenschaftsfilter wählst.",
			backForward: "Zurück und Vor zwischen Suchen",
			backForwardHint:
				"Die Zurück-Schaltfläche des Browsers führt zu deiner vorherigen Suche, statt die Seite zu verlassen.",
		},
		watchers: {
			title: "Beobachter",
			description:
				"Beobachtete Angebote und Suchen werden im Hintergrund geprüft, höchstens so oft, wie die Ratenlimits von GGG es erlauben.",
			access: "Zugriff auf die Handelsseite",
			accessHint:
				"Für Hintergrundprüfungen nötig. Dein Browser fragt einmal; Anfragen gehen nur an die offizielle Handelsseite.",
			allowed: "Erlaubt",
			allow: "Erlauben",
			denied: "Nicht erlaubt. Beobachter bleiben pausiert, bis du es erlaubst.",
			interval: "Prüfen alle",
			intervalHint: (min: number) =>
				`Minuten zwischen Prüfungen für neue Beobachter, mindestens ${min}. Jede fehlgeschlagene Prüfung wartet doppelt so lange wie die letzte.`,
			intervalInput: "Minuten zwischen Prüfungen",
			notify: "Benachrichtigungen",
			notifyHint:
				"Eine Browser-Benachrichtigung, wenn ein beobachtetes Angebot verkauft wird, zurückkommt oder den Preis ändert, oder eine beobachtete Suche neue Ergebnisse hat. Beim Einschalten wird einmal um Erlaubnis gebeten.",
			notifyMissingAccess:
				"Benachrichtigungen sind in einem anderen Browser an, aber dieser hat sie nicht erlaubt. Schalte sie ein, um sie hier zu erlauben.",
			notifyDenied:
				"Benachrichtigungen brauchen die Erlaubnis deines Browsers. Nichts wurde geändert.",
		},
		hotkeys: {
			title: "Tastenkürzel",
			description:
				"Auf der Handelsseite. Die Kürzel für das Suchfeld funktionieren auch, während du in einem tippst.",
			actions: {
				togglePanel: "Panel ein- oder ausblenden",
				focusItemSearch: "Zur Gegenstandssuche springen",
				addStatFilter: "Eigenschaftsfilter hinzufügen",
				clearSearch: "Suche leeren",
				focusMin: "Zum Min-Feld des Eigenschaftsfilters springen",
				focusMax: "Zum Max-Feld des Eigenschaftsfilters springen",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Nicht belegt",
			recording: "Tasten drücken",
			recordingHint: "Drücke das neue Kürzel oder Escape zum Abbrechen.",
			change: (action: string) => `Kürzel für ${action} ändern`,
			remove: (action: string) => `Kürzel für ${action} entfernen`,
			reset: "Auf Standard zurücksetzen",
			reserved: (combo: string) =>
				`${combo} ist ein Browser-Kürzel. Wähle ein anderes.`,
			taken: (combo: string, action: string) =>
				`${combo} wird bereits für „${action}“ verwendet.`,
		},
		history: {
			title: "Verlauf",
			record: "Suchen aufzeichnen",
			recordHint: "Nur auf diesem Gerät gespeichert, bis zu 200 pro Spiel.",
			clearAll: "Gesamten Verlauf löschen",
			clearAllHint: "Beide Spiele, auf diesem Gerät.",
			clear: "Verlauf löschen",
			cleared: "Verlauf gelöscht.",
		},
		about: {
			title: "Über und Datenschutz",
			body: "Exile Ledger speichert deine Lesezeichen in deinem Browser und synchronisiert sie über dein Browserkonto. Es sendet nichts anderswohin: keine Analysen, kein Tracking, und es liest nie deine Path-of-Exile-Sitzung. Es sieht nur die Handelssuchen, die deine eigene Seite macht.",
		},
	},
	popup: {
		version: (version: string) => `Version ${version}`,
		body: "Das Panel lebt auf der Handelsseite. Einstellungen, Sicherungen und Importe findest du auf der Einstellungsseite.",
		openSettings: "Einstellungen öffnen",
	},
};
