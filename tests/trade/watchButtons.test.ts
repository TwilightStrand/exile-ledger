import { afterEach, describe, expect, it } from "vitest";
import {
	syncWatchButtons,
	WATCH_BUTTON_ATTR,
} from "../../src/trade/watchButtons";

const ROWS = ["a", "b"]
	.map(
		(id) =>
			`<div class="row" data-id="${id}"><div class="details"><div class="btns"></div></div></div>`,
	)
	.join("");

afterEach(() => {
	document.body.innerHTML = "";
});

const buttons = () => [
	...document.querySelectorAll<HTMLButtonElement>(`[${WATCH_BUTTON_ATTR}]`),
];

describe("syncWatchButtons", () => {
	it("adds one button per row, labelled by watch state", () => {
		document.body.innerHTML = `<div class="resultset">${ROWS}</div>`;
		const toggled: string[] = [];
		syncWatchButtons(document, new Set(["b"]), (id) => toggled.push(id));
		syncWatchButtons(document, new Set(["b"]), (id) => toggled.push(id));
		expect(buttons().map((b) => b.textContent)).toEqual(["Watch", "Watching"]);
		expect(buttons()[1]?.getAttribute("aria-pressed")).toBe("true");
		buttons()[0]?.click();
		expect(toggled).toEqual(["a"]);
	});
});
