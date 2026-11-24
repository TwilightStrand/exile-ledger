import * as v from "valibot";
import { type AffixCount, countAffixes } from "./items/affixes";
import { itemTextFromBase64 } from "./items/itemText";
import { type TradeQuery, TradeQuerySchema } from "./query";
import { isTradeHost } from "./sites";
import { decodePath, type Game, REALMS } from "./tradeUrl";

export type { Game };

export type ApiCall =
	| { kind: "search"; game: Game; realm: string | null; league: string }
	| { kind: "fetch"; game: Game; queryId: string; ids: string[] };

/** Recognizes the two trade API calls the page makes for a search. */
export function classifyApiUrl(url: URL): ApiCall | null {
	if (url.protocol !== "https:" || !isTradeHost(url.hostname)) return null;
	const parts = decodePath(url.pathname);
	if (parts?.[0] !== "api") return null;

	const game: Game | null =
		parts[1] === "trade" ? "poe1" : parts[1] === "trade2" ? "poe2" : null;
	if (!game) return null;

	if (parts[2] === "search") {
		let rest = parts.slice(3);
		let realm: string | null = null;
		if (rest[0] && REALMS.has(rest[0])) {
			realm = rest[0];
			rest = rest.slice(1);
		}
		const [league] = rest;
		if (!league || rest.length !== 1) return null;
		return { kind: "search", game, realm, league };
	}

	if (parts[2] === "fetch") {
		const ids = parts[3]?.split(",").filter(Boolean) ?? [];
		const queryId = url.searchParams.get("query");
		if (ids.length === 0 || !queryId) return null;
		return { kind: "fetch", game, queryId, ids };
	}

	return null;
}

const SearchResponseSchema = v.looseObject({
	id: v.string(),
	result: v.array(v.string()),
	total: v.number(),
});

export interface SearchCapture {
	query: TradeQuery;
	searchId: string;
	total: number;
	resultIds: string[];
}

export function parseSearch(
	request: unknown,
	response: unknown,
): SearchCapture | null {
	const query = v.safeParse(TradeQuerySchema, request);
	const result = v.safeParse(SearchResponseSchema, response);
	if (!query.success || !result.success) return null;
	return {
		query: query.output,
		searchId: result.output.id,
		total: result.output.total,
		resultIds: result.output.result,
	};
}

const MOD_KINDS = [
	"enchant",
	"implicit",
	"fractured",
	"explicit",
	"crafted",
	"rune",
] as const;
export type ModKind = (typeof MOD_KINDS)[number];

const ModLine = v.union([
	v.string(),
	v.looseObject({
		description: v.string(),
		hash: v.optional(v.string()),
		// The rolled mods behind the line, with tier codes such as "P7" or "S5".
		mods: v.optional(
			// Implicits can arrive with magnitudes only, no name or tier.
			v.array(
				v.looseObject({
					name: v.optional(v.string()),
					tier: v.optional(v.string()),
				}),
			),
		),
	}),
]);
const ModLines = v.nullish(v.array(ModLine));
const HashEntry = v.tuple([v.string(), v.nullish(v.array(v.number()))]);

const ItemSchema = v.looseObject({
	name: v.optional(v.string()),
	typeLine: v.optional(v.string()),
	baseType: v.optional(v.string()),
	ilvl: v.optional(v.number()),
	frameType: v.optional(v.number()),
	corrupted: v.optional(v.boolean()),
	enchantMods: ModLines,
	implicitMods: ModLines,
	fracturedMods: ModLines,
	explicitMods: ModLines,
	craftedMods: ModLines,
	runeMods: ModLines,
	extended: v.optional(
		v.looseObject({
			hashes: v.optional(v.record(v.string(), v.array(HashEntry))),
			// PoE1 only: the in-game Ctrl+C text, base64 encoded.
			text: v.optional(v.string()),
		}),
	),
});

const ResultEntrySchema = v.looseObject({
	id: v.string(),
	listing: v.looseObject({
		indexed: v.optional(v.string()),
		account: v.optional(v.looseObject({ name: v.optional(v.string()) })),
		price: v.optional(
			v.looseObject({ amount: v.number(), currency: v.string() }),
		),
	}),
	item: ItemSchema,
});

const FetchResponseSchema = v.looseObject({
	result: v.array(v.nullable(ResultEntrySchema)),
});

export interface ResultMod {
	kind: ModKind;
	text: string;
	statIds: string[];
}

export interface ResultItem {
	id: string;
	name: string;
	typeLine: string;
	baseType: string;
	ilvl: number | null;
	mods: ResultMod[];
	price: { amount: number; currency: string } | null;
	indexed: string | null;
	/** "Unique" etc., from frameType; null for currency, gems and anything else. */
	rarity: Rarity | null;
	/** PoE1's in-game item text, decoded; PoE2 responses do not carry it. */
	text: string | null;
	corrupted: boolean;
	/** The seller's account name. */
	seller: string | null;
	/** From the tier codes on rolled mods; null when the API sent none. */
	affixes: AffixCount | null;
}

export type Rarity = "Normal" | "Magic" | "Rare" | "Unique";
const RARITIES: readonly Rarity[] = ["Normal", "Magic", "Rare", "Unique"];

type Item = v.InferOutput<typeof ItemSchema>;
type ModLineData = v.InferOutput<typeof ModLine>;

function linesFor(item: Item, kind: ModKind): ModLineData[] {
	switch (kind) {
		case "enchant":
			return item.enchantMods ?? [];
		case "implicit":
			return item.implicitMods ?? [];
		case "fractured":
			return item.fracturedMods ?? [];
		case "explicit":
			return item.explicitMods ?? [];
		case "crafted":
			return item.craftedMods ?? [];
		case "rune":
			return item.runeMods ?? [];
	}
}

/** PoE2 marks keywords as `[Tag]` or `[Tag|Shown text]`; the player sees only the shown text. */
export function stripMarkup(text: string): string {
	return text.replace(/\[(?:[^\]|]*\|)?([^\]]*)\]/g, "$1");
}

/** Kinds whose mods take an affix slot; implicits, enchants and runes do not. */
const AFFIX_KINDS: readonly ModKind[] = ["fractured", "explicit", "crafted"];

function modsOf(item: Item): ResultMod[] {
	const hashes = item.extended?.hashes ?? {};
	return MOD_KINDS.flatMap((kind) =>
		linesFor(item, kind).map((line, index) => {
			// `hashes[kind]` lists one [statId, affixIndices] per line, in line order.
			const positional = hashes[kind]?.[index]?.[0];
			const own =
				typeof line === "string"
					? undefined
					: line.hash?.replace(/^stat\./, "");
			const statId = own ?? positional;
			return {
				kind,
				text: stripMarkup(typeof line === "string" ? line : line.description),
				statIds: statId ? [statId] : [],
			};
		}),
	);
}

export function parseFetchResponse(response: unknown): ResultItem[] | null {
	const parsed = v.safeParse(FetchResponseSchema, response);
	if (!parsed.success) return null;
	return parsed.output.result
		.filter((entry) => entry !== null)
		.map((entry) => ({
			id: entry.id,
			name: entry.item.name ?? "",
			typeLine: entry.item.typeLine ?? "",
			baseType: entry.item.baseType ?? entry.item.typeLine ?? "",
			ilvl: entry.item.ilvl ?? null,
			mods: modsOf(entry.item),
			price: entry.listing.price
				? {
						amount: entry.listing.price.amount,
						currency: entry.listing.price.currency,
					}
				: null,
			indexed: entry.listing.indexed ?? null,
			rarity: RARITIES[entry.item.frameType ?? -1] ?? null,
			text: entry.item.extended?.text
				? itemTextFromBase64(entry.item.extended.text)
				: null,
			corrupted: entry.item.corrupted ?? false,
			seller: entry.listing.account?.name ?? null,
			affixes: countAffixes(
				AFFIX_KINDS.flatMap((kind) =>
					linesFor(entry.item, kind).flatMap((line) =>
						typeof line === "string"
							? []
							: [
									{
										mods: (line.mods ?? []).flatMap(({ name, tier }) =>
											name && tier ? [{ name, tier }] : [],
										),
									},
								],
					),
				),
			),
		}));
}
