import {
	cleanPayload,
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

type Decoded = Parsed<{ source: ImportSource; payload: Payload }>;

function decode(trimmed: string, now: number): Decoded {
	if (trimmed.startsWith(SHARE_PREFIX)) {
		const share = decodeShare(trimmed);
		return share.ok
			? { ok: true, value: { source: "exile-ledger", payload: share.value } }
			: share;
	}
	// Other tools' exports go through the same limits as our own share strings.
	const found = (source: ImportSource, payload: Payload): Decoded => ({
		ok: true,
		value: {
			source,
			payload: cleanPayload(payload.folders, payload.bookmarks),
		},
	});
	const poeTradePlus = parsePoeTradePlus(trimmed, now);
	if (poeTradePlus) return found("poe-trade-plus", poeTradePlus);
	// TFT codes are plain base64 JSON; checked before Better Trading, whose
	// version 1 strings are base64 JSON too but with other fields.
	const tft = parseTft(trimmed, now);
	if (tft) return found("tft", tft);
	const betterTrading = parseBetterTrading(trimmed, now);
	if (betterTrading) return found("better-trading", betterTrading);
	return { ok: false, error: "unknown-format" };
}

/**
 * Recognises any pasted export we can read and says which tool it came from.
 * Never throws: hostile input (deep nesting, huge arrays) gets the same
 * message as any unreadable text instead of leaving the button dead.
 */
export function decodeImport(text: string, now: number): Decoded {
	const trimmed = text.trim();
	try {
		return decode(trimmed, now);
	} catch {
		return {
			ok: false,
			error: trimmed.startsWith(SHARE_PREFIX)
				? "share-damaged"
				: "unknown-format",
		};
	}
}
