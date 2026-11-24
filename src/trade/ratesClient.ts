import * as v from "valibot";
import { browser } from "wxt/browser";
import type { RatesRequest } from "../core/messages";
import { type Rates, RatesSchema } from "../core/pricing";
import type { Game } from "../core/tradeUrl";

/**
 * How long a league without rates waits before asking again. Private leagues
 * never get poe.ninja rates, and every results update runs a lookup, so
 * without a pause a miss would mean a request per frame while scrolling.
 */
export const RATES_RETRY_MS = 5 * 60_000;

type Entry =
	| { state: "pending" }
	| { state: "ready"; rates: Rates }
	| { state: "missing"; retryAt: number };

/**
 * Asks the background for rates once per game and league, and calls back when
 * they arrive so the page can be annotated. Lookups are synchronous so the
 * enhance pass never waits on the network.
 */
export function createRatesClient(
	onArrive: () => void,
	now: () => number = Date.now,
) {
	const cache = new Map<string, Entry>();
	return {
		get(game: Game, league: string): Rates | null {
			const key = `${game}:${league}`;
			const entry = cache.get(key);
			if (entry?.state === "ready") return entry.rates;
			if (entry?.state === "pending") return null;
			if (entry?.state === "missing" && now() < entry.retryAt) return null;
			const pending: Entry = { state: "pending" };
			cache.set(key, pending);
			const request: RatesRequest = {
				type: "exile-ledger:rates",
				game,
				league,
			};
			// A reply that outlived a reset() must not overwrite the fresh state.
			const current = () => cache.get(key) === pending;
			const miss = () => {
				if (current())
					cache.set(key, { state: "missing", retryAt: now() + RATES_RETRY_MS });
			};
			browser.runtime
				.sendMessage(request)
				.then((reply: unknown) => {
					const parsed = v.safeParse(RatesSchema, reply);
					if (!parsed.success) {
						miss();
						return;
					}
					if (!current()) return;
					cache.set(key, { state: "ready", rates: parsed.output });
					onArrive();
				})
				.catch(miss);
			return null;
		},
		/** Forget misses, e.g. after the user grants access to poe.ninja. */
		reset: () => cache.clear(),
	};
}
