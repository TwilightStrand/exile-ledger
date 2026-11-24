import { describe, expect, it } from "vitest";
import type { TradeQuery } from "../../src/core/query";
import { checkSearch } from "../../src/core/searchChecks";

function gemSearch(
	type: TradeQuery["query"]["type"],
	misc: Record<string, unknown>,
	category?: string,
): TradeQuery {
	return {
		query: {
			type,
			filters: {
				misc_filters: { filters: misc },
				...(category
					? { type_filters: { filters: { category: { option: category } } } }
					: {}),
			},
		},
	};
}

const ids = (query: TradeQuery) => checkSearch("poe1", query).map((w) => w.id);

describe("checkSearch: gem level", () => {
	it("flags an uncorrupted Empower above level 3", () => {
		const query = gemSearch("Empower Support", {
			gem_level: { min: 4 },
			corrupted: { option: "false" },
		});
		expect(ids(query)).toEqual(["gem-level-needs-corruption"]);
		expect(checkSearch("poe1", query)[0]?.message).toContain("Empower");
	});

	it("accepts level 4 when corrupted items are allowed", () => {
		expect(
			ids(gemSearch("Empower Support", { gem_level: { min: 4 } })),
		).toEqual([]);
		expect(
			ids(
				gemSearch("Enlighten Support", {
					gem_level: { min: 4 },
					corrupted: { option: "true" },
				}),
			),
		).toEqual([]);
	});

	it("flags levels no gem reaches even corrupted", () => {
		expect(
			ids(gemSearch("Enhance Support", { gem_level: { min: 5 } })),
		).toEqual(["gem-level-out-of-reach"]);
	});

	it("reads typed names, discriminated types and the fuzzy prefix", () => {
		const misc = { gem_level: { min: 4 }, corrupted: { option: "false" } };
		expect(ids(gemSearch({ option: "Empower Support" }, misc))).toHaveLength(1);
		expect(
			ids({
				query: {
					term: "~empower",
					filters: { misc_filters: { filters: misc } },
				},
			}),
		).toHaveLength(1);
	});

	it("uses level 5 for Awakened gems and 20 for other gems in a gem category", () => {
		const uncorrupted = (min: number) => ({
			gem_level: { min },
			corrupted: { option: "false" },
		});
		expect(
			ids(gemSearch("Awakened Added Fire Damage Support", uncorrupted(5))),
		).toEqual([]);
		expect(
			ids(gemSearch("Awakened Added Fire Damage Support", uncorrupted(6))),
		).toEqual(["gem-level-needs-corruption"]);
		expect(ids(gemSearch(undefined, uncorrupted(21), "gem"))).toEqual([
			"gem-level-needs-corruption",
		]);
		expect(
			ids(gemSearch(undefined, uncorrupted(20), "gem.supportgem")),
		).toEqual([]);
	});

	it("stays quiet for unknown items and for PoE2", () => {
		const misc = { gem_level: { min: 25 }, corrupted: { option: "false" } };
		expect(ids(gemSearch("Some Unique", misc))).toEqual([]);
		expect(checkSearch("poe2", gemSearch("Empower Support", misc))).toEqual([]);
	});
});
