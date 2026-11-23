import type { Reserve } from "../ui/Panel";

const STYLE_ID = "exile-ledger-reserve";

/**
 * Push mode: narrows the page by the panel's width so nothing sits under it.
 * A margin on <html> moves the trade site's centred layout as a whole,
 * including its fixed headers, which padding on <body> would not.
 */
export function applyReserve(doc: Document, { side, px }: Reserve): void {
	let style = doc.getElementById(STYLE_ID);
	if (px <= 0) {
		style?.remove();
		return;
	}
	if (!style) {
		style = doc.createElement("style");
		style.id = STYLE_ID;
		doc.head.append(style);
	}
	const prop = side === "left" ? "margin-left" : "margin-right";
	style.textContent = `html { ${prop}: ${px}px; transition: margin 220ms cubic-bezier(0.22, 1, 0.36, 1); }`;
}
