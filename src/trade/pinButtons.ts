import { en, type Messages } from "../core/i18n";
import type { PinnedItem } from "../core/pins";
import { type RowScope, resultRows } from "./resultRows";
import { SELECTORS } from "./selectors";

export const PIN_BUTTON_ATTR = "data-exile-ledger-pin";
export const PINNED_ROW_ATTR = "data-exile-ledger-pinned";
export const FLASH_ATTR = "data-exile-ledger-flash";

/** Adds a Pin button to each result row and keeps its label and the row mark in step with the pins. */
export function syncPinButtons(
	scope: RowScope,
	pins: readonly PinnedItem[],
	onToggle: (id: string) => void,
	t: Messages = en,
): void {
	const pinned = new Set(pins.map((p) => p.id));
	for (const row of resultRows(scope)) {
		const id = row.dataset.id;
		const host = row.querySelector(SELECTORS.actions);
		if (!id || !host) continue;
		let button = host.querySelector<HTMLButtonElement>(`[${PIN_BUTTON_ATTR}]`);
		if (!button) {
			button = host.ownerDocument.createElement("button");
			button.type = "button";
			// The site's own button classes, so the pin matches its neighbours.
			button.className = "btn btn-xs btn-default";
			button.setAttribute(PIN_BUTTON_ATTR, "");
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
		const isPinned = pinned.has(id);
		const label = isPinned ? t.trade.unpin : t.trade.pin;
		// Rewriting unchanged text is still a DOM mutation, which would wake the
		// results observer and re-run this every frame.
		if (button.textContent !== label) button.textContent = label;
		button.setAttribute("aria-pressed", String(isPinned));
		row.toggleAttribute(PINNED_ROW_ATTR, isPinned);
	}
}

/** Scrolls to a result and flashes it; false when the row is no longer on the page. */
export function jumpToResult(doc: Document, id: string): boolean {
	const row = [...doc.querySelectorAll<HTMLElement>(SELECTORS.resultRow)].find(
		(r) => r.dataset.id === id,
	);
	if (!row) return false;
	row.scrollIntoView({ block: "center", behavior: "smooth" });
	row.setAttribute(FLASH_ATTR, "");
	setTimeout(() => row.removeAttribute(FLASH_ATTR), 1600);
	return true;
}
