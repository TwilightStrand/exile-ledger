import {
	type HotkeyAction,
	type Hotkeys,
	type KeyContext,
	matchHotkey,
} from "../core/hotkeys";
import { SELECTORS } from "./selectors";

function isTextField(node: EventTarget | undefined): boolean {
	if (!(node instanceof HTMLElement)) return false;
	if (node.isContentEditable || node instanceof HTMLTextAreaElement)
		return true;
	if (node instanceof HTMLSelectElement) return true;
	return (
		node instanceof HTMLInputElement &&
		!["checkbox", "radio", "button", "submit", "reset", "range"].includes(
			node.type,
		)
	);
}

/**
 * Opens the filter pane when the user has collapsed it, then runs `then`. The
 * site shows the pane on its next render, and a hidden input cannot take
 * focus, so after opening it waits a frame.
 */
function withFilters(doc: Document, then: () => void): void {
	if (!doc.querySelector(SELECTORS.filtersHidden)) {
		then();
		return;
	}
	doc.querySelector<HTMLElement>(SELECTORS.toggleFilters)?.click();
	(doc.defaultView ?? window).requestAnimationFrame(then);
}

function focusItemSearch(doc: Document): void {
	doc.querySelector<HTMLInputElement>(SELECTORS.itemSearch)?.focus();
}

/**
 * The min or max box of the stat filter that has focus, or of the last stat
 * filter when focus is elsewhere: that is the one just added.
 */
function focusMinMax(doc: Document, which: 0 | 1): void {
	const pane = doc.querySelector(SELECTORS.statPane);
	if (!pane) return;
	const active = doc.activeElement;
	const current =
		active && pane.contains(active)
			? active.closest(SELECTORS.statFilter)
			: null;
	const own = current
		? [...current.querySelectorAll<HTMLInputElement>(SELECTORS.minMax)]
		: [];
	// A focused filter without min and max (an option filter) falls back to the last one.
	const boxes =
		own.length > 0
			? own
			: [...pane.querySelectorAll<HTMLInputElement>(SELECTORS.minMax)].slice(
					-2,
				);
	boxes[which]?.focus();
}

export const TRADE_ACTIONS: Record<
	Exclude<HotkeyAction, "togglePanel">,
	(doc: Document) => void
> = {
	focusItemSearch,
	addStatFilter: (doc) =>
		withFilters(doc, () =>
			doc.querySelector<HTMLInputElement>(SELECTORS.addStatFilter)?.focus(),
		),
	clearSearch(doc) {
		doc.querySelector<HTMLElement>(SELECTORS.clearButton)?.click();
		focusItemSearch(doc);
	},
	focusMin: (doc) => withFilters(doc, () => focusMinMax(doc, 0)),
	focusMax: (doc) => withFilters(doc, () => focusMinMax(doc, 1)),
};

/**
 * Listens for the user's shortcuts on the trade page. `isOurs` says whether a
 * node belongs to the extension's own panel, whose text fields allow every
 * modified shortcut while the site's allow only the search-box ones.
 */
export function installHotkeys(
	doc: Document,
	options: {
		hotkeys: () => Hotkeys;
		isOurs: (node: EventTarget) => boolean;
		run: (action: HotkeyAction) => void;
	},
): () => void {
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.defaultPrevented || event.repeat || event.isComposing) return;
		// Inside a shadow root the event's target is the host; the path's first
		// entry is the element that actually has focus.
		const origin = event.composedPath()[0] ?? event.target ?? undefined;
		const context: KeyContext =
			origin === undefined || !isTextField(origin)
				? "none"
				: options.isOurs(origin)
					? "own-field"
					: "page-field";
		const action = matchHotkey(options.hotkeys(), event, context);
		if (!action) return;
		event.preventDefault();
		event.stopPropagation();
		options.run(action);
	};
	doc.addEventListener("keydown", onKeyDown, true);
	return () => doc.removeEventListener("keydown", onKeyDown, true);
}
