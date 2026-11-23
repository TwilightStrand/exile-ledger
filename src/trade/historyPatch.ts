import { shouldPushInstead } from "../core/navigation";

/** Set on <html> by the isolated script from the user's setting; read per call. */
export const BACK_FORWARD_FLAG = "exileLedgerBackForward";

interface HistoryTarget {
	location: { href: string };
	document: { documentElement: { dataset: DOMStringMap } };
	history: Pick<History, "pushState" | "replaceState">;
}

/** Runs in the page's world, where the site's router calls history.replaceState. */
export function installHistoryPatch(win: HistoryTarget): void {
	const replace = win.history.replaceState.bind(win.history);
	const push = win.history.pushState.bind(win.history);
	win.history.replaceState = (
		data: unknown,
		unused: string,
		url?: string | URL | null,
	) => {
		const enabled =
			win.document.documentElement.dataset[BACK_FORWARD_FLAG] === "on";
		if (
			enabled &&
			url != null &&
			shouldPushInstead(win.location.href, String(url))
		) {
			push(data, unused, url);
			return;
		}
		replace(data, unused, url);
	};
}
