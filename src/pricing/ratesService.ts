import * as v from "valibot";
import { browser } from "wxt/browser";
import {
	isFresh,
	overviewUrl,
	parseCardOverview,
	parseOverview,
	type Rates,
	RatesSchema,
} from "../core/pricing";
import type { Game } from "../core/tradeUrl";

export const NINJA_ORIGIN = "https://poe.ninja/*";

const CACHE_PREFIX = "ninja:";
const cacheKey = (game: Game, league: string) =>
	`${CACHE_PREFIX}${game}:${league}`;

/**
 * How long another league's rates are kept as an offline fallback. Leagues end
 * and their keys would otherwise stay in storage.local for good.
 */
export const RATES_KEEP_MS = 7 * 24 * 60 * 60_000;

const isStale = (value: unknown, now: number) => {
	const parsed = v.safeParse(RatesSchema, value);
	return !parsed.success || now - parsed.output.fetchedAt > RATES_KEEP_MS;
};

const staleKeys = (
	stored: Record<string, unknown>,
	keep: string,
	now: number,
) =>
	Object.entries(stored)
		.filter(
			([key, value]) =>
				key.startsWith(CACHE_PREFIX) && key !== keep && isStale(value, now),
		)
		.map(([key]) => key);

/** Other leagues' rates that are past keeping or no longer parse. */
async function removeStale(keep: string, now: number): Promise<void> {
	const candidates = staleKeys(
		await browser.storage.local.get(null),
		keep,
		now,
	);
	if (candidates.length === 0) return;
	// Another tab may have refreshed one of them since the first read.
	const stale = staleKeys(
		await browser.storage.local.get(candidates),
		keep,
		now,
	);
	if (stale.length > 0) await browser.storage.local.remove(stale);
}

/** PoE1 only; a failed card lookup leaves currency prices working. */
async function cardValues(
	game: Game,
	league: string,
): Promise<Record<string, number>> {
	if (game !== "poe1") return {};
	try {
		const response = await fetch(overviewUrl(game, league, "DivinationCard"));
		return response.ok ? parseCardOverview(await response.json()) : {};
	} catch {
		return {};
	}
}

/**
 * Rates from poe.ninja, cached in storage.local for 30 minutes. Stale rates are
 * returned when poe.ninja is unreachable: a slightly old price beats none.
 */
export async function getRates(
	game: Game,
	league: string,
	now = Date.now(),
): Promise<Rates | null> {
	const key = cacheKey(game, league);
	const stored = (await browser.storage.local.get(key))[key];
	const cached = v.safeParse(RatesSchema, stored);
	const fallback = cached.success ? cached.output : null;
	if (fallback && isFresh(fallback, now)) return fallback;
	if (!(await browser.permissions.contains({ origins: [NINJA_ORIGIN] }))) {
		return null;
	}
	try {
		const response = await fetch(overviewUrl(game, league));
		if (!response.ok) return fallback;
		const parsed = parseOverview(await response.json(), game, league, now);
		const rates = parsed && {
			...parsed,
			cards: await cardValues(game, league),
		};
		if (rates) {
			await browser.storage.local.set({ [key]: rates });
			// Housekeeping only: a failure here must not cost the fresh rates.
			await removeStale(key, now).catch(() => {});
		}
		return rates ?? fallback;
	} catch {
		return fallback;
	}
}
