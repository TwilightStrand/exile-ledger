import { describe, expect, it } from "vitest";
import {
	classifyApiUrl,
	parseFetchResponse,
	parseSearch,
	stripMarkup,
} from "../../src/core/tradeApi";
import poe1FetchResponse from "../fixtures/trade/poe1-fetch-response.json";
import poe1SearchRequest from "../fixtures/trade/poe1-search-request.json";
import poe1SearchResponse from "../fixtures/trade/poe1-search-response.json";
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
	it.each([
		["poe1", poe1SearchRequest, poe1SearchResponse],
		["poe2", searchRequest, searchResponse],
	])("reads a real %s search", (_game, request, response) => {
		const parsed = parseSearch(request, response);
		expect(parsed?.searchId).toBe(response.id);
		expect(parsed?.total).toBe(10000);
		expect(parsed?.resultIds).toEqual(response.result);
		expect(parsed?.query.query.stats?.[0]?.filters.map((f) => f.id)).toEqual([
			"explicit.stat_3299347043",
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
		[searchRequest, { error: { code: 2, message: "Unknown item base type" } }],
		[searchRequest, { id: "x", result: "not-an-array", total: 1 }],
		["not json", searchResponse],
	])("returns null for invalid input %#", (request, response) => {
		expect(parseSearch(request, response)).toBeNull();
	});
});

describe("stripMarkup", () => {
	it.each([
		["+28 to [Evasion] Rating", "+28 to Evasion Rating"],
		[
			"70% increased [Evasion] and [EnergyShield|Energy Shield]",
			"70% increased Evasion and Energy Shield",
		],
		["+92 to maximum Life", "+92 to maximum Life"],
	])("%s", (input, expected) => {
		expect(stripMarkup(input)).toBe(expected);
	});
});

describe("parseFetchResponse", () => {
	it("reads a real PoE2 response with marked-up mod text", () => {
		const items = parseFetchResponse(fetchResponse);
		expect(items?.map((i) => i.id)).toEqual(searchResponse.result);
		expect(items?.[0]).toMatchObject({
			name: "Viper Wrap",
			baseType: "Hatungo Garb",
			ilvl: 73,
			price: { amount: 1, currency: "exalted" },
		});
		expect(items?.[0]?.mods.slice(0, 3)).toEqual([
			{
				kind: "explicit",
				text: "+28 to Evasion Rating",
				statIds: ["explicit.stat_53045048"],
			},
			{
				kind: "explicit",
				text: "+12 to maximum Energy Shield",
				statIds: ["explicit.stat_4052037485"],
			},
			{
				kind: "explicit",
				text: "70% increased Evasion and Energy Shield",
				statIds: ["explicit.stat_1999113824"],
			},
		]);
	});

	it("reads a real PoE1 response with implicit and explicit mods", () => {
		const items = parseFetchResponse(poe1FetchResponse);
		expect(items?.[0]?.mods.slice(0, 3)).toEqual([
			{
				kind: "implicit",
				text: "+12% to all Elemental Resistances",
				statIds: ["implicit.stat_2901986750"],
			},
			{
				kind: "explicit",
				text: "+66 to maximum Life",
				statIds: ["explicit.stat_3299347043"],
			},
			{
				kind: "explicit",
				text: "Regenerate 19.2 Life per second",
				statIds: ["explicit.stat_3325883026"],
			},
		]);
	});

	it("maps plain-string mod lines to stat IDs by line position", () => {
		const items = parseFetchResponse({
			result: [
				null,
				{
					id: "s1",
					listing: {},
					item: {
						explicitMods: ["+40 to maximum Life", "+20% to Cold Resistance"],
						extended: {
							hashes: {
								explicit: [
									["explicit.stat_3299347043", [1]],
									["explicit.stat_4220027924", [0]],
								],
							},
						},
					},
				},
			],
		});
		expect(items).toEqual([
			{
				id: "s1",
				name: "",
				typeLine: "",
				baseType: "",
				ilvl: null,
				price: null,
				indexed: null,
				rarity: null,
				text: null,
				mods: [
					{
						kind: "explicit",
						text: "+40 to maximum Life",
						statIds: ["explicit.stat_3299347043"],
					},
					{
						kind: "explicit",
						text: "+20% to Cold Resistance",
						statIds: ["explicit.stat_4220027924"],
					},
				],
			},
		]);
	});

	it("returns null for an error response", () => {
		expect(
			parseFetchResponse({ error: { code: 3, message: "Rate limited" } }),
		).toBeNull();
	});
});

describe("parseFetchResponse item details", () => {
	it("decodes PoE1's game text and reads rarity from frameType", () => {
		const items = parseFetchResponse(poe1FetchResponse) ?? [];
		expect(items[1]?.rarity).toBe("Rare");
		expect(items[1]?.ilvl).toBe(35);
		expect(items[1]?.text).toMatch(
			/^Item Class: Body Armours\r?\nRarity: Rare/,
		);
	});

	it("has no game text for PoE2", () => {
		const items = parseFetchResponse(fetchResponse) ?? [];
		expect(items[0]?.text).toBe(null);
		expect(items[0]?.rarity).toBe("Rare");
	});
});
