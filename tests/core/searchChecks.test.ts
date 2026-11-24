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

function withFilters(
	filters: Record<string, Record<string, unknown>>,
	extra: Partial<TradeQuery["query"]> = {},
): TradeQuery {
	return {
		query: {
			...extra,
			filters: Object.fromEntries(
				Object.entries(filters).map(([group, f]) => [group, { filters: f }]),
			),
		},
	};
}

describe("checkSearch: gem quality", () => {
	it("flags uncorrupted gem quality above 20% and anything above 23%", () => {
		const gem = { type_filters: { category: { option: "gem.activegem" } } };
		expect(
			ids(
				withFilters({
					...gem,
					misc_filters: {
						quality: { min: 21 },
						corrupted: { option: "false" },
					},
				}),
			),
		).toEqual(["gem-quality-needs-corruption"]);
		expect(
			ids(withFilters({ ...gem, misc_filters: { quality: { min: 23 } } })),
		).toEqual([]);
		expect(
			ids(withFilters({ ...gem, misc_filters: { quality: { min: 24 } } })),
		).toEqual(["gem-quality-out-of-reach"]);
	});

	it("leaves non-gem quality alone", () => {
		expect(
			ids(
				withFilters({
					type_filters: { category: { option: "armour.chest" } },
					misc_filters: {
						quality: { min: 28 },
						corrupted: { option: "false" },
					},
				}),
			),
		).toEqual([]);
	});
});

describe("checkSearch: sockets and links", () => {
	it("caps by item kind", () => {
		const search = (category: string, sockets: Record<string, unknown>) =>
			withFilters({
				type_filters: { category: { option: category } },
				socket_filters: sockets,
			});
		expect(ids(search("armour.gloves", { links: { min: 5 } }))).toEqual([
			"links-out-of-reach",
		]);
		expect(ids(search("armour.gloves", { links: { min: 4 } }))).toEqual([]);
		expect(ids(search("weapon.wand", { sockets: { min: 4 } }))).toEqual([
			"sockets-out-of-reach",
		]);
		expect(ids(search("armour.chest", { links: { min: 6 } }))).toEqual([]);
		expect(ids(withFilters({ socket_filters: { links: { min: 7 } } }))).toEqual(
			["links-out-of-reach"],
		);
	});
});

describe("checkSearch: contradictory filters", () => {
	it("flags mirrored and corrupted together", () => {
		expect(
			ids(
				withFilters({
					misc_filters: {
						mirrored: { option: "true" },
						corrupted: { option: "true" },
					},
				}),
			),
		).toEqual(["mirrored-and-corrupted"]);
		expect(
			ids(
				withFilters({
					misc_filters: {
						mirrored: { option: "true" },
						corrupted: { option: "false" },
					},
				}),
			),
		).toEqual([]);
	});

	it("flags fractured uniques", () => {
		expect(
			ids(
				withFilters({
					type_filters: { rarity: { option: "unique" } },
					misc_filters: { fractured_item: { option: "true" } },
				}),
			),
		).toEqual(["fractured-unique"]);
	});

	it("flags a minimum above the maximum in filters and enabled stats, in both games", () => {
		const query = withFilters(
			{ trade_filters: { price: { min: 10, max: 5 } } },
			{
				stats: [
					{
						type: "and",
						filters: [
							{ id: "explicit.stat_1", value: { min: 50, max: 10 } },
							{
								id: "explicit.stat_2",
								value: { min: 50, max: 10 },
								disabled: true,
							},
						],
					},
					{ type: "count", filters: [], value: { min: 3, max: 1 } },
				],
			},
		);
		const expected = [
			"min-above-max:trade_filters.price",
			"min-above-max:stats.1",
			"min-above-max:explicit.stat_1",
		];
		expect(ids(query).sort()).toEqual([...expected].sort());
		expect(
			checkSearch("poe2", query)
				.map((w) => w.id)
				.sort(),
		).toEqual([...expected].sort());
		expect(checkSearch("poe1", query)[0]?.message).toContain(
			"Price has a minimum of 10",
		);
	});
});
