import { describe, expect, it } from "vitest";
import type { Bookmark } from "../../src/core/model";
import { bookmarkHref } from "../../src/core/openUrl";
import { parseTradeUrl } from "../../src/core/tradeUrl";

const query = { query: { type: "Hatungo Garb" } };
const bookmark: Bookmark = {
	id: "b",
	folderId: "f",
	name: "Garb",
	game: "poe2",
	league: "Standard",
	query,
	searchId: "abc",
	live: false,
	order: 0,
	createdAt: 0,
	updatedAt: 0,
};

const page = (url: string) => {
	const parsed = parseTradeUrl(new URL(url));
	if (!parsed) throw new Error(`bad url ${url}`);
	return parsed;
};

describe("bookmarkHref", () => {
	it("opens the stored query in the league of the open page", () => {
		const url = new URL(
			bookmarkHref(
				bookmark,
				page(
					"https://www.pathofexile.com/trade2/search/poe2/Rise%20of%20the%20Abyssal",
				),
			),
		);
		expect(url.pathname).toBe("/trade2/search/poe2/Rise%20of%20the%20Abyssal");
		expect(JSON.parse(url.searchParams.get("q") ?? "")).toEqual(query);
	});

	it("keeps the host of the open page", () => {
		expect(
			bookmarkHref(
				bookmark,
				page("https://poe2.kakaogames.com/trade2/search/poe2/Standard"),
			),
		).toMatch(
			/^https:\/\/poe2\.kakaogames\.com\/trade2\/search\/poe2\/Standard\?q=/,
		);
	});

	it("opens a live bookmark on its live URL while the league matches", () => {
		expect(
			bookmarkHref(
				{ ...bookmark, live: true },
				page("https://www.pathofexile.com/trade2/search/poe2/Standard"),
			),
		).toBe("https://www.pathofexile.com/trade2/search/poe2/Standard/abc/live");
	});

	it("falls back to the query when a live bookmark's league is gone", () => {
		const url = bookmarkHref(
			{ ...bookmark, live: true },
			page("https://www.pathofexile.com/trade2/search/poe2/Dawn"),
		);
		expect(url).toMatch(/\/trade2\/search\/poe2\/Dawn\?q=/);
	});

	it("uses the search ID in its own league when there is no query", () => {
		const { query: _omit, ...legacy } = bookmark;
		expect(
			bookmarkHref(
				legacy,
				page("https://www.pathofexile.com/trade2/search/poe2/Dawn"),
			),
		).toBe("https://www.pathofexile.com/trade2/search/poe2/Standard/abc");
	});

	it("opens a league-less import in the page's league", () => {
		const { query: _omit, ...legacy } = bookmark;
		const imported: typeof legacy = { ...legacy, game: "poe1", league: "" };
		expect(
			bookmarkHref(
				imported,
				page("https://www.pathofexile.com/trade/search/Settlers/xyz"),
			),
		).toBe("https://www.pathofexile.com/trade/search/Settlers/abc");
		expect(
			bookmarkHref(
				{ ...imported, tradeType: "exchange" },
				page("https://www.pathofexile.com/trade/search/Settlers/xyz"),
			),
		).toBe("https://www.pathofexile.com/trade/exchange/Settlers/abc");
	});
});

describe("bookmarkHref across games", () => {
	it("opens a PoE2 bookmark from a PoE1 page in its own realm and league", () => {
		const url = new URL(
			bookmarkHref(
				bookmark,
				page("https://www.pathofexile.com/trade/search/Mercenaries"),
			),
		);
		expect(url.pathname).toBe("/trade2/search/poe2/Standard");
	});
});
