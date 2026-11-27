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

/** Other leagues' rates that are past keeping or no longer parse. */
async function removeStale(keep: string, now: number): Promise<void> {
	const all = await browser.storage.local.get(null);
	const stale = Object.entries(all)
		.filter(([key, value]) => {
			if (!key.startsWith(CACHE_PREFIX) || key === keep) return false;
			const parsed = v.safeParse(RatesSchema, value);
			return !parsed.success || now - parsed.output.fetchedAt > RATES_KEEP_MS;
		})
		.map(([key]) => key);
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
			await removeStale(key, now);
		}
		return rates ?? fallback;
	} catch {
		return fallback;
	}
}
