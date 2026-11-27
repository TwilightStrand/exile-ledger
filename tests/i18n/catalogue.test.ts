import { describe, expect, it } from "vitest";
import {
	en,
	LOCALES,
	type Messages,
	messagesFor,
	plural,
} from "../../src/core/i18n";

/** One plausible call per function-valued entry, keyed by its path in the catalogue. */
const CALLS: Record<string, (t: Messages) => string> = {
	"format.number": (t) => t.format.number(1234.5),
	"common.results": (t) => t.common.results(3),
	"time.minutesAgo": (t) => t.time.minutesAgo(5),
	"time.hoursAgo": (t) => t.time.hoursAgo(3),
	"time.daysAgo": (t) => t.time.daysAgo(4),
	"time.date": (t) => t.time.date(Date.UTC(2026, 9, 14)),
	"panel.resizeValue": (t) => t.panel.resizeValue(25),
	"panel.resizeValuePx": (t) => t.panel.resizeValuePx(360),
	"bookmarks.rename": (t) => t.bookmarks.rename("Garb"),
	"bookmarks.delete": (t) => t.bookmarks.delete("Garb"),
	"bookmarks.archive": (t) => t.bookmarks.archive("Maps"),
	"bookmarks.restore": (t) => t.bookmarks.restore("Maps"),
	"bookmarks.newFolderIn": (t) => t.bookmarks.newFolderIn("Maps"),
	"bookmarks.changeIcon": (t) => t.bookmarks.changeIcon("Maps"),
	"bookmarks.copyShareFor": (t) => t.bookmarks.copyShareFor("Maps"),
	"bookmarks.confirmDeleteBookmark": (t) =>
		t.bookmarks.confirmDeleteBookmark("Garb"),
	"bookmarks.confirmDeleteFolder": (t) =>
		t.bookmarks.confirmDeleteFolder("Maps", 3, 1),
	"history.saveAs": (t) => t.history.saveAs("Garb"),
	"pins.unpin": (t) => t.pins.unpin("Garb"),
	"trade.listedAt": (t) => t.trade.listedAt(Date.UTC(2026, 10, 24, 12)),
	"trade.affixes": (t) => t.trade.affixes(2, 3),
	"trade.affixesTitle": (t) => t.trade.affixesTitle(1, 2),
	"trade.wikiTitle": (t) => t.trade.wikiTitle("Tabula Rasa"),
	"trade.socketShortfall": (t) => t.trade.socketShortfall(35, 5),
	"trade.stackValue": (t) => t.trade.stackValue(5, ["10 c", "0.01 div"]),
	"trade.priceEquivalents": (t) =>
		t.trade.priceEquivalents(["74.1 c", "0.088 div"]),
	"trade.titleSegment": (t) => t.trade.titleSegment("Body Armour", "Standard"),
	"searchChecks.gemLevelOutOfReach": (t) =>
		t.searchChecks.gemLevelOutOfReach(t.searchChecks.gems.empower, 4, 5),
	"searchChecks.gemLevelNeedsCorruption": (t) =>
		t.searchChecks.gemLevelNeedsCorruption(t.searchChecks.gems.empower, 3),
	"searchChecks.gemQualityOutOfReach": (t) =>
		t.searchChecks.gemQualityOutOfReach(t.searchChecks.gems.any, 23, 25),
	"searchChecks.gemQualityNeedsCorruption": (t) =>
		t.searchChecks.gemQualityNeedsCorruption(t.searchChecks.gems.any, 20),
	"searchChecks.socketsOutOfReach": (t) =>
		t.searchChecks.socketsOutOfReach(t.searchChecks.socketItems.shields, 3, 4),
	"searchChecks.linksOutOfReach": (t) =>
		t.searchChecks.linksOutOfReach(t.searchChecks.socketItems.any, 6, 7),
	"searchChecks.filterMinAboveMax": (t) =>
		t.searchChecks.filterMinAboveMax("Price", 10, 5),
	"searchChecks.statGroupMinAboveMax": (t) =>
		t.searchChecks.statGroupMinAboveMax(3, 1),
	"searchChecks.statFilterMinAboveMax": (t) =>
		t.searchChecks.statFilterMinAboveMax(50, 10),
	"sync.on": (t) => t.sync.on("5m ago", 12),
	"imports.summary": (t) => t.imports.summary(2, 7),
	"imports.backupSaved": (t) => t.imports.backupSaved("1 folder"),
	"imports.imported": (t) => t.imports.imported("1 folder"),
	"imports.backupFrom": (t) =>
		t.imports.backupFrom(Date.UTC(2026, 10, 24), "1 folder"),
	"imports.fromSource": (t) =>
		t.imports.fromSource(t.imports.sources["better-trading"], "1 folder"),
	"settings.versionLine": (t) => t.settings.versionLine("0.2.0"),
	"settings.panel.widthHintPercent": (t) =>
		t.settings.panel.widthHintPercent(260, 640),
	"settings.panel.widthHintPx": (t) => t.settings.panel.widthHintPx(260, 640),
	"bookmarks.overwrite": (t) => t.bookmarks.overwrite("Garb"),
	"bookmarks.confirmOverwrite": (t) => t.bookmarks.confirmOverwrite("Garb"),
	"bookmarks.watch": (t) => t.bookmarks.watch("Garb"),
	"bookmarks.unwatch": (t) => t.bookmarks.unwatch("Garb"),
	"bookmarks.markDone": (t) => t.bookmarks.markDone("Garb"),
	"bookmarks.markNotDone": (t) => t.bookmarks.markNotDone("Garb"),
	"bookmarks.more": (t) => t.bookmarks.more("Rings"),
	"bookmarks.leagueChanged": (t) => t.bookmarks.leagueChanged(3, "Dawn"),
	"settings.watchers.intervalHint": (t) => t.settings.watchers.intervalHint(1),
	"watchers.repriced": (t) => t.watchers.repriced("10 chaos", "8 chaos"),
	"watchers.checked": (t) => t.watchers.checked("[when]"),
	"watchers.newResults": (t) => t.watchers.newResults(3),
	"watchers.total": (t) => t.watchers.total(120),
	"watchers.remove": (t) => t.watchers.remove("Garb"),
	"watchers.every": (t) => t.watchers.every(5),
	"notices.goneTitle": (t) => t.notices.goneTitle("Garb"),
	"notices.goneBody": (t) => t.notices.goneBody("Seller#0000"),
	"notices.backTitle": (t) => t.notices.backTitle("Garb"),
	"notices.repricedTitle": (t) => t.notices.repricedTitle("Garb"),
	"notices.newTitle": (t) => t.notices.newTitle("Rings"),
	"notices.moreTitle": (t) => t.notices.moreTitle(3),
	"imports.watchersFailed": (t) => t.imports.watchersFailed("2 folders"),
	"settings.hotkeys.change": (t) => t.settings.hotkeys.change("Clear"),
	"settings.hotkeys.remove": (t) => t.settings.hotkeys.remove("Clear"),
	"settings.hotkeys.reserved": (t) => t.settings.hotkeys.reserved("Ctrl+T"),
	"settings.hotkeys.taken": (t) =>
		t.settings.hotkeys.taken("Alt+Shift+C", "Clear"),
	"popup.version": (t) => t.popup.version("0.2.0"),
};

/** Every leaf of the catalogue as [path, value]. */
function leaves(node: object, prefix = ""): [string, unknown][] {
	return Object.entries(node).flatMap(([key, value]): [string, unknown][] => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof value === "object" && value !== null
			? leaves(value, path)
			: [[path, value]];
	});
}

describe("catalogue", () => {
	const catalogues: [string, Messages][] = LOCALES.map((locale) => [
		locale,
		messagesFor(locale),
	]);

	it.each(catalogues)(
		"%s has a non-empty string for every static entry",
		(_l, t) => {
			const empty = leaves(t).filter(
				([, value]) =>
					typeof value !== "function" &&
					(typeof value !== "string" || value.trim() === ""),
			);
			expect(empty).toEqual([]);
		},
	);

	it("has a test call for every function-valued entry", () => {
		const functions = leaves(en)
			.filter(([, value]) => typeof value === "function")
			.map(([path]) => path);
		expect(functions.sort()).toEqual(Object.keys(CALLS).sort());
	});

	it.each(catalogues)(
		"%s returns text for every function-valued entry",
		(_l, t) => {
			for (const [path, call] of Object.entries(CALLS)) {
				const text = call(t);
				expect(text.trim(), path).not.toBe("");
			}
		},
	);

	it("formats the English messages the UI used to build inline", () => {
		expect(en.bookmarks.confirmDeleteFolder("Maps", 1, 0)).toBe(
			"Delete “Maps” and its 1 bookmark?",
		);
		expect(en.bookmarks.confirmDeleteFolder("Maps", 3, 2)).toBe(
			"Delete “Maps” and its 3 bookmarks and 2 subfolders?",
		);
		expect(en.bookmarks.confirmDeleteFolder("Maps", 0, 0)).toBe(
			"Delete “Maps”?",
		);
		expect(en.imports.summary(1, 0)).toBe("1 folder and 0 bookmarks");
		expect(en.common.results(12345)).toBe("12,345 results");
		expect(en.trade.priceEquivalents(["74.1 c", "0.088 div"])).toBe(
			"≈ 74.1 c · 0.088 div",
		);
		expect(en.sync.on(null, 4)).toBe("Synced · 4% of sync space used");
	});
});

describe("plural", () => {
	const forms = { one: "one", few: "few", many: "many", other: "other" };

	it.each([
		[1, "one"],
		[0, "other"],
		[2, "other"],
		[21, "other"],
	])("English picks %i as %s", (n, expected) => {
		expect(plural("en", n, forms)).toBe(expected);
	});

	it("follows the locale's own categories", () => {
		expect(plural("pl", 1, forms)).toBe("one");
		expect(plural("pl", 3, forms)).toBe("few");
		expect(plural("pl", 5, forms)).toBe("many");
	});

	it("falls back to other when a form is missing", () => {
		expect(plural("pl", 3, { one: "one", other: "other" })).toBe("other");
	});
});

/** Argument values the CALLS above pass in; a translation must keep every one it was given. */
const ARGUMENTS = [
	"Garb",
	"Rings",
	"Tabula Rasa",
	"Clear",
	"Ctrl+T",
	"Alt+Shift+C",
	"Seller#0000",
	"Dawn",
	"Maps",
	"0.2.0",
	"74.1 c",
	"0.088 div",
	"10 chaos",
	"8 chaos",
	"[when]",
];

describe("translations", () => {
	const others = LOCALES.filter((l) => l !== "en");

	it.each(others)("%s has its own catalogue", (locale) => {
		expect(messagesFor(locale)).not.toBe(en);
		expect(messagesFor(locale).bookmarks.defaultFolder).not.toBe(
			en.bookmarks.defaultFolder,
		);
	});

	it.each(others)("%s keeps every placeholder English shows", (locale) => {
		const t = messagesFor(locale);
		const missing = Object.entries(CALLS).flatMap(([path, call]) => {
			const english = call(en);
			const translated = call(t);
			return ARGUMENTS.filter(
				(arg) => english.includes(arg) && !translated.includes(arg),
			).map((arg) => `${path}: ${arg}`);
		});
		expect(missing).toEqual([]);
	});

	it.each(LOCALES)("%s writes every count with its number", (locale) => {
		const t = messagesFor(locale);
		for (const n of [0, 1, 2, 3, 5, 11, 21, 22, 25, 101]) {
			expect(t.common.results(n)).toContain(t.format.number(n));
		}
	});
});
