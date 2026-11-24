import * as v from "valibot";
import type { TradeQuery } from "./query";
import type { Game } from "./tradeUrl";

export type GemKind = "empower" | "enlighten" | "enhance" | "awakened" | "any";
export type SocketItemKind =
	| "helmets-gloves-boots"
	| "shields"
	| "one-handed"
	| "any";

/**
 * A reason the current search cannot return what the player is after. `id`
 * is unique within one check run; `kind` picks the message.
 */
export type SearchWarning =
	| {
			kind: "gem-level-out-of-reach";
			id: string;
			gem: GemKind;
			corruptedMaxLevel: number;
			wanted: number;
	  }
	| {
			kind: "gem-level-needs-corruption";
			id: string;
			gem: GemKind;
			maxLevel: number;
	  }
	| {
			kind: "gem-quality-out-of-reach";
			id: string;
			gem: GemKind;
			corruptedMaxQuality: number;
			wanted: number;
	  }
	| {
			kind: "gem-quality-needs-corruption";
			id: string;
			gem: GemKind;
			maxQuality: number;
	  }
	| {
			kind: "sockets-out-of-reach" | "links-out-of-reach";
			id: string;
			items: SocketItemKind;
			max: number;
			wanted: number;
	  }
	| { kind: "mirrored-and-corrupted"; id: string }
	| { kind: "fractured-unique"; id: string }
	| {
			kind: "filter-min-above-max";
			id: string;
			/** The filter's key as the API names it, e.g. "gem_level". */
			filter: string;
			min: number;
			max: number;
	  }
	| {
			kind: "stat-group-min-above-max" | "stat-filter-min-above-max";
			id: string;
			min: number;
			max: number;
	  };

type Check = (query: TradeQuery) => SearchWarning[];

const FilterValue = v.looseObject({
	min: v.optional(v.number()),
	max: v.optional(v.number()),
	option: v.optional(v.unknown()),
});
type FilterValue = v.InferOutput<typeof FilterValue>;

const FilterGroups = v.record(
	v.string(),
	v.looseObject({ filters: v.optional(v.record(v.string(), v.unknown())) }),
);

/** query.filters[group].filters[key], when it has the usual min/max/option shape. */
function filterOf(
	query: TradeQuery,
	group: string,
	key: string,
): FilterValue | null {
	const groups = v.safeParse(FilterGroups, query.query.filters);
	if (!groups.success) return null;
	const value = v.safeParse(FilterValue, groups.output[group]?.filters?.[key]);
	return value.success ? value.output : null;
}

/** "true", "false" or null for a yes/no filter left on Any. */
function yesNo(query: TradeQuery, group: string, key: string): string | null {
	const option = filterOf(query, group, key)?.option;
	return option === undefined || option === null ? null : String(option);
}

function category(query: TradeQuery): string | null {
	const option = filterOf(query, "type_filters", "category")?.option;
	return typeof option === "string" ? option : null;
}

function itemName(query: TradeQuery): string | null {
	const { type, term } = query.query;
	const raw = typeof type === "string" ? type : (type?.option ?? term);
	if (!raw) return null;
	return raw
		.toLowerCase()
		.replace(/^~/, "")
		.replace(/ support$/, "")
		.trim();
}

// PoE1 caps without corruption. A Vaal Orb can add one gem level, or take
// gem quality up to 23%.
const EXCEPTIONAL_MAX_LEVEL = 3;
const AWAKENED_MAX_LEVEL = 5;
const GEM_MAX_LEVEL = 20;
const GEM_MAX_QUALITY = 20;
const GEM_CORRUPTED_MAX_QUALITY = 23;

/** The gem this search is for, or null when it is not clearly a gem. */
function gemOf(query: TradeQuery): { maxLevel: number; kind: GemKind } | null {
	const name = itemName(query);
	if (name === "empower" || name === "enlighten" || name === "enhance") {
		return { maxLevel: EXCEPTIONAL_MAX_LEVEL, kind: name };
	}
	if (name?.startsWith("awakened ")) {
		return { maxLevel: AWAKENED_MAX_LEVEL, kind: "awakened" };
	}
	if (category(query)?.startsWith("gem")) {
		return { maxLevel: GEM_MAX_LEVEL, kind: "any" };
	}
	return null;
}

const excludesCorrupted = (query: TradeQuery) =>
	yesNo(query, "misc_filters", "corrupted") === "false";

const gemLevel: Check = (query) => {
	const wanted = filterOf(query, "misc_filters", "gem_level")?.min;
	const gem = gemOf(query);
	if (wanted === undefined || !gem || wanted <= gem.maxLevel) return [];
	if (wanted > gem.maxLevel + 1) {
		return [
			{
				kind: "gem-level-out-of-reach",
				id: "gem-level-out-of-reach",
				gem: gem.kind,
				corruptedMaxLevel: gem.maxLevel + 1,
				wanted,
			},
		];
	}
	if (!excludesCorrupted(query)) return [];
	return [
		{
			kind: "gem-level-needs-corruption",
			id: "gem-level-needs-corruption",
			gem: gem.kind,
			maxLevel: gem.maxLevel,
		},
	];
};

const gemQuality: Check = (query) => {
	const wanted = filterOf(query, "misc_filters", "quality")?.min;
	const gem = gemOf(query);
	if (wanted === undefined || !gem || wanted <= GEM_MAX_QUALITY) return [];
	if (wanted > GEM_CORRUPTED_MAX_QUALITY) {
		return [
			{
				kind: "gem-quality-out-of-reach",
				id: "gem-quality-out-of-reach",
				gem: gem.kind,
				corruptedMaxQuality: GEM_CORRUPTED_MAX_QUALITY,
				wanted,
			},
		];
	}
	if (!excludesCorrupted(query)) return [];
	return [
		{
			kind: "gem-quality-needs-corruption",
			id: "gem-quality-needs-corruption",
			gem: gem.kind,
			maxQuality: GEM_MAX_QUALITY,
		},
	];
};

// Most sockets a PoE1 item of each kind can have; links cannot exceed sockets.
// Body armour and two-handed weapons reach 6, which no filter can exceed anyway.
const SOCKET_CAPS: {
	items: SocketItemKind;
	max: number;
	categories: string[];
}[] = [
	{
		items: "helmets-gloves-boots",
		max: 4,
		categories: ["armour.helmet", "armour.gloves", "armour.boots"],
	},
	{ items: "shields", max: 3, categories: ["armour.shield"] },
	{
		items: "one-handed",
		max: 3,
		categories: [
			"weapon.one",
			"weapon.onemelee",
			"weapon.oneaxe",
			"weapon.onemace",
			"weapon.onesword",
			"weapon.claw",
			"weapon.dagger",
			"weapon.runedagger",
			"weapon.sceptre",
			"weapon.wand",
		],
	},
];
const ANY_ITEM_MAX_SOCKETS = 6;
const SOCKET_KEYS: ("sockets" | "links")[] = ["sockets", "links"];

const socketsAndLinks: Check = (query) => {
	const id = category(query);
	const cap = SOCKET_CAPS.find((c) => id !== null && c.categories.includes(id));
	const items = cap?.items ?? "any";
	const max = cap?.max ?? ANY_ITEM_MAX_SOCKETS;
	return SOCKET_KEYS.flatMap((key): SearchWarning[] => {
		const wanted = filterOf(query, "socket_filters", key)?.min;
		if (wanted === undefined || wanted <= max) return [];
		const kind =
			key === "sockets" ? "sockets-out-of-reach" : "links-out-of-reach";
		return [{ kind, id: kind, items, max, wanted }];
	});
};

const mirroredAndCorrupted: Check = (query) =>
	yesNo(query, "misc_filters", "mirrored") === "true" &&
	yesNo(query, "misc_filters", "corrupted") === "true"
		? [{ kind: "mirrored-and-corrupted", id: "mirrored-and-corrupted" }]
		: [];

const fracturedUnique: Check = (query) =>
	yesNo(query, "misc_filters", "fractured_item") === "true" &&
	yesNo(query, "type_filters", "rarity") === "unique"
		? [{ kind: "fractured-unique", id: "fractured-unique" }]
		: [];

/** The pair when the minimum is above the maximum, else null. */
function inverted(
	value: { min?: number | undefined; max?: number | undefined } | undefined,
): { min: number; max: number } | null {
	if (value?.min === undefined || value.max === undefined) return null;
	return value.min > value.max ? { min: value.min, max: value.max } : null;
}

/** Any min/max pair where the minimum is above the maximum. Holds for both games. */
const minAboveMax: Check = (query) => {
	const warnings: SearchWarning[] = [];
	const groups = v.safeParse(FilterGroups, query.query.filters);
	if (groups.success) {
		for (const [group, { filters }] of Object.entries(groups.output)) {
			for (const key of Object.keys(filters ?? {})) {
				const pair = inverted(filterOf(query, group, key) ?? undefined);
				if (pair) {
					warnings.push({
						kind: "filter-min-above-max",
						id: `min-above-max:${group}.${key}`,
						filter: key,
						...pair,
					});
				}
			}
		}
	}
	for (const [i, statGroup] of (query.query.stats ?? []).entries()) {
		if (statGroup.disabled) continue;
		const groupPair = inverted(statGroup.value);
		if (groupPair) {
			warnings.push({
				kind: "stat-group-min-above-max",
				id: `min-above-max:stats.${i}`,
				...groupPair,
			});
		}
		for (const filter of statGroup.filters) {
			const pair = filter.disabled ? null : inverted(filter.value);
			if (!pair) continue;
			warnings.push({
				kind: "stat-filter-min-above-max",
				id: `min-above-max:${filter.id}`,
				...pair,
			});
		}
	}
	return warnings;
};

const CHECKS: Record<Game, Check[]> = {
	poe1: [
		gemLevel,
		gemQuality,
		socketsAndLinks,
		mirroredAndCorrupted,
		fracturedUnique,
		minAboveMax,
	],
	poe2: [minAboveMax],
};

/** Searches that cannot match anything, so the player can fix them instead of waiting on an empty list. */
export function checkSearch(game: Game, query: TradeQuery): SearchWarning[] {
	return CHECKS[game].flatMap((check) => check(query));
}
