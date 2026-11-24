import type { ModKind } from "../tradeApi";
import type { Game } from "../tradeUrl";

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

const SECTION = "--------";

/** Suffix the game puts after a mod line of each kind in Ctrl+C text. */
const KIND_SUFFIX: Record<ModKind, string> = {
	enchant: " (enchant)",
	implicit: " (implicit)",
	rune: " (rune)",
	fractured: " (fractured)",
	explicit: "",
	crafted: " (crafted)",
};

/** Order the game writes mod sections in, top to bottom. */
const SECTIONS: readonly (readonly ModKind[])[] = [
	["enchant"],
	["rune"],
	["implicit"],
	["fractured", "explicit", "crafted"],
];

/**
 * The item as Ctrl+C text when the API did not send it (PoE2). Built from the
 * parts the trade site's paste-to-search reads: rarity, name, base, item level
 * and mod lines. Properties such as armour values are left out; the site
 * searches by mods, and guessing their exact format would only add noise.
 */
export function buildItemText(item: {
	rarity: string | null;
	name: string;
	typeLine: string;
	ilvl: number | null;
	corrupted: boolean;
	mods: readonly { kind: ModKind; text: string }[];
}): string {
	const header = [
		...(item.rarity ? [`Rarity: ${item.rarity}`] : []),
		...(item.name ? [item.name] : []),
		item.typeLine,
	];
	const sections: string[][] = [header];
	if (item.ilvl !== null) sections.push([`Item Level: ${item.ilvl}`]);
	for (const kinds of SECTIONS) {
		const lines = item.mods
			.filter((mod) => kinds.includes(mod.kind))
			.map((mod) => `${mod.text}${KIND_SUFFIX[mod.kind]}`);
		if (lines.length > 0) sections.push(lines);
	}
	if (item.corrupted) sections.push(["Corrupted"]);
	return sections.map((lines) => lines.join("\n")).join(`\n${SECTION}\n`);
}

/** The wiki page for an item: the unique's own page, otherwise its base type. */
export function wikiUrl(
	game: Game,
	item: { rarity: string | null; name: string; baseType: string },
): string | null {
	const title =
		item.rarity === "Unique" && item.name ? item.name : item.baseType;
	if (!title) return null;
	const host = game === "poe2" ? "www.poe2wiki.net" : "www.poewiki.net";
	return `https://${host}/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}
