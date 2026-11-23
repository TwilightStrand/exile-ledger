import { beforeEach, describe, expect, it } from "vitest";
import { applyReserve } from "../../src/trade/reserve";

const style = () =>
	document.getElementById("exile-ledger-reserve")?.textContent ?? null;

describe("applyReserve", () => {
	beforeEach(() => {
		document.head.innerHTML = "";
	});

	it("narrows the page on the panel's side", () => {
		applyReserve(document, { side: "left", px: 300 });
		expect(style()).toContain("margin-left: 300px");
		applyReserve(document, { side: "right", px: 320 });
		expect(style()).toContain("margin-right: 320px");
		expect(document.querySelectorAll("#exile-ledger-reserve")).toHaveLength(1);
	});

	it("removes the margin when the panel floats or closes", () => {
		applyReserve(document, { side: "left", px: 300 });
		applyReserve(document, { side: "left", px: 0 });
		expect(style()).toBeNull();
	});
});
