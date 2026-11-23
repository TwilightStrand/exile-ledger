import * as v from "valibot";
import { CATEGORY_LABELS } from "./categories";
import type { TradeQuery } from "./query";

const CategoryFilter = v.object({
	type_filters: v.object({
		filters: v.object({ category: v.object({ option: v.string() }) }),
	}),
});

function nameOf(value: TradeQuery["query"]["type"]): string | undefined {
	return typeof value === "string" ? value : value?.option;
}

/** A short title for a search, in the order a player would describe it. */
export function titleOfQuery(query: TradeQuery): string {
	const { name, type, term, filters } = query.query;
	const item = [nameOf(name), nameOf(type)].filter(Boolean).join(" ");
	if (item) return item;
	if (term) return term;
	const category = v.safeParse(CategoryFilter, filters);
	if (category.success) {
		const id = category.output.type_filters.filters.category.option;
		return CATEGORY_LABELS[id] ?? id;
	}
	return "Any item";
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatAgo(then: number, now: number): string {
	const elapsed = now - then;
	if (elapsed < MINUTE) return "just now";
	if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
	if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
	if (elapsed < 2 * DAY) return "yesterday";
	if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
	return new Date(then).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

export function formatCount(n: number): string {
	return n.toLocaleString("en");
}
