import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type PinnedItem, togglePin } from "../../src/core/pins";
import {
	jumpToResult,
	PINNED_ROW_ATTR,
	syncPinButtons,
} from "../../src/trade/pinButtons";

const ROW_ID =
	"0da8321acb388f2b093092e92004e14aca1294cef903a625f5ed35e39ada9e62";
const pin: PinnedItem = {
	id: ROW_ID,
	name: "Viper Wrap",
	baseType: "Hatungo Garb",
	price: null,
	pinnedAt: 1,
};

describe("pin buttons", () => {
	beforeEach(() => {
		document.body.innerHTML = readFileSync(
			join(process.cwd(), "tests/fixtures/trade-dom/poe2-results.html"),
			"utf8",
		);
	});

	it("adds one button per row with actions and reports clicks", () => {
		const onToggle = vi.fn();
		syncPinButtons(document, [], onToggle);
		syncPinButtons(document, [], onToggle);
		const buttons = document.querySelectorAll("[data-exile-ledger-pin]");
		expect(buttons).toHaveLength(1);
		const first = buttons[0];
		if (first instanceof HTMLButtonElement) first.click();
		expect(onToggle).toHaveBeenCalledWith(ROW_ID);
	});

	it("labels pinned rows", () => {
		syncPinButtons(document, [pin], () => {});
		expect(document.querySelector("[data-exile-ledger-pin]")?.textContent).toBe(
			"Unpin",
		);
		expect(
			document
				.querySelector(`[data-id="${ROW_ID}"]`)
				?.hasAttribute(PINNED_ROW_ATTR),
		).toBe(true);
	});

	it("jumps to rows that are still on the page", () => {
		Element.prototype.scrollIntoView = vi.fn();
		expect(jumpToResult(document, ROW_ID)).toBe(true);
		expect(jumpToResult(document, "gone")).toBe(false);
	});
});

describe("togglePin", () => {
	it("pins and unpins", () => {
		const item = {
			id: "x",
			name: "",
			typeLine: "Ring",
			baseType: "Ring",
			ilvl: 1,
			mods: [],
			price: null,
			indexed: null,
			rarity: null,
			text: null,
			corrupted: false,
			affixes: null,
		};
		const pinned = togglePin([], item, 5);
		expect(pinned.map((p) => p.id)).toEqual(["x"]);
		expect(togglePin(pinned, item, 6)).toEqual([]);
	});
});
