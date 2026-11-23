import * as v from "valibot";
import { browser } from "wxt/browser";
import {
	isFresh,
	overviewUrl,
	parseOverview,
	type Rates,
	RatesSchema,
} from "../core/pricing";
import type { Game } from "../core/tradeUrl";

export const NINJA_ORIGIN = "https://poe.ninja/*";

const cacheKey = (game: Game, league: string) => `ninja:${game}:${league}`;

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
		const rates = parseOverview(await response.json(), game, league, now);
		if (rates) await browser.storage.local.set({ [key]: rates });
		return rates ?? fallback;
	} catch {
		return fallback;
	}
}
