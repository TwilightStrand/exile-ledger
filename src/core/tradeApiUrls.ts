import type { Game } from "./tradeUrl";

const apiRoot = (game: Game) => (game === "poe2" ? "trade2" : "trade");

/** The search endpoint the trade page itself posts to: `/api/{trade|trade2}/search/[realm/]{league}`. */
export function searchApiUrl(
	origin: string,
	game: Game,
	realm: string | null,
	league: string,
): string {
	const segments = ["api", apiRoot(game), "search"];
	if (realm) segments.push(realm);
	segments.push(league);
	return `${origin}/${segments.map(encodeURIComponent).join("/")}`;
}

/** At most this many ids per fetch call; the API rejects more. */
export const FETCH_BATCH = 10;

/** The fetch endpoint for result ids, tied to the search they came from. */
export function fetchApiUrl(
	origin: string,
	game: Game,
	realm: string | null,
	ids: readonly string[],
	searchId: string,
): string {
	const url = new URL(
		`${origin}/api/${apiRoot(game)}/fetch/${ids.map(encodeURIComponent).join(",")}`,
	);
	url.searchParams.set("query", searchId);
	if (realm) url.searchParams.set("realm", realm);
	return url.toString();
}
