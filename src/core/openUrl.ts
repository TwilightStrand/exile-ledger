import type { Bookmark } from "./model";
import {
	buildTradeUrl,
	type ParsedTradeUrl,
	type TradeLocation,
} from "./tradeUrl";

/**
 * Where a bookmark opens from the given page. The stored query goes through
 * `?q=` in the page's league, so bookmarks outlive a league change. Search IDs
 * only work in the league they were made in, so they are used for live
 * searches still in that league and for imports that have no query.
 */
/** The parts of a bookmark or history entry needed to open it. */
export type OpenableSearch = Pick<
	Bookmark,
	"game" | "league" | "query" | "searchId" | "live" | "tradeType"
>;

export function bookmarkHref(
	bookmark: OpenableSearch,
	page: ParsedTradeUrl,
): string {
	const { origin, location } = page;
	// The panel only lists the open game's bookmarks; this covers links built elsewhere.
	const sameGame = location.game === bookmark.game;
	const league = sameGame ? location.league : bookmark.league;
	const target: TradeLocation = {
		game: bookmark.game,
		type: bookmark.tradeType ?? "search",
		realm: sameGame ? location.realm : bookmark.game === "poe2" ? "poe2" : null,
		league,
		searchId: bookmark.searchId ?? null,
		live: bookmark.live,
	};

	const sameLeague = league === bookmark.league;
	if (bookmark.live && bookmark.searchId && sameLeague) {
		return buildTradeUrl(origin, target);
	}
	if (bookmark.query) {
		return buildTradeUrl(origin, target, { query: bookmark.query });
	}
	return buildTradeUrl(origin, {
		...target,
		league: bookmark.league,
		live: false,
	});
}
