import { describe, expect, it } from "vitest";
import {
	backupSettings,
	createBackup,
	importWatchers,
	parseBackup,
} from "../../src/core/exchange";
import { emptyLibrary } from "../../src/core/library";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import { noticeFor } from "../../src/core/watcherNotices";
import type { ListingWatcher, SearchWatcher } from "../../src/core/watchers";

const listing: ListingWatcher = {
	kind: "listing",
	id: "w1",
	origin: "https://www.pathofexile.com",
	game: "poe1",
	realm: null,
	league: "Standard",
	intervalMin: 5,
	createdAt: 0,
	lastCheckedAt: 50,
	failures: 2,
	retryAt: 900,
	searchId: "abc",
	itemId: "i1",
	name: "Eagle Sanctuary",
	seller: "Seller#0000",
	price: { amount: 8, currency: "chaos" },
	previousPrice: { amount: 10, currency: "chaos" },
	status: "listed",
	changedAt: 50,
};

const {
	searchId: _s,
	itemId: _i,
	seller: _seller,
	price: _p,
	previousPrice: _pp,
	status: _st,
	changedAt: _c,
	...common
} = listing;

const search: SearchWatcher = {
	...common,
	kind: "search",
	id: "w2",
	game: "poe2",
	realm: "poe2",
	league: "Dawn",
	bookmarkId: "bm1",
	name: "Life rings",
	query: { query: { term: "ring" } },
	seenIds: ["a"],
	newIds: ["b"],
	total: 9,
};

describe("noticeFor", () => {
	it("words each event and links where to look", () => {
		expect(noticeFor({ kind: "repriced", watcher: listing })).toEqual({
			title: "Eagle Sanctuary changed price",
			message: "10 chaos → 8 chaos",
			url: "https://www.pathofexile.com/trade/search/Standard/abc",
		});
		expect(noticeFor({ kind: "gone", watcher: listing }).message).toBe(
			"Sold or delisted by Seller#0000.",
		);
		const fresh = noticeFor({ kind: "new-results", watcher: search, count: 3 });
		expect(fresh.title).toBe("New results for Life rings");
		expect(fresh.message).toBe("3 new");
		expect(fresh.url).toMatch(
			/^https:\/\/www\.pathofexile\.com\/trade2\/search\/poe2\/Dawn\?q=/,
		);
	});
});

describe("watchers in backups", () => {
	it("round-trip through the backup file", () => {
		const backup = createBackup(emptyLibrary(), DEFAULT_SETTINGS, 1, [
			listing,
			search,
		]);
		const parsed = parseBackup(JSON.stringify(backup));
		expect(parsed.ok && parsed.value.watchers).toEqual([listing, search]);
	});

	it("older backups without watchers still read", () => {
		const { watchers: _none, ...old } = createBackup(
			emptyLibrary(),
			DEFAULT_SETTINGS,
			1,
		);
		const parsed = parseBackup(JSON.stringify(old));
		expect(parsed.ok && parsed.value.watchers).toBeUndefined();
	});

	it("import adds new watchers fresh and skips ones already watched", () => {
		let n = 0;
		const clock = { now: 77, newId: () => `new${++n}` };
		const result = importWatchers([listing], [listing, search], clock);
		expect(result.added).toBe(1);
		expect(result.watchers[0]).toBe(listing);
		expect(result.watchers[1]).toEqual({
			...search,
			id: "new1",
			createdAt: 77,
			lastCheckedAt: null,
			failures: 0,
			retryAt: null,
			bookmarkId: null,
			seenIds: [],
			newIds: [],
			total: null,
		});
	});
});

describe("settings in backups", () => {
	it("restores only the settings a backup has", () => {
		const parsed = parseBackup(
			JSON.stringify({
				format: "exile-ledger-backup",
				version: 1,
				exportedAt: 1,
				library: { folders: [], bookmarks: [] },
				settings: { panelSide: "right", theme: "nope" },
			}),
		);
		if (!parsed.ok) throw new Error("did not parse");
		// theme is invalid, so it falls back; hotkeys and language are absent and left alone.
		expect(backupSettings(parsed.value)).toEqual({
			panelSide: "right",
			theme: DEFAULT_SETTINGS.theme,
		});
	});
});
