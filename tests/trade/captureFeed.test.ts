import { describe, expect, it } from "vitest";
import type { CaptureEvent } from "../../src/trade/capture";
import { createCaptureFeed } from "../../src/trade/captureFeed";

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
		feed.subscribe((s) => seen.push(s.results.length));

		feed.push(search("A"));
		feed.push(results("A", "1"));
		feed.push(results("A", "2"));
		feed.push(results("OLD", "x"));
		expect(feed.get().results.map((r) => r.id)).toEqual(["1", "2"]);

		feed.push(search("B"));
		expect(feed.get().results).toEqual([]);
		expect(seen).toEqual([0, 1, 2, 0]);
	});
});
