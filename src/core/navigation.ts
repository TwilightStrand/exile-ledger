import { parseTradeUrl } from "./tradeUrl";

/**
 * True when the site is about to replace one search's history entry with a
 * different search; turning that into a push makes Back return to the
 * previous search instead of leaving the trade site.
 */
export function shouldPushInstead(from: string, to: string): boolean {
	let a: ReturnType<typeof parseTradeUrl>;
	let b: ReturnType<typeof parseTradeUrl>;
	try {
		a = parseTradeUrl(new URL(from));
		b = parseTradeUrl(new URL(to, from));
	} catch {
		return false;
	}
	if (!a || !b?.location.searchId) return false;
	return a.location.searchId !== b.location.searchId;
}
