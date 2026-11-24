import * as v from "valibot";
import type { TradeQuery } from "./query";
import type { Game } from "./tradeUrl";

/** A reason the current search cannot return what the player is after. */
export interface SearchWarning {
	id: string;
	message: string;
}

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
const EXCEPTIONAL_GEMS = new Set(["empower", "enlighten", "enhance"]);
const EXCEPTIONAL_MAX_LEVEL = 3;
const AWAKENED_MAX_LEVEL = 5;
const GEM_MAX_LEVEL = 20;
const GEM_MAX_QUALITY = 20;
const GEM_CORRUPTED_MAX_QUALITY = 23;

/** The gem this search is for, or null when it is not clearly a gem. */
function gemOf(query: TradeQuery): { maxLevel: number; label: string } | null {
	const name = itemName(query);
	if (name && EXCEPTIONAL_GEMS.has(name)) {
		const label = `${name[0]?.toUpperCase()}${name.slice(1)} gems`;
		return { maxLevel: EXCEPTIONAL_MAX_LEVEL, label };
	}
	if (name?.startsWith("awakened ")) {
		return { maxLevel: AWAKENED_MAX_LEVEL, label: "Awakened gems" };
	}
	if (category(query)?.startsWith("gem")) {
		return { maxLevel: GEM_MAX_LEVEL, label: "Gems" };
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
				id: "gem-level-out-of-reach",
				message: `${gem.label} top out at level ${gem.maxLevel + 1}, and only when corrupted. Nothing can match a minimum of ${wanted}.`,
			},
		];
	}
	if (!excludesCorrupted(query)) return [];
	return [
		{
			id: "gem-level-needs-corruption",
			message: `${gem.label} only go above level ${gem.maxLevel} by corrupting, but this search excludes corrupted items. Set Corrupted to Any or Yes.`,
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
				id: "gem-quality-out-of-reach",
				message: `${gem.label} top out at ${GEM_CORRUPTED_MAX_QUALITY}% quality, and only when corrupted. Nothing can match a minimum of ${wanted}%.`,
			},
		];
	}
	if (!excludesCorrupted(query)) return [];
	return [
		{
			id: "gem-quality-needs-corruption",
			message: `${gem.label} only go above ${GEM_MAX_QUALITY}% quality by corrupting, but this search excludes corrupted items. Set Corrupted to Any or Yes.`,
		},
	];
};

// Most sockets a PoE1 item of each kind can have; links cannot exceed sockets.
// Body armour and two-handed weapons reach 6, which no filter can exceed anyway.
const SOCKET_CAPS: { label: string; max: number; categories: string[] }[] = [
	{
		label: "Helmets, gloves and boots",
		max: 4,
		categories: ["armour.helmet", "armour.gloves", "armour.boots"],
	},
	{ label: "Shields", max: 3, categories: ["armour.shield"] },
	{
		label: "One-handed weapons",
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
	const label = cap?.label ?? "Items";
	const max = cap?.max ?? ANY_ITEM_MAX_SOCKETS;
	return SOCKET_KEYS.flatMap((key) => {
		const wanted = filterOf(query, "socket_filters", key)?.min;
		if (wanted === undefined || wanted <= max) return [];
		return [
			{
				id: `${key}-out-of-reach`,
				message: `${label} have at most ${max} sockets, so nothing can match a minimum of ${wanted} ${key}.`,
			},
		];
	});
};

const mirroredAndCorrupted: Check = (query) =>
	yesNo(query, "misc_filters", "mirrored") === "true" &&
	yesNo(query, "misc_filters", "corrupted") === "true"
		? [
				{
					id: "mirrored-and-corrupted",
					message:
						"Corrupted items cannot be mirrored, and mirrored items cannot be corrupted. Set one of Mirrored or Corrupted to Any.",
				},
			]
		: [];

const fracturedUnique: Check = (query) =>
	yesNo(query, "misc_filters", "fractured_item") === "true" &&
	yesNo(query, "type_filters", "rarity") === "unique"
		? [
				{
					id: "fractured-unique",
					message:
						"Unique items are never fractured. Set Fractured to Any or pick another rarity.",
				},
			]
		: [];

function readable(key: string): string {
	const words = key.replace(/_/g, " ");
	return `${words[0]?.toUpperCase()}${words.slice(1)}`;
}

const inverted = (
	value: { min?: number | undefined; max?: number | undefined } | undefined,
) =>
	value?.min !== undefined && value.max !== undefined && value.min > value.max;

/** Any min/max pair where the minimum is above the maximum. Holds for both games. */
const minAboveMax: Check = (query) => {
	const warnings: SearchWarning[] = [];
	const groups = v.safeParse(FilterGroups, query.query.filters);
	if (groups.success) {
		for (const [group, { filters }] of Object.entries(groups.output)) {
			for (const key of Object.keys(filters ?? {})) {
				const value = filterOf(query, group, key);
				if (value && inverted(value)) {
					warnings.push({
						id: `min-above-max:${group}.${key}`,
						message: `${readable(key)} has a minimum of ${value.min} above its maximum of ${value.max}.`,
					});
				}
			}
		}
	}
	for (const [i, statGroup] of (query.query.stats ?? []).entries()) {
		if (statGroup.disabled) continue;
		if (inverted(statGroup.value)) {
			warnings.push({
				id: `min-above-max:stats.${i}`,
				message: `A stat group's count or total has a minimum of ${statGroup.value?.min} above its maximum of ${statGroup.value?.max}.`,
			});
		}
		for (const filter of statGroup.filters) {
			if (filter.disabled || !inverted(filter.value)) continue;
			warnings.push({
				id: `min-above-max:${filter.id}`,
				message: `A stat filter has a minimum of ${filter.value?.min} above its maximum of ${filter.value?.max}.`,
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
