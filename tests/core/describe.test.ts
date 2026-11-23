import { describe, expect, it } from "vitest";
import { formatAgo, titleOfQuery } from "../../src/core/describe";
import type { TradeQuery } from "../../src/core/query";
import searchRequest from "../fixtures/trade/poe2-search-request.json";

const q = (query: TradeQuery["query"]): TradeQuery => ({ query });

describe("titleOfQuery", () => {
	it.each<[string, TradeQuery, string]>([
		[
			"a unique name and base",
			q({ name: "Viper Wrap", type: "Hatungo Garb" }),
			"Viper Wrap Hatungo Garb",
		],
		["a base type", q({ type: "Hatungo Garb" }), "Hatungo Garb"],
		[
			"a discriminated base",
			q({ type: { option: "Jewel", discriminator: "warfortheatlas" } }),
			"Jewel",
		],
		["a free-text term", q({ term: "tabula" }), "tabula"],
		["nothing to go on", q({}), "Any item"],
		[
			"an unknown category id",
			q({
				filters: {
					type_filters: { filters: { category: { option: "new.thing" } } },
				},
			}),
			"new.thing",
		],
	])("names %s", (_label, query, expected) => {
		expect(titleOfQuery(query)).toBe(expected);
	});

	it("names a real category search by its label", () => {
		expect(titleOfQuery(searchRequest)).toBe("Body Armour");
	});
});

describe("formatAgo", () => {
	const now = Date.UTC(2026, 10, 23, 12, 0, 0);
	it.each([
		[now - 20_000, "just now"],
		[now - 5 * 60_000, "5m ago"],
		[now - 3 * 3_600_000, "3h ago"],
		[now - 30 * 3_600_000, "yesterday"],
		[now - 4 * 86_400_000, "4d ago"],
		[now - 40 * 86_400_000, "Oct 14"],
	])("formats %i", (then, expected) => {
		expect(formatAgo(then, now)).toBe(expected);
	});
});
