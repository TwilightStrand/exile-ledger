import { SELECTORS } from "./selectors";

/** The trade site's search boxes (item name and stat filters) are vue-multiselect inputs. */
const SEARCH_INPUT = "input.multiselect__input";

/**
 * Prefixes "~" (the site's fuzzy match) when the first character goes into an
 * empty search box. Only on that first keystroke, so deleting the "~" sticks;
 * starting with a space opts out. Runs in capture phase so the site's own
 * input handler already sees the prefixed value. `enabled` is asked per box:
 * the item search and the stat filter pickers have separate settings.
 */
export function installTildePrefix(
	doc: Document,
	enabled: (box: "item" | "filter") => boolean,
): () => void {
	const onInput = (event: Event) => {
		const input = event.target;
		if (!(input instanceof HTMLInputElement) || !input.matches(SEARCH_INPUT))
			return;
		if (!enabled(input.matches(SELECTORS.itemSearch) ? "item" : "filter"))
			return;
		if (!(event instanceof InputEvent) || !event.inputType.startsWith("insert"))
			return;
		const value = input.value;
		const inserted = event.data ?? "";
		if (
			value.length === 0 ||
			value !== inserted ||
			value.startsWith("~") ||
			value.startsWith(" ")
		)
			return;
		input.value = `~${value}`;
		input.setSelectionRange(input.value.length, input.value.length);
	};
	doc.addEventListener("input", onInput, true);
	return () => doc.removeEventListener("input", onInput, true);
}
