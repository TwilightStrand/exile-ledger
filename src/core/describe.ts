import * as v from "valibot";
import { CATEGORY_LABELS } from "./categories";
import { en, type Messages } from "./i18n/en";
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
export function titleOfQuery(query: TradeQuery, t: Messages = en): string {
	const { name, type, term, filters } = query.query;
	const item = [nameOf(name), nameOf(type)].filter(Boolean).join(" ");
	if (item) return item;
	if (term) return term;
	const category = v.safeParse(CategoryFilter, filters);
	if (category.success) {
		const id = category.output.type_filters.filters.category.option;
		return CATEGORY_LABELS[id] ?? id;
	}
	return t.common.anyItem;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatAgo(
	then: number,
	now: number,
	t: Messages["time"] = en.time,
): string {
	const elapsed = now - then;
	if (elapsed < MINUTE) return t.justNow;
	if (elapsed < HOUR) return t.minutesAgo(Math.floor(elapsed / MINUTE));
	if (elapsed < DAY) return t.hoursAgo(Math.floor(elapsed / HOUR));
	if (elapsed < 2 * DAY) return t.yesterday;
	if (elapsed < 7 * DAY) return t.daysAgo(Math.floor(elapsed / DAY));
	return t.date(then);
}
