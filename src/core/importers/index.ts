import {
	decodeShare,
	type Parsed,
	type Payload,
	SHARE_PREFIX,
} from "../exchange";
import { parseBetterTrading } from "./betterTrading";
import { parsePoeTradePlus } from "./poeTradePlus";
import { parseTft } from "./tft";

export type ImportSource =
	| "exile-ledger"
	| "better-trading"
	| "poe-trade-plus"
	| "tft";

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
	// TFT codes are plain base64 JSON; checked before Better Trading, whose
	// version 1 strings are base64 JSON too but with other fields.
	const tft = parseTft(trimmed, now);
	if (tft) return { ok: true, value: { source: "tft", payload: tft } };
	const betterTrading = parseBetterTrading(trimmed, now);
	if (betterTrading)
		return {
			ok: true,
			value: { source: "better-trading", payload: betterTrading },
		};
	return { ok: false, error: "unknown-format" };
}
