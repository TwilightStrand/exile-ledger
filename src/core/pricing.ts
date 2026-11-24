import * as v from "valibot";
import { en, type Messages } from "./i18n/en";
import type { Game } from "./tradeUrl";

/** Rates go stale fast in a new league, but poe.ninja itself caches for 30 minutes. */
export const RATES_TTL_MS = 30 * 60 * 1000;

const OverviewSchema = v.object({
	core: v.object({
		primary: v.string(),
		secondary: v.string(),
	}),
	lines: v.array(v.object({ id: v.string(), primaryValue: v.number() })),
});

/** Value of each currency (trade site ids) in the league's core currency. */
export interface Rates {
	game: Game;
	league: string;
	primary: string;
	values: Record<string, number>;
	/** Divination card value by card name, in the same core currency (PoE1 only). */
	cards: Record<string, number>;
	fetchedAt: number;
}

export const RatesSchema = v.object({
	game: v.picklist(["poe1", "poe2"]),
	league: v.string(),
	primary: v.string(),
	values: v.record(v.string(), v.number()),
	// Rates cached before card prices existed have none; the next refresh adds them.
	cards: v.optional(v.record(v.string(), v.number()), {}),
	fetchedAt: v.number(),
});

/** poe.ninja's exchange overview (`/{game}/api/economy/exchange/current/overview`). */
export function parseOverview(
	raw: unknown,
	game: Game,
	league: string,
	now: number,
): Rates | null {
	const parsed = v.safeParse(OverviewSchema, raw);
	if (!parsed.success || parsed.output.lines.length === 0) return null;
	const values: Record<string, number> = { [parsed.output.core.primary]: 1 };
	for (const line of parsed.output.lines) {
		if (line.primaryValue > 0) values[line.id] = line.primaryValue;
	}
	return {
		game,
		league,
		primary: parsed.output.core.primary,
		values,
		cards: {},
		fetchedAt: now,
	};
}

const CardOverviewSchema = v.object({
	lines: v.array(v.object({ id: v.string(), primaryValue: v.number() })),
	items: v.array(v.object({ id: v.string(), name: v.string() })),
});

/**
 * Card values by name from poe.ninja's DivinationCard overview. The trade API
 * names a card by its typeLine, so the overview's ids are mapped to names.
 */
export function parseCardOverview(raw: unknown): Record<string, number> {
	const parsed = v.safeParse(CardOverviewSchema, raw);
	if (!parsed.success) return {};
	const names = new Map(parsed.output.items.map((i) => [i.id, i.name]));
	const cards: Record<string, number> = {};
	for (const line of parsed.output.lines) {
		const name = names.get(line.id);
		if (name && line.primaryValue > 0) cards[name] = line.primaryValue;
	}
	return cards;
}

/** A full stack's worth in both display currencies, or nothing for unknown cards. */
export function stackValue(
	card: { name: string; stackSize: number },
	rates: Rates,
): Equivalent[] {
	const each = rates.cards[card.name];
	if (each === undefined || card.stackSize <= 0) return [];
	const inPrimary = each * card.stackSize;
	return DISPLAY_CURRENCIES[rates.game].flatMap((target) => {
		const targetValue = rates.values[target];
		return targetValue === undefined
			? []
			: [{ currency: target, amount: inPrimary / targetValue }];
	});
}

export function overviewUrl(
	game: Game,
	league: string,
	type: "Currency" | "DivinationCard" = "Currency",
): string {
	const url = new URL(
		`https://poe.ninja/${game}/api/economy/exchange/current/overview`,
	);
	url.searchParams.set("league", league);
	url.searchParams.set("type", type);
	return url.toString();
}

/** The two currencies players think in: chaos and divine in PoE1, exalted and divine in PoE2. */
export const DISPLAY_CURRENCIES: Record<Game, readonly [string, string]> = {
	poe1: ["chaos", "divine"],
	poe2: ["exalted", "divine"],
};

export interface Equivalent {
	currency: string;
	amount: number;
}

/** A listing price in the game's two display currencies, leaving out the one it is already priced in. */
export function equivalents(
	amount: number,
	currency: string,
	rates: Rates,
): Equivalent[] {
	const value = rates.values[currency];
	if (value === undefined || amount <= 0) return [];
	const inPrimary = amount * value;
	return DISPLAY_CURRENCIES[rates.game].flatMap((target) => {
		const targetValue = rates.values[target];
		if (target === currency || targetValue === undefined) return [];
		return [{ currency: target, amount: inPrimary / targetValue }];
	});
}

/** 3 significant figures below 100, whole numbers above; enough to compare listings. */
export function formatEquivalent(
	{ currency, amount }: Equivalent,
	t: Messages = en,
): string {
	const shown = t.format.number(
		amount >= 100
			? Math.round(amount)
			: Number(amount.toPrecision(amount >= 1 ? 3 : 2)),
	);
	const short: Record<string, string> = t.trade.currencyShort;
	return `${shown} ${short[currency] ?? currency}`;
}

export const isFresh = (rates: Rates, now: number) =>
	now - rates.fetchedAt < RATES_TTL_MS;
