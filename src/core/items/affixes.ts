/** One explicit mod line as the fetch API returns it with its rolled mods. */
export interface ModLine {
	mods?: readonly { name: string; tier: string }[];
}

export interface AffixCount {
	prefixes: number;
	suffixes: number;
}

/**
 * Counts prefixes and suffixes from the tier codes on explicit mods ("P7",
 * "S5"). A hybrid mod spans several lines but is one affix, so mods are
 * counted once by name and tier. Crafted mods use the same codes.
 */
export function countAffixes(lines: readonly ModLine[]): AffixCount | null {
	const seen = new Set<string>();
	let prefixes = 0;
	let suffixes = 0;
	for (const line of lines) {
		for (const mod of line.mods ?? []) {
			const key = `${mod.name}|${mod.tier}`;
			if (seen.has(key)) continue;
			seen.add(key);
			if (mod.tier.startsWith("P")) prefixes++;
			else if (mod.tier.startsWith("S")) suffixes++;
		}
	}
	return seen.size === 0 ? null : { prefixes, suffixes };
}
