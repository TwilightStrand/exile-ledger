import type { ImportError } from "../exchange";
import type { HotkeyAction } from "../hotkeys";
import type { ImportSource } from "../importers";
import type { FolderIcon } from "../model";
import type { GemKind, SocketItemKind } from "../searchChecks";
import type { PanelWidthUnit } from "../settings";
import type { ThemeId } from "../themes";
import type { Game } from "../tradeUrl";
import type { ListingWatcher } from "../watchers";
import { listingDateTime } from "./dateTime";
import type { Messages } from "./en";
import { plural } from "./plural";

const locale = "pl";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, {
		one: `${n} zakładka`,
		few: `${n} zakładki`,
		many: `${n} zakładek`,
		other: `${n} zakładki`,
	});

const folders = (n: number) =>
	plural(locale, n, {
		one: `${n} folder`,
		few: `${n} foldery`,
		many: `${n} folderów`,
		other: `${n} folderu`,
	});

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} wynik`,
		few: `${number(n)} wyniki`,
		many: `${number(n)} wyników`,
		other: `${number(n)} wyniku`,
	});

const fixCorrupted = "Ustaw „Skażony” na „Dowolny” lub „Tak”.";

export const pl: Messages = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Dowolny przedmiot",
		cancel: "Anuluj",
		delete: "Usuń",
		keep: "Zachowaj",
		liveSearch: "Wyszukiwanie na żywo",
		savedToBookmarks: "Zapisano w zakładkach",
		results,
	},
	time: {
		justNow: "przed chwilą",
		minutesAgo: (n: number) => `${n} min temu`,
		hoursAgo: (n: number) => `${n} godz. temu`,
		yesterday: "wczoraj",
		daysAgo: (n: number) => `${n} dn. temu`,
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Zmień rozmiar panelu",
		resizeValue: (percent: number) => `${percent}% szerokości okna`,
		resizeValuePx: (px: number) => `${px} px`,
		collapse: "Zwiń Exile Ledger",
		expand: "Rozwiń Exile Ledger",
		expandTab: "Ledger",
		sections: "Sekcje panelu",
		saveFailed: "Nie udało się zapisać zmiany. Spróbuj ponownie.",
		reloadNeeded:
			"Exile Ledger został zaktualizowany. Odśwież tę stronę, aby dalej zapisywać zmiany.",
		queryTooLarge:
			"To wyszukiwanie jest za duże, by je zapisać. Usuń kilka filtrów statystyk i spróbuj ponownie.",
		dismiss: "Zamknij",
		tabs: {
			bookmarks: "Zakładki",
			history: "Historia",
			pinned: "Przypięte",
			watchers: "Obserwacje",
		},
	},
	currentSearch: {
		heading: "Bieżące wyszukiwanie",
		problems: "Problemy z wyszukiwaniem",
		save: "Zapisz wyszukiwanie",
		empty: "Wyszukaj coś na stronie handlu, a pojawi się tutaj.",
	},
	bookmarks: {
		defaultFolder: "Zapisane wyszukiwania",
		nav: "Zakładki",
		emptyTitle: "Brak zakładek",
		emptyBody:
			"Zapisz wyszukiwanie, aby zachować je tutaj. Foldery synchronizują się z innymi Twoimi przeglądarkami.",
		newFolder: "Nowy folder",
		newFolderName: "Nazwa nowego folderu",
		folderNamePlaceholder: "Nazwa folderu",
		folderName: "Nazwa folderu",
		bookmarkName: "Nazwa zakładki",
		archived: "Zarchiwizowane",
		folderIcon: "Ikona folderu",
		folderIcons: {
			folder: "Folder",
			sword: "Miecz",
			bow: "Łuk",
			shield: "Tarcza",
			helmet: "Hełm",
			ring: "Pierścień",
			amulet: "Amulet",
			gem: "Klejnot",
			flask: "Flakon",
			map: "Mapa",
			coin: "Waluta",
			star: "Gwiazda",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `Zmień nazwę: ${name}`,
		delete: (name: string) => `Usuń ${name}`,
		archive: (name: string) => `Zarchiwizuj ${name}`,
		restore: (name: string) => `Przywróć ${name}`,
		newFolderIn: (name: string) => `Nowy folder w ${name}`,
		changeIcon: (name: string) => `Zmień ikonę: ${name}`,
		copyShareFor: (name: string) => `Kopiuj ciąg udostępniania: ${name}`,
		copyShare: "Kopiuj ciąg udostępniania",
		shareCopied: "Skopiowano ciąg udostępniania",
		copied: "Skopiowano",
		overwrite: (name: string) => `Zastąp ${name} bieżącym wyszukiwaniem`,
		confirmOverwrite: (name: string) =>
			`Zastąpić „${name}” bieżącym wyszukiwaniem?`,
		replace: "Zastąp",
		watch: (name: string) => `Obserwuj nowe wyniki: ${name}`,
		unwatch: (name: string) => `Przestań obserwować nowe wyniki: ${name}`,
		markDone: (name: string) => `Oznacz ${name} jako gotowe`,
		markNotDone: (name: string) => `Oznacz ${name} jako niegotowe`,
		done: "Gotowe",
		more: (name: string) => `Więcej dla ${name}`,
		allDone: "Oznacz wszystko jako gotowe",
		allNotDone: "Oznacz wszystko jako niegotowe",
		changeLeague: "Zmień ligę",
		league: "Liga",
		leaguePlaceholder: "Nazwa ligi, np. Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Wszystko tutaj było już w lidze ${league}.`
				: `Przeniesiono do ${league}: ${bookmarks(n)}.`,
		confirmDeleteBookmark: (name: string) => `Usunąć „${name}”?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} podfolder`,
							few: `${subfolders} podfoldery`,
							many: `${subfolders} podfolderów`,
							other: `${subfolders} podfolderu`,
						})
					: null,
			].filter(Boolean);
			return `Usunąć „${name}”${inside.length ? ` wraz z zawartością: ${inside.join(" i ")}` : ""}?`;
		},
	},
	history: {
		emptyTitle: "Brak historii",
		emptyBody: "Wyszukiwania wykonane na stronie handlu są wyświetlane tutaj.",
		clear: "Wyczyść historię",
		saveAs: (title: string) => `Zapisz ${title} jako zakładkę`,
	},
	watchers: {
		emptyTitle: "Nic nie jest obserwowane",
		emptyBody:
			"Użyj „Obserwuj” przy wyniku lub oka przy zakładce, a Exile Ledger będzie to sprawdzać w tle.",
		needsAccess:
			"Sprawdzanie w tle wymaga zgody na dostęp do strony handlu. Udziel jej na stronie ustawień.",
		allow: "Otwórz ustawienia",
		listings: "Oferty",
		searches: "Wyszukiwania",
		status: {
			listed: "Wystawiona",
			gone: "Sprzedana lub zdjęta",
			back: "Znów wystawiona",
		} satisfies Record<ListingWatcher["status"], string>,
		repriced: (from: string, to: string) => `${from} → ${to}`,
		noPrice: "Brak ceny",
		notChecked: "Jeszcze nie sprawdzono",
		checked: (ago: string) => `sprawdzono ${ago}`,
		retrying: "Strona handlu jest zajęta, spróbujemy później",
		newResults: (n: number) => `${number(n)} now.`,
		total: (n: number) => results(n),
		remove: (name: string) => `Przestań obserwować ${name}`,
		every: (minutes: number) => `co ${minutes} min`,
	},
	notices: {
		goneTitle: (name: string) => `${name}: oferty już nie ma`,
		goneBody: (seller: string) =>
			seller
				? `Sprzedana lub zdjęta przez sprzedawcę ${seller}.`
				: "Sprzedana lub zdjęta.",
		backTitle: (name: string) => `${name}: znów wystawiona`,
		repricedTitle: (name: string) => `${name}: zmieniła się cena`,
		newTitle: (name: string) => `Nowe wyniki: ${name}`,
		moreTitle: (n: number) =>
			plural(locale, n, {
				one: `${number(n)} kolejna zmiana w obserwacjach`,
				few: `${number(n)} kolejne zmiany w obserwacjach`,
				many: `${number(n)} kolejnych zmian w obserwacjach`,
				other: `${number(n)} kolejnej zmiany w obserwacjach`,
			}),
		moreBody:
			"Otwórz kartę Obserwacje w panelu Exile Ledger, aby zobaczyć wszystkie.",
	},
	pins: {
		emptyTitle: "Nic nie jest przypięte",
		emptyBody:
			"Użyj „Przypnij” przy wyniku, aby zachować go tutaj podczas dalszego wyszukiwania.",
		gone: "Już go nie ma na tej stronie",
		noPrice: "Brak ceny",
		unpin: (name: string) => `Odepnij ${name}`,
	},
	trade: {
		watch: "Obserwuj",
		watching: "Obserwowane",
		watchTitle:
			"Sprawdza tę ofertę w tle i powiadamia, gdy zmieni się jej cena lub zostanie sprzedana",
		pin: "Przypnij",
		unpin: "Odepnij",
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		stackValue: (stackSize: number, parts: string[]) =>
			`Stos ${stackSize} wart ≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		listedAt: (at: number) => `Wystawiono ${listingDateTime(undefined, at)}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}P · ${suffixes}S`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} prefiks`, few: `${prefixes} prefiksy`, many: `${prefixes} prefiksów`, other: `${prefixes} prefiksu` })}, ${plural(locale, suffixes, { one: `${suffixes} sufiks`, few: `${suffixes} sufiksy`, many: `${suffixes} sufiksów`, other: `${suffixes} sufiksu` })}`,
		copyItem: "Kopiuj przedmiot",
		copyItemTitle:
			"Kopiuje przedmiot jako tekst z gry, do Path of Building lub wyszukiwania przez wklejenie na stronie handlu",
		copied: "Skopiowano",
		copyFailed: "Nie udało się skopiować",
		wiki: "Wiki",
		wikiTitle: (page: string) => `Otwórz ${page} na wiki`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Poziom przedmiotu ${itemLevel}: maksymalnie ${max} gniazd`,
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Klejnoty Wzmocnienia",
			enlighten: "Klejnoty Oświecenia",
			enhance: "Klejnoty Ulepszenia",
			awakened: "Przebudzone klejnoty",
			any: "Klejnoty",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Hełmy, rękawice i buty",
			shields: "Tarcze",
			"one-handed": "Bronie jednoręczne",
			any: "Przedmioty",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems}: maksymalny poziom to ${maxLevel}, i to tylko po skażeniu. Minimum ${wanted} jest nieosiągalne.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems}: poziom powyżej ${maxLevel} da się uzyskać tylko przez skażenie, ale to wyszukiwanie wyklucza skażone przedmioty. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems}: maksymalna jakość to ${maxQuality}%, i to tylko po skażeniu. Minimum ${wanted}% jest nieosiągalne.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems}: jakość powyżej ${maxQuality}% da się uzyskać tylko przez skażenie, ale to wyszukiwanie wyklucza skażone przedmioty. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}: maksymalna liczba gniazd to ${max}, więc minimum ${wanted} jest nieosiągalne.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items}: maksymalna liczba gniazd to ${max}, więc minimum ${wanted} połączeń jest nieosiągalne.`,
		mirroredAndCorrupted:
			"Skażonych przedmiotów nie można odbić, a odbitych nie można skazić. Ustaw „Dowolny” dla jednego z parametrów: „Odbity” lub „Skażony”.",
		fracturedUnique:
			"Przedmioty unikatowe nigdy nie są pęknięte. Ustaw „Pęknięty” na „Dowolny” lub wybierz inną rzadkość.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter}: minimum ${min} jest większe niż maksimum ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`W grupie statystyk minimum liczby lub sumy (${min}) jest większe niż maksimum (${max}).`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`W filtrze statystyki minimum (${min}) jest większe niż maksimum (${max}).`,
	},
	sync: {
		off: "Synchronizacja jest wyłączona. Zakładki zostają na tym komputerze.",
		on: (ago: string | null, percent: number) =>
			`Zsynchronizowano${ago ? ` ${ago}` : ""} · wykorzystano ${percent}% miejsca synchronizacji`,
		waiting: "Inna przeglądarka zapisuje dane, spróbujemy ponownie za chwilę.",
		quota:
			"Zbyt wiele zakładek do synchronizacji przeglądarki. Twoje zakładki są bezpieczne na tym komputerze; zarchiwizuj lub usuń część, aby wznowić synchronizację.",
		newer:
			"Inna przeglądarka zsynchronizowała dane nowszą wersją Exile Ledger. Zaktualizuj tutaj rozszerzenie, aby wznowić synchronizację; zakładki na tym komputerze są bezpieczne.",
		failed: "Synchronizacja nie powiodła się.",
	},
	imports: {
		title: "Kopie zapasowe i udostępnianie",
		description:
			"Import zawsze dodaje nowe foldery obok Twoich. Nic, co już masz, nie zostanie zmienione ani usunięte.",
		backupLabel: "Utwórz kopię wszystkiego",
		backupHint:
			"Plik ze wszystkimi folderami, zakładkami i ustawieniami. Historia zostaje na tym komputerze.",
		saveBackup: "Zapisz plik kopii",
		restoreLabel: "Przywróć z pliku kopii",
		restoreHint: "Wybierz plik zapisany przez Exile Ledger.",
		chooseFile: "Wybierz plik",
		shareLabel: "Importuj udostępniony folder",
		shareHint:
			"Wklej ciąg skopiowany przez „Kopiuj ciąg udostępniania” przy folderze w panelu albo eksport z Better Trading, Poe Trade Plus lub TFT.",
		shareInput: "Ciąg udostępniania",
		sharePlaceholder: "EL1:…",
		read: "Wczytaj",
		restoreSettings: "Przywróć też ustawienia",
		import: "Importuj",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} i ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Zapisano kopię: ${summary}.`,
		imported: (summary: string) => `Zaimportowano: ${summary}.`,
		watchersFailed: (summary: string) =>
			`Zaimportowano: ${summary}. Nie udało się jednak zapisać obserwacji z kopii zapasowej.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Kopia z ${new Date(exportedAt).toLocaleString(locale)}: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed:
			"Nie udało się zapisać importu. Odśwież tę stronę i spróbuj ponownie.",
		skipped: (n: number) =>
			plural(locale, n, {
				one: `Pominięto ${n} wpis, bo był uszkodzony lub zbyt duży.`,
				few: `Pominięto ${n} wpisy, bo były uszkodzone lub zbyt duże.`,
				many: `Pominięto ${n} wpisów, bo były uszkodzone lub zbyt duże.`,
				other: `Pominięto ${n} wpisu, bo były uszkodzone lub zbyt duże.`,
			}),
		queriesDropped: (n: number) =>
			plural(locale, n, {
				one: `Zachowano ${n} zakładkę bez zapisanego wyszukiwania, które było za duże: otwiera się przez zapisany identyfikator wyszukiwania i nie można jej obserwować.`,
				few: `Zachowano ${n} zakładki bez zapisanych wyszukiwań, które były za duże: otwierają się przez zapisany identyfikator wyszukiwania i nie można ich obserwować.`,
				many: `Zachowano ${n} zakładek bez zapisanych wyszukiwań, które były za duże: otwierają się przez zapisany identyfikator wyszukiwania i nie można ich obserwować.`,
				other: `Zachowano ${n} zakładki bez zapisanych wyszukiwań, które były za duże: otwierają się przez zapisany identyfikator wyszukiwania i nie można ich obserwować.`,
			}),
		sources: {
			"exile-ledger": "Udostępniony folder",
			"better-trading": "Eksport Better Trading",
			"poe-trade-plus": "Eksport Poe Trade Plus",
			tft: "Eksport TFT Trade Extension",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "To nie jest ciąg udostępniania Exile Ledger.",
			"share-damaged": "Ciąg udostępniania jest uszkodzony lub niepełny.",
			"share-empty": "Ciąg udostępniania nie zawiera folderów.",
			"not-backup":
				"Ten plik nie jest kopią zapasową Exile Ledger lub jest uszkodzony.",
			"unknown-format":
				"To nie jest eksport z Exile Ledger, Better Trading ani Poe Trade Plus.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Ustawienia Exile Ledger",
		versionLine: (version: string) => `Ustawienia · wersja ${version}`,
		panel: {
			title: "Panel",
			description: "Jak panel jest umieszczony na stronie handlu.",
			side: "Strona dokowania",
			sides: { left: "Lewa", right: "Prawa" },
			layout: "Układ",
			layoutHint:
				"Nad stroną albo z odsunięciem strony, aby panel nigdy nie zasłaniał wyników.",
			modes: { overlay: "Nad stroną", push: "Odsuń stronę" },
			width: "Szerokość",
			widthHintPercent: (minPx: number, maxPx: number) =>
				`Procent szerokości okna przeglądarki, więc panel rośnie i maleje razem z oknem. Nigdy nie jest węższy niż ${minPx} px ani szerszy niż ${maxPx} px. Możesz też przeciągnąć wewnętrzną krawędź panelu.`,
			widthHintPx: (minPx: number, maxPx: number) =>
				`Stała szerokość w pikselach, od ${minPx} do ${maxPx} px, niezależnie od rozmiaru okna. Możesz też przeciągnąć wewnętrzną krawędź panelu.`,
			widthUnit: "Jednostka szerokości",
			widthUnits: { percent: "%", px: "px" } satisfies Record<
				PanelWidthUnit,
				string
			>,
			widthInput: "Szerokość panelu",
		},
		appearance: {
			title: "Wygląd",
			description:
				"Kolory panelu, tej strony i znaczników, które Exile Ledger dodaje do wyników handlu.",
			theme: "Motyw",
			themes: {
				gold: "Ciemne złoto",
				blood: "Krew",
				verdant: "Zieleń",
				azure: "Lazur",
				bone: "Kość",
			} satisfies Record<ThemeId, string>,
			language: "Język",
			languageHint:
				"Języki inne niż angielski zostały przetłumaczone maszynowo. Poprawki od native speakerów są mile widziane na GitHubie.",
			languageAuto: "Jak w przeglądarce",
			compact: "Tryb kompaktowy",
			compactHint:
				"Niższe wiersze w panelu, żeby zmieściło się więcej zakładek.",
		},
		sync: {
			title: "Synchronizacja",
			description:
				"Zakładki i foldery podążają za Tobą przez konto przeglądarki. Historia zostaje na każdym komputerze.",
			toggle: "Synchronizuj zakładki",
			space: "Miejsce synchronizacji",
		},
		results: {
			title: "Wyniki",
			description: "Dodatki do listy wyników samej strony handlu.",
			highlight: "Podświetlaj szukane modyfikatory",
			highlightHint:
				"Zaznacza w każdym wyniku linie modyfikatorów, po których filtrowało Twoje wyszukiwanie.",
			prices: "Ceny w przeliczeniu",
			pricesHint:
				"Pokazuje każdą cenę w chaosach i boskich (PoE1) lub wywyższonych i boskich (PoE2), według kursów poe.ninja odświeżanych co 30 minut. Włączenie prosi o zgodę na odczyt poe.ninja.",
			pricesMissingAccess:
				"Ceny w przeliczeniu są włączone w innej przeglądarce, ale ta nie ma zgody na odczyt poe.ninja. Włącz przełącznik, aby ją nadać.",
			listingTime: "Dokładny czas wystawienia",
			listingTimeHint:
				"Pokazuje datę i godzinę wystawienia każdego przedmiotu, obok napisu strony w rodzaju „2 godziny temu”.",
			affixCount: "Liczba prefiksów i sufiksów",
			affixCountHint:
				"Pokazuje, ile prefiksów i sufiksów ma każdy przedmiot, na podstawie poziomów modyfikatorów przesyłanych przez stronę.",
			itemTools: "Kopiowanie przedmiotu i link do wiki",
			itemToolsHint:
				"Dodaje przycisk kopiujący przedmiot jako tekst z gry oraz link do strony przedmiotu na wiki.",
			socketWarning: "Ostrzeżenie o gniazdach (PoE1)",
			socketWarningHint:
				"Oznacza przedmioty, których poziom przedmiotu nie pozwala osiągnąć liczby gniazd bazy, np. bazę z 6 gniazdami, która nigdy nie będzie miała 6.",
			pricesDenied:
				"Ceny w przeliczeniu wymagają dostępu do poe.ninja. Nic nie zmieniono.",
		},
		trade: {
			title: "Strona handlu",
			tabTitles: "Tytuły kart",
			tabTitlesHint:
				"Umieszcza w karcie przeglądarki nazwę zakładki albo przedmiot i ligę, ze znakiem ⚡ przy wyszukiwaniach na żywo.",
			fuzzy: "Rozmyte wyszukiwanie przedmiotów",
			fuzzyHint:
				"Dodaje ~ po rozpoczęciu pisania w polu wyszukiwania przedmiotów. Zacznij od spacji, aby szukać dokładnie.",
			fuzzyFilters: "Rozmyte wyszukiwanie filtrów statystyk",
			fuzzyFiltersHint: "To samo dla pól wyboru filtra statystyki.",
			backForward: "Wstecz i Dalej między wyszukiwaniami",
			backForwardHint:
				"Przycisk Wstecz w przeglądarce wraca do poprzedniego wyszukiwania zamiast opuszczać stronę.",
		},
		watchers: {
			title: "Obserwacje",
			description:
				"Obserwowane oferty i wyszukiwania są sprawdzane w tle, nie częściej, niż pozwalają limity zapytań GGG.",
			access: "Dostęp do strony handlu",
			accessHint:
				"Potrzebny do sprawdzania w tle. Przeglądarka zapyta raz; zapytania trafiają tylko na oficjalną stronę handlu.",
			allowed: "Zezwolono",
			allow: "Zezwól",
			denied:
				"Brak zgody. Obserwacje pozostają wstrzymane, dopóki jej nie udzielisz.",
			interval: "Sprawdzaj co",
			intervalHint: (min: number) =>
				`Minut między sprawdzeniami dla nowych obserwacji, co najmniej ${min}. Po każdym nieudanym sprawdzeniu przerwa się podwaja.`,
			intervalInput: "Minut między sprawdzeniami",
			notify: "Powiadomienia",
			notifyHint:
				"Powiadomienie przeglądarki, gdy obserwowana oferta zostanie sprzedana, wróci lub zmieni cenę, albo obserwowane wyszukiwanie ma nowe wyniki. Włączenie prosi o zgodę jednorazowo.",
			notifyMissingAccess:
				"Powiadomienia są włączone w innej przeglądarce, ale ta na nie nie zezwoliła. Włącz przełącznik, aby zezwolić na nie tutaj.",
			notifyDenied:
				"Powiadomienia wymagają zgody przeglądarki. Nic nie zmieniono.",
		},
		hotkeys: {
			title: "Skróty klawiszowe",
			description:
				"Na stronie handlu. Skróty pola wyszukiwania działają też podczas pisania w nim.",
			actions: {
				togglePanel: "Pokaż lub ukryj panel",
				focusItemSearch: "Przejdź do wyszukiwania przedmiotów",
				addStatFilter: "Dodaj filtr statystyki",
				clearSearch: "Wyczyść wyszukiwanie",
				focusMin: "Przejdź do minimum filtra statystyki",
				focusMax: "Przejdź do maksimum filtra statystyki",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Nie ustawiono",
			recording: "Naciśnij klawisze",
			recordingHint: "Naciśnij nowy skrót lub Escape, aby anulować.",
			change: (action: string) => `Zmień skrót: ${action}`,
			remove: (action: string) => `Usuń skrót: ${action}`,
			reset: "Przywróć domyślne",
			reserved: (combo: string) =>
				`${combo} to skrót przeglądarki. Wybierz inny.`,
			taken: (combo: string, action: string) =>
				`${combo} jest już używany dla „${action}”.`,
		},
		history: {
			title: "Historia",
			record: "Zapisuj wyszukiwania",
			recordHint: "Przechowywane tylko na tym komputerze, do 200 na grę.",
			clearAll: "Wyczyść całą historię",
			clearAllHint: "Obie gry, na tym komputerze.",
			clear: "Wyczyść historię",
			cleared: "Historia wyczyszczona.",
		},
		about: {
			title: "O rozszerzeniu i prywatność",
			body: "Exile Ledger przechowuje Twoje zakładki w przeglądarce i synchronizuje je przez konto przeglądarki. Nie wysyła niczego nigdzie indziej: bez analityki, bez śledzenia, i nigdy nie odczytuje Twojej sesji Path of Exile. Widzi tylko wyszukiwania handlowe, które wykonuje Twoja własna strona.",
		},
	},
	popup: {
		version: (version: string) => `Wersja ${version}`,
		body: "Panel znajduje się na stronie handlu. Ustawienia, kopie zapasowe i importy są na stronie ustawień.",
		openSettings: "Otwórz ustawienia",
	},
};
