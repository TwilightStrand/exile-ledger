/**
 * The item as the game's Ctrl+C text. PoE1 fetch responses carry exactly that,
 * base64 encoded, in extended.text, so it is decoded rather than rebuilt and
 * pastes into the trade site and tools like Path of Building as-is.
 */
export function itemTextFromBase64(encoded: string): string | null {
	try {
		const binary = atob(encoded);
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

/** "Item Class: Body Armours" from the first line of the game text. */
export function itemClassOf(text: string): string | null {
	const match = /^Item Class: (.+?)\r?$/m.exec(text);
	return match?.[1] ?? null;
}
