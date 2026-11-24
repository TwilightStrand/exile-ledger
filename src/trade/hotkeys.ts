import { type HotkeyAction, type Hotkeys, matchHotkey } from "../core/hotkeys";
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

/** Opens the filter pane when the user has collapsed it, so its inputs can take focus. */
function showFilters(doc: Document): void {
	if (doc.querySelector(SELECTORS.filtersHidden))
		doc.querySelector<HTMLElement>(SELECTORS.toggleFilters)?.click();
}

function focusItemSearch(doc: Document): void {
	doc.querySelector<HTMLInputElement>(SELECTORS.itemSearch)?.focus();
}

/**
 * The min or max box of the stat filter that has focus, or of the last stat
 * filter when focus is elsewhere: that is the one just added.
 */
function focusMinMax(doc: Document, which: 0 | 1): void {
	showFilters(doc);
	const pane = doc.querySelector(SELECTORS.statPane);
	if (!pane) return;
	const active = doc.activeElement;
	const current =
		active && pane.contains(active)
			? active.closest(SELECTORS.statFilter)
			: null;
	const boxes = current
		? [...current.querySelectorAll<HTMLInputElement>(SELECTORS.minMax)]
		: [...pane.querySelectorAll<HTMLInputElement>(SELECTORS.minMax)].slice(-2);
	boxes[which]?.focus();
}

export const TRADE_ACTIONS: Record<
	Exclude<HotkeyAction, "togglePanel">,
	(doc: Document) => void
> = {
	focusItemSearch,
	addStatFilter(doc) {
		showFilters(doc);
		doc.querySelector<HTMLInputElement>(SELECTORS.addStatFilter)?.focus();
	},
	clearSearch(doc) {
		doc.querySelector<HTMLElement>(SELECTORS.clearButton)?.click();
		focusItemSearch(doc);
	},
	focusMin: (doc) => focusMinMax(doc, 0),
	focusMax: (doc) => focusMinMax(doc, 1),
};

/**
 * Listens for the user's shortcuts on the trade page. `isOurs` says whether a
 * node belongs to the extension's own panel, whose inputs do not count as the
 * page's text fields.
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
		const inTextField =
			origin !== undefined && !options.isOurs(origin) && isTextField(origin);
		const action = matchHotkey(options.hotkeys(), event, inTextField);
		if (!action) return;
		event.preventDefault();
		event.stopPropagation();
		options.run(action);
	};
	doc.addEventListener("keydown", onKeyDown, true);
	return () => doc.removeEventListener("keydown", onKeyDown, true);
}
