import { describe, expect, it } from "vitest";
import {
	classifyApiUrl,
	parseFetchResponse,
	parseSearch,
} from "../../src/core/tradeApi";
import fetchResponse from "../fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

describe("classifyApiUrl", () => {
	it.each([
		[
			"https://www.pathofexile.com/api/trade2/search/poe2/Standard",
			{ kind: "search", game: "poe2", realm: "poe2", league: "Standard" },
		],
		[
			"https://www.pathofexile.com/api/trade/search/Hardcore%20Mercenaries",
			{
				kind: "search",
				game: "poe1",
				realm: null,
				league: "Hardcore Mercenaries",
			},
		],
		[
			"https://poe.kakaogames.com/api/trade/search/xbox/Standard",
			{ kind: "search", game: "poe1", realm: "xbox", league: "Standard" },
		],
		[
			"https://www.pathofexile.com/api/trade/fetch/a1,b2,c3?query=Gk3p",
			{ kind: "fetch", game: "poe1", queryId: "Gk3p", ids: ["a1", "b2", "c3"] },
		],
		[
			"https://www.pathofexile.com/api/trade2/fetch/a1?query=Gk3p&realm=poe2",
			{ kind: "fetch", game: "poe2", queryId: "Gk3p", ids: ["a1"] },
		],
	])("classifies %s", (url, expected) => {
		expect(classifyApiUrl(new URL(url))).toEqual(expected);
	});

	it.each([
		"https://www.pathofexile.com/api/trade/data/stats",
		"https://www.pathofexile.com/api/trade/exchange/Standard",
		"https://www.pathofexile.com/api/trade/fetch/a1",
		"https://www.pathofexile.com/api/trade/search",
		"https://example.com/api/trade/search/Standard",
		"https://www.pathofexile.com/trade/search/Standard",
	])("ignores %s", (url) => {
		expect(classifyApiUrl(new URL(url))).toBeNull();
	});
});

describe("parseSearch", () => {
	it("reads the query and search result", () => {
		const parsed = parseSearch(searchRequest, searchResponse);
		expect(parsed).not.toBeNull();
		expect(parsed?.searchId).toBe("Gk3pVQ7fX");
		expect(parsed?.total).toBe(2);
		expect(parsed?.resultIds).toEqual(["a1b2c3", "d4e5f6"]);
		expect(parsed?.query.query.type).toBe("Expert Waxed Jacket");
		expect(parsed?.query.query.stats?.[0]?.filters.map((f) => f.id)).toEqual([
			"explicit.stat_3299347043",
			"explicit.stat_4220027924",
		]);
	});

	it("keeps fields the schema does not know about", () => {
		const parsed = parseSearch(
			{ ...searchRequest, futureField: 1 },
			searchResponse,
		);
		expect(parsed?.query).toHaveProperty("futureField", 1);
	});

	it.each([
		[{ nope: true }, searchResponse],
		[searchRequest, { error: { code: 2, message: "Invalid query" } }],
		[searchRequest, { id: "x", result: "not-an-array", total: 1 }],
		["not json", searchResponse],
	])("returns null for invalid input %#", (request, response) => {
		expect(parseSearch(request, response)).toBeNull();
	});
});

describe("parseFetchResponse", () => {
	const items = parseFetchResponse(fetchResponse);

	it("skips null entries (delisted items)", () => {
		expect(items?.map((i) => i.id)).toEqual(["a1b2c3", "d4e5f6"]);
	});

	it("maps mods to the stat IDs that matched them", () => {
		expect(items?.[0]?.mods).toEqual([
			{
				kind: "explicit",
				text: "+92 to maximum Life",
				statIds: ["explicit.stat_3299347043"],
			},
			{
				kind: "explicit",
				text: "+34% to Fire Resistance",
				statIds: ["explicit.stat_3372524247"],
			},
			{
				kind: "explicit",
				text: "+12% to Cold Resistance",
				statIds: ["explicit.stat_4220027924"],
			},
		]);
	});

	it("reads price, base and item level", () => {
		expect(items?.[0]).toMatchObject({
			name: "Doom Shelter",
			baseType: "Expert Waxed Jacket",
			ilvl: 82,
			price: { amount: 2, currency: "divine" },
		});
		expect(items?.[1]?.price).toBeNull();
	});

	it("returns null for an error response", () => {
		expect(
			parseFetchResponse({ error: { code: 3, message: "Rate limited" } }),
		).toBeNull();
	});
});
