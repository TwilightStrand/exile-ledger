import type { Reserve } from "../ui/Panel";

const STYLE_ID = "exile-ledger-reserve";
const EASE = "transition: margin 220ms cubic-bezier(0.22, 1, 0.36, 1);";

/**
 * Push mode: narrows the page by the panel's width so nothing sits under it.
 * A margin on <html> moves the trade site's centred layout as a whole,
 * including its fixed headers, which padding on <body> would not.
 */
export function applyReserve(
	doc: Document,
	{ side, width, resizing }: Reserve,
): void {
	let style = doc.getElementById(STYLE_ID);
	if (width === null) {
		style?.remove();
		return;
	}
	if (!style) {
		style = doc.createElement("style");
		style.id = STYLE_ID;
		doc.head.append(style);
	}
	const prop = side === "left" ? "margin-left" : "margin-right";
	// While the edge is dragged the page follows it directly; easing each step
	// would lag behind the pointer and restart the transition every move.
	style.textContent = `html { ${prop}: ${width};${resizing ? "" : ` ${EASE}`} }`;
}

/**
 * applyReserve for a live panel: during a resize the page is re-laid out at
 * most once a frame, however often the pointer moves; anything else applies
 * at once.
 */
export function createReserver(doc: Document) {
	let frame = 0;
	let latest: Reserve | null = null;
	return {
		apply(reserve: Reserve) {
			if (!reserve.resizing) {
				cancelAnimationFrame(frame);
				frame = 0;
				applyReserve(doc, reserve);
				return;
			}
			latest = reserve;
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				if (latest) applyReserve(doc, latest);
			});
		},
		stop() {
			cancelAnimationFrame(frame);
			frame = 0;
		},
	};
}
