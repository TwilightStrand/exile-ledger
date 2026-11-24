import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchApiUrl, searchApiUrl } from "../../src/core/tradeApiUrls";
import { runDueWatchers, type WatcherApi } from "../../src/core/watcherRun";
import type { ListingWatcher, SearchWatcher } from "../../src/core/watchers";

const fixture = JSON.parse(
	readFileSync(
		join(process.cwd(), "tests/fixtures/trade/poe1-fetch-response.json"),
		"utf8",
	),
);
const listedIds: string[] = fixture.result
	.filter(Boolean)
	.map((r: { id: string }) => r.id);

const listing = (id: string, itemId: string): ListingWatcher => ({
	kind: "listing",
	id,
	origin: "https://www.pathofexile.com",
	game: "poe1",
	realm: null,
	league: "Standard",
	intervalMin: 5,
	createdAt: 0,
	lastCheckedAt: null,
	searchId: "s1",
	itemId,
	name: "Item",
	seller: "Seller#0000",
	price: null,
	previousPrice: null,
	status: "listed",
	changedAt: null,
});

const search: SearchWatcher = {
	kind: "search",
	id: "sw",
	origin: "https://www.pathofexile.com",
	game: "poe1",
	realm: null,
	league: "Standard",
	intervalMin: 5,
	createdAt: 0,
	lastCheckedAt: 0,
	bookmarkId: null,
	name: "Armour",
	query: { query: {} },
	seenIds: ["a"],
	newIds: [],
	total: 1,
};

function fakeApi(overrides: Partial<WatcherApi> = {}) {
	const fetchCalls: string[][] = [];
	const api: WatcherApi = {
		fetchListings: async ({ ids }) => {
			fetchCalls.push(ids);
			return fixture;
		},
		runSearch: async () => ({ ids: ["b", "a"], total: 2 }),
		...overrides,
	};
	return { api, fetchCalls };
}

describe("runDueWatchers", () => {
	it("marks listed items with their price and missing ones as gone", async () => {
		const present = listedIds[0] ?? "";
		const { api } = fakeApi();
		const { watchers, events } = await runDueWatchers(
			[listing("w1", present), listing("w2", "sold-item")],
			api,
			() => 1000,
		);
		expect(watchers[0]).toMatchObject({
			status: "listed",
			lastCheckedAt: 1000,
		});
		expect(watchers[0]?.kind === "listing" && watchers[0].price).not.toBeNull();
		expect(watchers[1]).toMatchObject({ status: "gone" });
		expect(events.map((e) => e.kind)).toEqual(
			expect.arrayContaining(["gone", "repriced"]),
		);
	});

	it("batches ids from the same search ten at a time", async () => {
		const { api, fetchCalls } = fakeApi();
		const many = Array.from({ length: 23 }, (_, i) =>
			listing(`w${i}`, `i${i}`),
		);
		await runDueWatchers(many, api, () => 0);
		expect(fetchCalls.map((c) => c.length)).toEqual([10, 10, 3]);
	});

	it("leaves a watcher due when its request did not go out", async () => {
		const { api } = fakeApi({
			fetchListings: async () => null,
			runSearch: async () => null,
		});
		const before = [listing("w1", "x"), search];
		const { watchers, events } = await runDueWatchers(
			before,
			api,
			() => 10 ** 9,
		);
		expect(watchers).toEqual(before);
		expect(events).toEqual([]);
	});

	it("reports new search results", async () => {
		const { api } = fakeApi();
		const { watchers, events } = await runDueWatchers(
			[search],
			api,
			() => 10 ** 9,
		);
		expect(events).toEqual([
			expect.objectContaining({ kind: "new-results", count: 1 }),
		]);
		expect(watchers[0]?.kind === "search" && watchers[0].newIds).toEqual(["b"]);
	});

	it("skips watchers that are not due yet", async () => {
		const { api, fetchCalls } = fakeApi();
		await runDueWatchers(
			[{ ...listing("w1", "x"), lastCheckedAt: 0 }],
			api,
			() => 60_000,
		);
		expect(fetchCalls).toEqual([]);
	});
});

describe("trade API URLs", () => {
	it("builds search and fetch URLs per game and realm", () => {
		expect(
			searchApiUrl("https://www.pathofexile.com", "poe1", null, "Settlers"),
		).toBe("https://www.pathofexile.com/api/trade/search/Settlers");
		expect(
			searchApiUrl(
				"https://www.pathofexile.com",
				"poe2",
				"poe2",
				"Dawn of the Hunt",
			),
		).toBe(
			"https://www.pathofexile.com/api/trade2/search/poe2/Dawn%20of%20the%20Hunt",
		);
		expect(
			fetchApiUrl(
				"https://www.pathofexile.com",
				"poe2",
				"poe2",
				["a", "b"],
				"q1",
			),
		).toBe(
			"https://www.pathofexile.com/api/trade2/fetch/a,b?query=q1&realm=poe2",
		);
	});
});
