import { en, type Messages } from "../core/i18n";
import { type RowScope, resultRows } from "./resultRows";
import { SELECTORS } from "./selectors";

export const WATCH_BUTTON_ATTR = "data-exile-ledger-watch";

/** Adds a Watch button to each result row, labelled by whether its listing is watched. */
export function syncWatchButtons(
	scope: RowScope,
	watchedItemIds: ReadonlySet<string>,
	onToggle: (id: string) => void,
	t: Messages = en,
): void {
	for (const row of resultRows(scope)) {
		const id = row.dataset.id;
		const host = row.querySelector(SELECTORS.actions);
		if (!id || !host) continue;
		let button = host.querySelector<HTMLButtonElement>(
			`[${WATCH_BUTTON_ATTR}]`,
		);
		if (!button) {
			button = host.ownerDocument.createElement("button");
			button.type = "button";
			// The site's own button classes, so it matches its neighbours.
			button.className = "btn btn-xs btn-default";
			button.setAttribute(WATCH_BUTTON_ATTR, "");
			// The row is read at click time: the site may reuse a row element for another listing.
			button.addEventListener("click", (event) => {
				const target = event.currentTarget;
				const current =
					target instanceof Element
						? target.closest<HTMLElement>(SELECTORS.resultRow)?.dataset.id
						: undefined;
				if (current) onToggle(current);
			});
			host.append(button);
		}
		if (button.title !== t.trade.watchTitle) button.title = t.trade.watchTitle;
		const watched = watchedItemIds.has(id);
		const label = watched ? t.trade.watching : t.trade.watch;
		// Unchanged text is left alone so the results observer does not wake again.
		if (button.textContent !== label) button.textContent = label;
		if (button.getAttribute("aria-pressed") !== String(watched))
			button.setAttribute("aria-pressed", String(watched));
	}
}
