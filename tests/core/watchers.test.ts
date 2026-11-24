import { describe, expect, it } from "vitest";
import {
	applyListingCheck,
	applySearchCheck,
	forgetBookmark,
	isDue,
	type ListingWatcher,
	listingWatcherFrom,
	markSeen,
	mergeCheckResults,
	nextDueInMinutes,
	parseWatchers,
	removeWatcher,
	retargetSearchWatch,
	SEEN_CAP,
	type SearchWatcher,
	searchWatcherFrom,
	toggleListingWatch,
	toggleSearchWatch,
} from "../../src/core/watchers";

const listing: ListingWatcher = {
	kind: "listing",
	id: "w1",
	origin: "https://www.pathofexile.com",
	game: "poe1",
	realm: null,
	league: "Standard",
	intervalMin: 5,
	createdAt: 0,
	lastCheckedAt: null,
	failures: 0,
	retryAt: null,
	searchId: "s1",
	itemId: "item1",
	name: "Eagle Sanctuary",
	seller: "Seller#0000",
	price: { amount: 10, currency: "chaos" },
	previousPrice: null,
	status: "listed",
	changedAt: null,
};

const search: SearchWatcher = {
	kind: "search",
	id: "w2",
	origin: "https://www.pathofexile.com",
	game: "poe2",
	realm: "poe2",
	league: "Standard",
	intervalMin: 5,
	createdAt: 0,
	lastCheckedAt: null,
	failures: 0,
	retryAt: null,
	bookmarkId: "b1",
	name: "Bows",
	query: { query: { type: "Bow" } },
	seenIds: [],
	newIds: [],
	total: null,
};

describe("listing watchers", () => {
	it("goes gone, then back, keeping when each change happened", () => {
		const gone = applyListingCheck(listing, { listed: false }, 100);
		expect(gone).toMatchObject({ status: "gone", changedAt: 100 });
		const stillGone = applyListingCheck(gone, { listed: false }, 200);
		expect(stillGone.changedAt).toBe(100);
		const back = applyListingCheck(
			stillGone,
			{ listed: true, price: { amount: 10, currency: "chaos" } },
			300,
		);
		expect(back).toMatchObject({ status: "back", changedAt: 300 });
	});

	it("records a price change with the previous price", () => {
		const repriced = applyListingCheck(
			listing,
			{ listed: true, price: { amount: 8, currency: "chaos" } },
			50,
		);
		expect(repriced).toMatchObject({
			price: { amount: 8, currency: "chaos" },
			previousPrice: { amount: 10, currency: "chaos" },
			changedAt: 50,
			status: "listed",
		});
		const unchanged = applyListingCheck(
			repriced,
			{ listed: true, price: { amount: 8, currency: "chaos" } },
			60,
		);
		expect(unchanged.changedAt).toBe(50);
	});
});

describe("search watchers", () => {
	it("learns the first results without calling them new", () => {
		const first = applySearchCheck(search, { ids: ["a", "b"], total: 2 }, 10);
		expect(first).toMatchObject({ newIds: [], seenIds: ["a", "b"], total: 2 });
	});

	it("reports ids not seen before, once, until marked seen", () => {
		const first = applySearchCheck(search, { ids: ["a", "b"], total: 2 }, 10);
		const second = applySearchCheck(
			first,
			{ ids: ["c", "a", "b"], total: 3 },
			20,
		);
		expect(second.newIds).toEqual(["c"]);
		const third = applySearchCheck(second, { ids: ["c", "d"], total: 4 }, 30);
		expect(third.newIds).toEqual(["c", "d"]);
		expect(markSeen(third).newIds).toEqual([]);
	});

	it("caps the remembered ids, dropping the oldest", () => {
		const ids = Array.from({ length: SEEN_CAP }, (_, i) => `old${i}`);
		const first = applySearchCheck(search, { ids, total: ids.length }, 1);
		const next = applySearchCheck(first, { ids: ["new"], total: 1 }, 2);
		expect(next.seenIds).toHaveLength(SEEN_CAP);
		expect(next.seenIds[0]).toBe("new");
		expect(next.seenIds).not.toContain(`old${SEEN_CAP - 1}`);
	});
});

describe("scheduling", () => {
	it("is due when never checked or after its interval", () => {
		expect(isDue(listing, 0)).toBe(true);
		const checked = { ...listing, lastCheckedAt: 0 };
		expect(isDue(checked, 4 * 60_000)).toBe(false);
		expect(isDue(checked, 5 * 60_000)).toBe(true);
	});

	it("schedules the next alarm for the soonest watcher, at least a minute out", () => {
		expect(nextDueInMinutes([], 0)).toBeNull();
		expect(
			nextDueInMinutes(
				[
					{ ...listing, lastCheckedAt: 0, intervalMin: 10 },
					{ ...search, lastCheckedAt: 0, intervalMin: 3 },
				],
				0,
			),
		).toBe(3);
		expect(nextDueInMinutes([listing], 0)).toBe(1);
	});
});

describe("parseWatchers", () => {
	it("refuses watchers that point anywhere but an official trade site", () => {
		for (const origin of [
			"http://www.pathofexile.com",
			"https://evil.example",
			"https://www.pathofexile.com/",
			"https://pathofexile.com.evil.example",
			"not a url",
		]) {
			expect(parseWatchers([{ ...listing, origin }])).toEqual([]);
		}
		expect(
			parseWatchers([{ ...listing, origin: "https://poe.kakaogames.com" }]),
		).toHaveLength(1);
	});

	it("keeps valid watchers and drops broken ones", () => {
		expect(
			parseWatchers([listing, { ...search, intervalMin: 0 }, "junk", search]),
		).toEqual([listing, search]);
		expect(parseWatchers(null)).toEqual([]);
	});
});

describe("listingWatcherFrom", () => {
	const site: Parameters<typeof listingWatcherFrom>[1] = {
		origin: "https://www.pathofexile.com",
		game: "poe1",
		realm: null,
		league: "Standard",
		searchId: "s1",
	};
	const item = {
		id: "item1",
		name: "Eagle Sanctuary",
		baseType: "Astral Plate",
		seller: "Seller#0000",
		price: { amount: 10, currency: "chaos" },
	};

	it("stores what a check and the panel need", () => {
		const made = listingWatcherFrom(item, site, 5, 100, "w9");
		expect(made).toEqual({
			...listing,
			id: "w9",
			name: "Eagle Sanctuary Astral Plate",
			createdAt: 100,
		});
		expect(parseWatchers([made])).toEqual([made]);
	});

	it("toggles a listing on and off by item id", () => {
		const made = listingWatcherFrom(item, site, 5, 100, "w9");
		const on = toggleListingWatch([search], made);
		expect(on).toEqual([search, made]);
		const again = listingWatcherFrom(item, site, 5, 200, "w10");
		expect(toggleListingWatch(on, again)).toEqual([search]);
		expect(removeWatcher(on, "w2")).toEqual([made]);
	});
});

describe("searchWatcherFrom", () => {
	const bookmark = {
		id: "bm1",
		name: "Life rings",
		query: { query: { term: "ring" } },
	};
	const site = {
		origin: "https://www.pathofexile.com",
		game: search.game,
		realm: "poe2",
		league: "Dawn",
	};

	it("starts with nothing seen, so the first check reports nothing new", () => {
		const made = searchWatcherFrom(bookmark, site, 10, 5, "w7");
		expect(parseWatchers([made])).toEqual([made]);
		const first = applySearchCheck(made, { ids: ["a", "b"], total: 2 }, 6);
		expect(first.newIds).toEqual([]);
		expect(first.seenIds).toEqual(["a", "b"]);
	});

	it("toggles by bookmark", () => {
		const made = searchWatcherFrom(bookmark, site, 10, 5, "w7");
		const on = toggleSearchWatch([listing], made);
		expect(on).toEqual([listing, made]);
		expect(
			toggleSearchWatch(on, searchWatcherFrom(bookmark, site, 10, 9, "w8")),
		).toEqual([listing]);
	});
});

describe("mergeCheckResults", () => {
	const before = {
		...search,
		bookmarkId: "bm1",
		newIds: ["n1"],
		seenIds: ["n1", "a"],
	};
	const checked = {
		...before,
		lastCheckedAt: 50,
		newIds: ["n1", "n2"],
		seenIds: ["n2", "n1", "a"],
	};

	it("keeps results a tab marked seen during the pass seen", () => {
		const current = [{ ...before, newIds: [] }];
		const [merged] = mergeCheckResults([before], [checked], current);
		expect(merged?.kind === "search" && merged.newIds).toEqual(["n2"]);
		expect(merged?.lastCheckedAt).toBe(50);
	});

	it("drops the pass's results for a watcher pointed at a new query meanwhile", () => {
		const retargeted = retargetSearchWatch([before], "bm1", {
			query: { query: { term: "new" } },
			name: "New",
			league: "Dawn",
		});
		const merged = mergeCheckResults([before], [checked], retargeted);
		expect(merged).toEqual(retargeted);
	});

	it("keeps watchers a tab removed removed, and ones it added", () => {
		expect(mergeCheckResults([before], [checked], [listing])).toEqual([
			listing,
		]);
	});
});

describe("bookmark links", () => {
	const linked = { ...search, bookmarkId: "bm9", seenIds: ["x"], total: 4 };

	it("retargets a bookmark's watcher and makes it start over", () => {
		const [w] = retargetSearchWatch([linked], "bm9", {
			query: { query: { term: "z" } },
			name: "Z",
			league: "Dawn",
		});
		expect(w).toMatchObject({
			name: "Z",
			league: "Dawn",
			seenIds: [],
			newIds: [],
			total: null,
			lastCheckedAt: null,
		});
	});

	it("forgets the watcher of a deleted bookmark only", () => {
		expect(forgetBookmark([linked, listing], "bm9")).toEqual([listing]);
	});
});
