import * as v from "valibot";
import { browser } from "wxt/browser";
import type { RatesRequest } from "../core/messages";
import { type Rates, RatesSchema } from "../core/pricing";
import type { Game } from "../core/tradeUrl";

/**
 * Asks the background for rates once per game and league, and calls back when
 * they arrive so the page can be annotated. Lookups are synchronous so the
 * enhance pass never waits on the network.
 */
export function createRatesClient(onArrive: () => void) {
	const cache = new Map<string, Rates | null>();
	return {
		get(game: Game, league: string): Rates | null {
			const key = `${game}:${league}`;
			if (!cache.has(key)) {
				cache.set(key, null);
				const request: RatesRequest = {
					type: "exile-ledger:rates",
					game,
					league,
				};
				browser.runtime
					.sendMessage(request)
					.then((reply: unknown) => {
						const parsed = v.safeParse(RatesSchema, reply);
						// No rates yet (no access, poe.ninja down): ask again on a later pass.
						if (!parsed.success) {
							cache.delete(key);
							return;
						}
						cache.set(key, parsed.output);
						onArrive();
					})
					.catch(() => cache.delete(key));
			}
			return cache.get(key) ?? null;
		},
		/** Forget misses, e.g. after the user grants access to poe.ninja. */
		reset: () => cache.clear(),
	};
}
