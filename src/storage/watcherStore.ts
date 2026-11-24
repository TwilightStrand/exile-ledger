import { TRADE_ACCESS_KEY } from "../core/messages";
import { parseWatchers } from "../core/watchers";
import { localSource } from "./localSource";

// Local only: watcher state changes on every check and is tied to this
// machine's session with the trade site.
export const browserWatchers = localSource("local:watchers", parseWatchers);

/** Written by the background (see TRADE_ACCESS_KEY); anything but true reads as no access. */
export const browserTradeAccess = localSource(
	`local:${TRADE_ACCESS_KEY}`,
	(raw) => raw === true,
);
