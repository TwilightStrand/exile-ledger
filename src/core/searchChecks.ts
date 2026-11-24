import * as v from "valibot";
import type { TradeQuery } from "./query";
import type { Game } from "./tradeUrl";

/** A reason the current search cannot return what the player is after. */
export interface SearchWarning {
	id: string;
	message: string;
}

const MiscFilters = v.object({
	misc_filters: v.object({
		filters: v.looseObject({
			gem_level: v.optional(v.looseObject({ min: v.optional(v.number()) })),
			corrupted: v.optional(v.looseObject({ option: v.optional(v.string()) })),
		}),
	}),
});

const CategoryFilter = v.object({
	type_filters: v.object({
		filters: v.object({ category: v.object({ option: v.string() }) }),
	}),
});

// PoE1 levels without corruption; a Vaal Orb can add one level on top.
const EXCEPTIONAL_GEMS = new Set(["empower", "enlighten", "enhance"]);
const EXCEPTIONAL_MAX = 3;
const AWAKENED_MAX = 5;
const GEM_MAX = 20;

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

function isGemCategory(query: TradeQuery): boolean {
	const category = v.safeParse(CategoryFilter, query.query.filters);
	return (
		category.success &&
		category.output.type_filters.filters.category.option.startsWith("gem")
	);
}

/** The highest level a gem reaches uncorrupted, or null when the search is not for a known gem. */
function uncorruptedMaxLevel(query: TradeQuery): {
	max: number;
	label: string;
} | null {
	const name = itemName(query);
	if (name && EXCEPTIONAL_GEMS.has(name)) {
		const label = `${name[0]?.toUpperCase()}${name.slice(1)} gems`;
		return { max: EXCEPTIONAL_MAX, label };
	}
	if (name?.startsWith("awakened ")) {
		return { max: AWAKENED_MAX, label: "Awakened gems" };
	}
	if (isGemCategory(query)) return { max: GEM_MAX, label: "Gems" };
	return null;
}

function gemLevelWithoutCorruption(query: TradeQuery): SearchWarning | null {
	const misc = v.safeParse(MiscFilters, query.query.filters);
	if (!misc.success) return null;
	const { gem_level, corrupted } = misc.output.misc_filters.filters;
	const wanted = gem_level?.min;
	if (wanted === undefined) return null;
	const gem = uncorruptedMaxLevel(query);
	if (!gem || wanted <= gem.max) return null;
	if (wanted > gem.max + 1) {
		return {
			id: "gem-level-out-of-reach",
			message: `${gem.label} top out at level ${gem.max + 1}, and only when corrupted. Nothing can match a minimum of ${wanted}.`,
		};
	}
	if (corrupted?.option !== "false") return null;
	return {
		id: "gem-level-needs-corruption",
		message: `${gem.label} only go above level ${gem.max} by corrupting, but this search excludes corrupted items. Set Corrupted to Any or Yes.`,
	};
}

const CHECKS: Partial<
	Record<Game, ((query: TradeQuery) => SearchWarning | null)[]>
> = {
	poe1: [gemLevelWithoutCorruption],
};

/** Searches that cannot match anything, so the player can fix them instead of waiting on an empty list. */
export function checkSearch(game: Game, query: TradeQuery): SearchWarning[] {
	return (CHECKS[game] ?? []).flatMap((check) => check(query) ?? []);
}
