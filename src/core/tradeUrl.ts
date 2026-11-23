import { isTradeHost } from "./sites";

export type Game = "poe1" | "poe2";
export type TradeType = "search" | "exchange";

export interface TradeLocation {
	game: Game;
	type: TradeType;
	/** `null` is the PoE1 PC realm, which has no path segment. */
	realm: string | null;
	league: string;
	searchId: string | null;
	live: boolean;
}

export interface ParsedTradeUrl {
	origin: string;
	location: TradeLocation;
}

const GAME_PATHS: Record<Game, string> = { poe1: "trade", poe2: "trade2" };
export const REALMS = new Set(["xbox", "sony", "poe2"]);

function gameFromPath(segment: string | undefined): Game | null {
	if (segment === "trade") return "poe1";
	if (segment === "trade2") return "poe2";
	return null;
}

function tradeTypeFrom(segment: string | undefined): TradeType | null {
	return segment === "search" || segment === "exchange" ? segment : null;
}

export function decodePath(pathname: string): string[] | null {
	try {
		return pathname.split("/").filter(Boolean).map(decodeURIComponent);
	} catch {
		return null;
	}
}

/**
 * Trade URLs look like `/{trade|trade2}/{search|exchange}/[realm/]{league}[/{searchId}[/live]]`.
 * PoE1 PC has no realm segment; PoE2 PC uses `poe2`; consoles use `xbox` or `sony`.
 */
export function parseTradeUrl(url: URL): ParsedTradeUrl | null {
	if (url.protocol !== "https:" || !isTradeHost(url.hostname)) return null;

	const parts = decodePath(url.pathname);
	if (!parts) return null;
	const game = gameFromPath(parts[0]);
	const type = tradeTypeFrom(parts[1]);
	if (!game || !type) return null;

	let rest = parts.slice(2);
	let realm: string | null = null;
	if (rest[0] && REALMS.has(rest[0])) {
		realm = rest[0];
		rest = rest.slice(1);
	}

	const [league, searchId, live] = rest;
	if (!league) return null;

	return {
		origin: url.origin,
		location: {
			game,
			type,
			realm,
			league,
			searchId: searchId ?? null,
			live: live === "live",
		},
	};
}

export interface BuildOptions {
	/** A trade query to open via `?q=`; replaces the search ID, which is league-bound. */
	query?: unknown;
}

export function buildTradeUrl(
	origin: string,
	location: TradeLocation,
	options: BuildOptions = {},
): string {
	const segments = [GAME_PATHS[location.game], location.type];
	if (location.realm) segments.push(location.realm);
	segments.push(location.league);

	const withQuery = options.query !== undefined;
	if (!withQuery && location.searchId) {
		segments.push(location.searchId);
		if (location.live) segments.push("live");
	}

	const url = new URL(`/${segments.map(encodeURIComponent).join("/")}`, origin);
	if (withQuery) url.searchParams.set("q", JSON.stringify(options.query));
	return url.toString();
}
