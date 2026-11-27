import { describe, expect, it } from "vitest";
import type { CaptureEvent } from "../../src/trade/capture";
import { CAPTURE_LIMIT, createCaptureFeed } from "../../src/trade/captureFeed";

const search = (searchId: string): CaptureEvent => ({
	kind: "search",
	game: "poe2",
	realm: "poe2",
	league: "Standard",
	search: { query: { query: {} }, searchId, total: 3, resultIds: [] },
});

const results = (queryId: string, id: string): CaptureEvent => ({
	kind: "results",
	game: "poe2",
	queryId,
	items: [
		{
			id,
			name: "",
			typeLine: "",
			baseType: "",
			ilvl: null,
			mods: [],
			price: null,
			indexed: null,
			rarity: null,
			text: null,
			corrupted: false,
			seller: null,
			card: null,
			affixes: null,
		},
	],
});

describe("captureFeed", () => {
	it("collects results for the current search and resets on a new one", () => {
		const feed = createCaptureFeed();
		const seen: number[] = [];
		feed.subscribe((s) => seen.push(s.results.size));

		feed.push(search("A"));
		feed.push(results("A", "1"));
		feed.push(results("A", "2"));
		feed.push(results("OLD", "x"));
		expect([...feed.get().results.keys()]).toEqual(["1", "2"]);

		feed.push(search("B"));
		expect(feed.get().results.size).toBe(0);
		expect(seen).toEqual([0, 1, 2, 0]);
	});
});

describe("captureFeed cap", () => {
	it("keeps the newest CAPTURE_LIMIT results, dropping the oldest", () => {
		const feed = createCaptureFeed();
		feed.push(search("A"));
		for (let i = 0; i < CAPTURE_LIMIT + 20; i++)
			feed.push(results("A", `${i}`));
		const ids = [...feed.get().results.keys()];
		expect(ids).toHaveLength(CAPTURE_LIMIT);
		expect(ids[0]).toBe("20");
		expect(ids.at(-1)).toBe(`${CAPTURE_LIMIT + 19}`);
	});

	it("keeps the latest copy of a result fetched twice", () => {
		const feed = createCaptureFeed();
		feed.push(search("A"));
		feed.push(results("A", "1"));
		feed.push(results("A", "2"));
		feed.push(results("A", "1"));
		expect([...feed.get().results.keys()]).toEqual(["2", "1"]);
	});
});
