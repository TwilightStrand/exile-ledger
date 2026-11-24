import type { ImportError } from "../exchange";
import type { HotkeyAction } from "../hotkeys";
import type { ImportSource } from "../importers";
import type { FolderIcon } from "../model";
import type { GemKind, SocketItemKind } from "../searchChecks";
import type { ThemeId } from "../themes";
import type { Game } from "../tradeUrl";
import { plural } from "./plural";

const locale = "en";

const number = (n: number) =>
	n.toLocaleString(locale, { maximumFractionDigits: 20 });

const bookmarks = (n: number) =>
	plural(locale, n, { one: `${n} bookmark`, other: `${n} bookmarks` });

const folders = (n: number) =>
	plural(locale, n, { one: `${n} folder`, other: `${n} folders` });

const results = (n: number) =>
	plural(locale, n, {
		one: `${number(n)} result`,
		other: `${number(n)} results`,
	});

const fixCorrupted = "Set Corrupted to Any or Yes.";

export const en = {
	app: {
		name: "Exile Ledger",
	},
	format: {
		number,
	},
	common: {
		games: { poe1: "PoE1", poe2: "PoE2" } satisfies Record<Game, string>,
		anyItem: "Any item",
		cancel: "Cancel",
		delete: "Delete",
		keep: "Keep",
		liveSearch: "Live search",
		savedToBookmarks: "Saved to bookmarks",
		results,
	},
	time: {
		justNow: "just now",
		minutesAgo: (n: number) => `${n}m ago`,
		hoursAgo: (n: number) => `${n}h ago`,
		yesterday: "yesterday",
		daysAgo: (n: number) => `${n}d ago`,
		/** Older than a week: a short date such as "Oct 14". */
		date: (at: number) =>
			new Date(at).toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
				timeZone: "UTC",
			}),
	},
	panel: {
		resize: "Resize panel",
		resizeValue: (percent: number) => `${percent}% of the window`,
		collapse: "Collapse Exile Ledger",
		expand: "Expand Exile Ledger",
		expandTab: "Ledger",
		sections: "Panel sections",
		tabs: {
			bookmarks: "Bookmarks",
			history: "History",
			pinned: "Pinned",
		},
	},
	currentSearch: {
		heading: "Current search",
		problems: "Search problems",
		save: "Save search",
		empty: "Run a search on the trade site and it shows up here.",
	},
	bookmarks: {
		/** Name of the folder a first save creates; also how later saves find it. */
		defaultFolder: "Saved searches",
		nav: "Bookmarks",
		emptyTitle: "No bookmarks yet",
		emptyBody:
			"Save a search to keep it here. Folders sync to your other browsers.",
		newFolder: "New folder",
		newFolderName: "New folder name",
		folderNamePlaceholder: "Folder name",
		folderName: "Folder name",
		bookmarkName: "Bookmark name",
		archived: "Archived",
		folderIcon: "Folder icon",
		folderIcons: {
			folder: "Folder",
			sword: "Sword",
			bow: "Bow",
			shield: "Shield",
			helmet: "Helmet",
			ring: "Ring",
			amulet: "Amulet",
			gem: "Gem",
			flask: "Flask",
			map: "Map",
			coin: "Currency",
			star: "Star",
		} satisfies Record<FolderIcon, string>,
		rename: (name: string) => `Rename ${name}`,
		delete: (name: string) => `Delete ${name}`,
		archive: (name: string) => `Archive ${name}`,
		restore: (name: string) => `Restore ${name}`,
		newFolderIn: (name: string) => `New folder in ${name}`,
		changeIcon: (name: string) => `Change icon of ${name}`,
		copyShareFor: (name: string) => `Copy share string for ${name}`,
		copyShare: "Copy share string",
		shareCopied: "Share string copied",
		copied: "Copied",
		overwrite: (name: string) => `Replace ${name} with the current search`,
		confirmOverwrite: (name: string) =>
			`Replace “${name}” with the current search?`,
		replace: "Replace",
		markDone: (name: string) => `Mark ${name} done`,
		markNotDone: (name: string) => `Mark ${name} not done`,
		done: "Done",
		more: (name: string) => `More for ${name}`,
		allDone: "Mark all done",
		allNotDone: "Mark all not done",
		changeLeague: "Change league",
		league: "League",
		leaguePlaceholder: "League name, e.g. Standard",
		leagueChanged: (n: number, league: string) =>
			n === 0
				? `Everything here was already in ${league}.`
				: `Moved ${bookmarks(n)} to ${league}.`,
		confirmDeleteBookmark: (name: string) => `Delete “${name}”?`,
		confirmDeleteFolder: (
			name: string,
			bookmarkCount: number,
			subfolders: number,
		) => {
			const inside = [
				bookmarkCount > 0 ? bookmarks(bookmarkCount) : null,
				subfolders > 0
					? plural(locale, subfolders, {
							one: `${subfolders} subfolder`,
							other: `${subfolders} subfolders`,
						})
					: null,
			].filter(Boolean);
			return `Delete “${name}”${inside.length ? ` and its ${inside.join(" and ")}` : ""}?`;
		},
	},
	history: {
		emptyTitle: "No history yet",
		emptyBody: "Searches you run on the trade site are listed here.",
		clear: "Clear history",
		saveAs: (title: string) => `Save ${title} as bookmark`,
	},
	pins: {
		emptyTitle: "Nothing pinned",
		emptyBody: "Use Pin on a result to keep it here while you keep searching.",
		gone: "Not on this page any more",
		noPrice: "No price",
		unpin: (name: string) => `Unpin ${name}`,
	},
	trade: {
		pin: "Pin",
		unpin: "Unpin",
		/** Under a listing's price: "≈ 74.1 c · 0.088 div". */
		priceEquivalents: (parts: string[]) => `≈ ${parts.join(" · ")}`,
		currencyShort: {
			chaos: "c",
			divine: "div",
			exalted: "ex",
		} satisfies Record<string, string>,
		/** Exact listing time, in the browser's own locale and time zone. */
		listedAt: (at: number) =>
			`Listed ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
		affixes: (prefixes: number, suffixes: number) =>
			`${prefixes}P · ${suffixes}S`,
		affixesTitle: (prefixes: number, suffixes: number) =>
			`${plural(locale, prefixes, { one: `${prefixes} prefix`, other: `${prefixes} prefixes` })}, ${plural(locale, suffixes, { one: `${suffixes} suffix`, other: `${suffixes} suffixes` })}`,
		copyItem: "Copy item",
		copyItemTitle:
			"Copies the item as in-game text, for Path of Building or the trade site's paste search",
		copied: "Copied",
		copyFailed: "Copy failed",
		wiki: "Wiki",
		wikiTitle: (page: string) => `Open ${page} on the wiki`,
		socketShortfall: (itemLevel: number, max: number) =>
			`Item level ${itemLevel}: at most ${max} sockets`,
		/** The tab title segment for an unsaved search. */
		titleSegment: (item: string, league: string) => `${item} (${league})`,
	},
	searchChecks: {
		gems: {
			empower: "Empower gems",
			enlighten: "Enlighten gems",
			enhance: "Enhance gems",
			awakened: "Awakened gems",
			any: "Gems",
		} satisfies Record<GemKind, string>,
		socketItems: {
			"helmets-gloves-boots": "Helmets, gloves and boots",
			shields: "Shields",
			"one-handed": "One-handed weapons",
			any: "Items",
		} satisfies Record<SocketItemKind, string>,
		gemLevelOutOfReach: (gems: string, maxLevel: number, wanted: number) =>
			`${gems} top out at level ${maxLevel}, and only when corrupted. Nothing can match a minimum of ${wanted}.`,
		gemLevelNeedsCorruption: (gems: string, maxLevel: number) =>
			`${gems} only go above level ${maxLevel} by corrupting, but this search excludes corrupted items. ${fixCorrupted}`,
		gemQualityOutOfReach: (gems: string, maxQuality: number, wanted: number) =>
			`${gems} top out at ${maxQuality}% quality, and only when corrupted. Nothing can match a minimum of ${wanted}%.`,
		gemQualityNeedsCorruption: (gems: string, maxQuality: number) =>
			`${gems} only go above ${maxQuality}% quality by corrupting, but this search excludes corrupted items. ${fixCorrupted}`,
		socketsOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} have at most ${max} sockets, so nothing can match a minimum of ${wanted} sockets.`,
		linksOutOfReach: (items: string, max: number, wanted: number) =>
			`${items} have at most ${max} sockets, so nothing can match a minimum of ${wanted} links.`,
		mirroredAndCorrupted:
			"Corrupted items cannot be mirrored, and mirrored items cannot be corrupted. Set one of Mirrored or Corrupted to Any.",
		fracturedUnique:
			"Unique items are never fractured. Set Fractured to Any or pick another rarity.",
		filterMinAboveMax: (filter: string, min: number, max: number) =>
			`${filter} has a minimum of ${min} above its maximum of ${max}.`,
		statGroupMinAboveMax: (min: number, max: number) =>
			`A stat group's count or total has a minimum of ${min} above its maximum of ${max}.`,
		statFilterMinAboveMax: (min: number, max: number) =>
			`A stat filter has a minimum of ${min} above its maximum of ${max}.`,
	},
	sync: {
		off: "Sync is off. Bookmarks stay on this machine.",
		on: (ago: string | null, percent: number) =>
			`Synced${ago ? ` ${ago}` : ""} · ${percent}% of sync space used`,
		waiting: "Another browser is writing; trying again shortly.",
		quota:
			"Too many bookmarks for browser sync. Your bookmarks are safe on this machine; archive or delete some to resume syncing.",
		failed: "Sync failed.",
	},
	imports: {
		title: "Backup and sharing",
		description:
			"Imports always add new folders next to yours. Nothing you already have is changed or removed.",
		backupLabel: "Back up everything",
		backupHint:
			"A file with every folder, bookmark and setting. History stays on this machine.",
		saveBackup: "Save backup file",
		restoreLabel: "Restore from a backup file",
		restoreHint: "Pick a file saved by Exile Ledger.",
		chooseFile: "Choose file",
		shareLabel: "Import a shared folder",
		shareHint:
			"Paste a string copied with “Copy share string” on a folder in the panel.",
		shareInput: "Share string",
		sharePlaceholder: "EL1:…",
		read: "Read",
		restoreSettings: "Also restore settings",
		import: "Import",
		summary: (folderCount: number, bookmarkCount: number) =>
			`${folders(folderCount)} and ${bookmarks(bookmarkCount)}`,
		backupSaved: (summary: string) => `Backup saved with ${summary}.`,
		imported: (summary: string) => `Imported ${summary}.`,
		backupFrom: (exportedAt: number, summary: string) =>
			`Backup from ${new Date(exportedAt).toLocaleString(locale)}: ${summary}.`,
		fromSource: (source: string, summary: string) => `${source}: ${summary}.`,
		saveFailed: "Could not save the import. Reload this page and try again.",
		sources: {
			"exile-ledger": "Shared folder",
			"better-trading": "Better Trading export",
			"poe-trade-plus": "Poe Trade Plus export",
		} satisfies Record<ImportSource, string>,
		errors: {
			"not-share": "This is not an Exile Ledger share string.",
			"share-damaged": "The share string is damaged or incomplete.",
			"share-empty": "The share string holds no folders.",
			"not-backup":
				"This file is not an Exile Ledger backup, or it is damaged.",
			"unknown-format":
				"This is not an Exile Ledger, Better Trading or Poe Trade Plus export.",
		} satisfies Record<ImportError, string>,
	},
	settings: {
		pageTitle: "Exile Ledger settings",
		versionLine: (version: string) => `Settings · version ${version}`,
		panel: {
			title: "Panel",
			description: "How the panel sits on the trade site.",
			side: "Dock side",
			sides: { left: "Left", right: "Right" },
			layout: "Layout",
			layoutHint:
				"Float over the page, or push the page aside so the panel never covers results.",
			modes: { overlay: "Float over", push: "Push aside" },
			width: "Width",
			widthHint: (minPx: number, maxPx: number) =>
				`Share of the browser window, kept between ${minPx} and ${maxPx} px. You can also drag the panel's inner edge.`,
			widthInput: "Panel width",
		},
		appearance: {
			title: "Appearance",
			description:
				"Colours for the panel, this page and the marks Exile Ledger adds to trade results.",
			theme: "Theme",
			themes: {
				gold: "Dark gold",
				blood: "Blood",
				verdant: "Verdant",
				azure: "Azure",
				bone: "Bone",
			} satisfies Record<ThemeId, string>,
			compact: "Compact mode",
			compactHint: "Shorter rows in the panel, so more bookmarks fit.",
		},
		sync: {
			title: "Sync",
			description:
				"Bookmarks and folders follow you through your browser account. History stays on each machine.",
			toggle: "Sync bookmarks",
			space: "Sync space",
		},
		results: {
			title: "Results",
			description: "Additions to the trade site's own result list.",
			highlight: "Highlight searched mods",
			highlightHint:
				"Marks the mod lines on each result that your search filtered on.",
			prices: "Equivalent prices",
			pricesHint:
				"Shows each price in chaos and divine (PoE1) or exalted and divine (PoE2), using poe.ninja rates refreshed every 30 minutes. Turning this on asks permission to read poe.ninja.",
			pricesMissingAccess:
				"Equivalent prices are on in another browser, but this one has not been allowed to read poe.ninja. Turn the switch on to allow it.",
			listingTime: "Exact listing time",
			listingTimeHint:
				'Shows the date and time each item was listed, next to the site\'s "2 hours ago".',
			affixCount: "Prefix and suffix count",
			affixCountHint:
				"Shows how many prefixes and suffixes each item has, from the mod tiers the site sends.",
			itemTools: "Copy item and wiki link",
			itemToolsHint:
				"Adds a button that copies the item as in-game text, and a link to the item's wiki page.",
			socketWarning: "Socket warning (PoE1)",
			socketWarningHint:
				"Notes items whose item level keeps them below the base's socket count, so a 6-socket base that can never have 6.",
			pricesDenied:
				"Equivalent prices need access to poe.ninja. Nothing was changed.",
		},
		trade: {
			title: "Trade site",
			tabTitles: "Tab titles",
			tabTitlesHint:
				"Puts the bookmark name, or the item and league, in the browser tab, with ⚡ for live searches.",
			fuzzy: "Fuzzy item search",
			fuzzyHint:
				"Adds ~ when you start typing in the item search box. Start with a space to search exactly.",
			fuzzyFilters: "Fuzzy stat filter search",
			fuzzyFiltersHint: "The same for the boxes where you pick a stat filter.",
			backForward: "Back and Forward between searches",
			backForwardHint:
				"The browser's Back button returns to your previous search instead of leaving the site.",
		},
		hotkeys: {
			title: "Keyboard shortcuts",
			description:
				"On the trade site. The search box shortcuts also work while you are typing in one.",
			actions: {
				togglePanel: "Show or hide the panel",
				focusItemSearch: "Go to item search",
				addStatFilter: "Add a stat filter",
				clearSearch: "Clear the search",
				focusMin: "Go to the stat filter's min",
				focusMax: "Go to the stat filter's max",
			} satisfies Record<HotkeyAction, string>,
			unbound: "Not set",
			recording: "Press keys",
			recordingHint: "Press the new shortcut, or Escape to cancel.",
			change: (action: string) => `Change the shortcut for ${action}`,
			remove: (action: string) => `Remove the shortcut for ${action}`,
			reset: "Reset to defaults",
			reserved: (combo: string) =>
				`${combo} is a browser shortcut. Pick another.`,
			taken: (combo: string, action: string) =>
				`${combo} is already used for "${action}".`,
		},
		history: {
			title: "History",
			record: "Record searches",
			recordHint: "Kept on this machine only, up to 200 per game.",
			clearAll: "Clear all history",
			clearAllHint: "Both games, on this machine.",
			clear: "Clear history",
			cleared: "History cleared.",
		},
		about: {
			title: "About and privacy",
			body: "Exile Ledger keeps your bookmarks in your browser and syncs them through your browser account. It sends nothing anywhere else: no analytics, no tracking, and it never reads your Path of Exile session. It only sees the trade searches your own page makes.",
		},
	},
	popup: {
		version: (version: string) => `Version ${version}`,
		body: "The panel lives on the trade site. Settings, backups and imports are on the settings page.",
		openSettings: "Open settings",
	},
};

export type Messages = typeof en;
