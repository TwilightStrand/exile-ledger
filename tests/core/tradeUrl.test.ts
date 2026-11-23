import { describe, expect, it } from "vitest";
import {
	buildTradeUrl,
	parseTradeUrl,
	type TradeLocation,
} from "../../src/core/tradeUrl";

const hosts = [
	"https://www.pathofexile.com",
	"https://br.pathofexile.com",
	"https://pathofexile.tw",
	"https://www.pathofexile.com.tw",
	"https://poe.kakaogames.com",
	"https://poe2.kakaogames.com",
];

const locations: TradeLocation[] = [
	{
		game: "poe1",
		type: "search",
		realm: null,
		league: "Standard",
		searchId: "Ab3dEf",
		live: false,
	},
	{
		game: "poe1",
		type: "search",
		realm: null,
		league: "Standard",
		searchId: "Ab3dEf",
		live: true,
	},
	{
		game: "poe1",
		type: "exchange",
		realm: null,
		league: "Hardcore",
		searchId: "Zz9",
		live: false,
	},
	{
		game: "poe1",
		type: "search",
		realm: "xbox",
		league: "Standard",
		searchId: "x1",
		live: false,
	},
	{
		game: "poe2",
		type: "search",
		realm: "poe2",
		league: "Standard",
		searchId: "q2",
		live: false,
	},
	{
		game: "poe2",
		type: "search",
		realm: "poe2",
		league: "Rise of the Abyssal",
		searchId: "q2",
		live: true,
	},
	{
		game: "poe2",
		type: "search",
		realm: "poe2",
		league: "Standard",
		searchId: null,
		live: false,
	},
];

describe("parseTradeUrl / buildTradeUrl", () => {
	for (const origin of hosts) {
		it.each(locations)(`round-trips on ${origin}: %o`, (location) => {
			const url = buildTradeUrl(origin, location);
			expect(parseTradeUrl(new URL(url))).toEqual({ origin, location });
		});
	}

	it("parses a real PoE1 search URL", () => {
		expect(
			parseTradeUrl(
				new URL(
					"https://www.pathofexile.com/trade/search/Standard/Ab3dEf/live",
				),
			),
		).toEqual({
			origin: "https://www.pathofexile.com",
			location: {
				game: "poe1",
				type: "search",
				realm: null,
				league: "Standard",
				searchId: "Ab3dEf",
				live: true,
			},
		});
	});

	it("parses a PoE2 URL with an encoded league name", () => {
		const parsed = parseTradeUrl(
			new URL(
				"https://www.pathofexile.com/trade2/search/poe2/Rise%20of%20the%20Abyssal/abc",
			),
		);
		expect(parsed?.location.league).toBe("Rise of the Abyssal");
		expect(parsed?.location.game).toBe("poe2");
	});

	it("encodes non-ASCII league names", () => {
		const url = buildTradeUrl("https://poe.kakaogames.com", {
			game: "poe1",
			type: "search",
			realm: null,
			league: "스탠다드",
			searchId: null,
			live: false,
		});
		expect(url).toBe(
			"https://poe.kakaogames.com/trade/search/%EC%8A%A4%ED%83%A0%EB%8B%A4%EB%93%9C",
		);
		expect(parseTradeUrl(new URL(url))?.location.league).toBe("스탠다드");
	});

	it("builds a ?q= URL for a stored query and drops the search ID", () => {
		const query = {
			query: { status: { option: "online" }, type: "Hubris Circlet" },
		};
		const url = new URL(
			buildTradeUrl(
				"https://www.pathofexile.com",
				{
					game: "poe1",
					type: "search",
					realm: null,
					league: "Standard",
					searchId: "old",
					live: false,
				},
				{ query },
			),
		);
		expect(url.pathname).toBe("/trade/search/Standard");
		expect(JSON.parse(url.searchParams.get("q") ?? "")).toEqual(query);
	});

	it.each([
		"https://www.pathofexile.com/trade",
		"https://www.pathofexile.com/trade/about",
		"https://www.pathofexile.com/trade/search",
		"https://www.pathofexile.com/trade2/search/poe2",
		"https://www.pathofexile.com/forum/view-thread/1",
		"https://example.com/trade/search/Standard",
		"https://www.pathofexile.com/trade/search/Stan%E0%A4%A",
	])("returns null for %s", (url) => {
		expect(parseTradeUrl(new URL(url))).toBeNull();
	});
});
