import {
	decodeShare,
	type Parsed,
	type Payload,
	SHARE_PREFIX,
} from "../exchange";
import { parseBetterTrading } from "./betterTrading";
import { parsePoeTradePlus } from "./poeTradePlus";

export type ImportSource = "exile-ledger" | "better-trading" | "poe-trade-plus";

/** Recognises any pasted export we can read and says which tool it came from. */
export function decodeImport(
	text: string,
	now: number,
): Parsed<{ source: ImportSource; payload: Payload }> {
	const trimmed = text.trim();
	if (trimmed.startsWith(SHARE_PREFIX)) {
		const share = decodeShare(trimmed);
		return share.ok
			? { ok: true, value: { source: "exile-ledger", payload: share.value } }
			: share;
	}
	const poeTradePlus = parsePoeTradePlus(trimmed, now);
	if (poeTradePlus)
		return {
			ok: true,
			value: { source: "poe-trade-plus", payload: poeTradePlus },
		};
	const betterTrading = parseBetterTrading(trimmed, now);
	if (betterTrading)
		return {
			ok: true,
			value: { source: "better-trading", payload: betterTrading },
		};
	return { ok: false, error: "unknown-format" };
}
