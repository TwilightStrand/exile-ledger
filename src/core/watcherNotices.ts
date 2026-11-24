import { en, type Messages } from "./i18n";
import { searchWatcherHref } from "./openUrl";
import { buildTradeUrl } from "./tradeUrl";
import type { WatcherEvent } from "./watcherRun";
import type { ListingWatcher, Price } from "./watchers";

export interface Notice {
	title: string;
	message: string;
	/** Opened when the notification is clicked. */
	url: string;
}

const priceText = (price: Price | null, t: Messages) =>
	price ? `${price.amount} ${price.currency}` : t.watchers.noPrice;

/** The search a listing was found in, where the site shows the listing again. */
function listingUrl(watcher: ListingWatcher): string {
	return buildTradeUrl(watcher.origin, {
		game: watcher.game,
		type: "search",
		realm: watcher.realm,
		league: watcher.league,
		searchId: watcher.searchId,
		live: false,
	});
}

export function noticeFor(event: WatcherEvent, t: Messages = en): Notice {
	const n = t.notices;
	switch (event.kind) {
		case "gone":
			return {
				title: n.goneTitle(event.watcher.name),
				message: n.goneBody(event.watcher.seller),
				url: listingUrl(event.watcher),
			};
		case "back":
			return {
				title: n.backTitle(event.watcher.name),
				message: priceText(event.watcher.price, t),
				url: listingUrl(event.watcher),
			};
		case "repriced":
			return {
				title: n.repricedTitle(event.watcher.name),
				message: t.watchers.repriced(
					priceText(event.watcher.previousPrice, t),
					priceText(event.watcher.price, t),
				),
				url: listingUrl(event.watcher),
			};
		case "new-results":
			return {
				title: n.newTitle(event.watcher.name),
				message: t.watchers.newResults(event.count),
				url: searchWatcherHref(event.watcher),
			};
	}
}
