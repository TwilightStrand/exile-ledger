import * as v from "valibot";
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

const ModLines = v.optional(v.array(v.string()));
const HashEntry = v.tuple([v.string(), v.nullish(v.array(v.number()))]);

const ItemSchema = v.looseObject({
	name: v.optional(v.string()),
	typeLine: v.optional(v.string()),
	baseType: v.optional(v.string()),
	ilvl: v.optional(v.number()),
	enchantMods: ModLines,
	implicitMods: ModLines,
	fracturedMods: ModLines,
	explicitMods: ModLines,
	craftedMods: ModLines,
	runeMods: ModLines,
	extended: v.optional(
		v.looseObject({
			hashes: v.optional(v.record(v.string(), v.array(HashEntry))),
		}),
	),
});

const ResultEntrySchema = v.looseObject({
	id: v.string(),
	listing: v.looseObject({
		indexed: v.optional(v.string()),
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
}

type Item = v.InferOutput<typeof ItemSchema>;

function linesFor(item: Item, kind: ModKind): string[] {
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

function modsOf(item: Item): ResultMod[] {
	const hashes = item.extended?.hashes ?? {};
	return MOD_KINDS.flatMap((kind) =>
		linesFor(item, kind).map((text, index) => ({
			kind,
			text,
			statIds: (hashes[kind] ?? [])
				.filter(([, lines]) => lines?.includes(index))
				.map(([statId]) => statId),
		})),
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
		}));
}
