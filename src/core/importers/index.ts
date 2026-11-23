import {
	decodeShare,
	type Parsed,
	type Payload,
	SHARE_PREFIX,
} from "../exchange";
import { parseBetterTrading } from "./betterTrading";

export type ImportSource = "exile-ledger" | "better-trading";

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
	const betterTrading = parseBetterTrading(trimmed, now);
	if (betterTrading)
		return {
			ok: true,
			value: { source: "better-trading", payload: betterTrading },
		};
	return {
		ok: false,
		message:
			"This is not an Exile Ledger share string or a Better Trading export.",
	};
}
