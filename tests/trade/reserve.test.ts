import { beforeEach, describe, expect, it } from "vitest";
import { applyReserve } from "../../src/trade/reserve";

const style = () =>
	document.getElementById("exile-ledger-reserve")?.textContent ?? null;

describe("applyReserve", () => {
	beforeEach(() => {
		document.head.innerHTML = "";
	});

	it("narrows the page on the panel's side", () => {
		applyReserve(document, {
			side: "left",
			width: "clamp(260px, 20vw, 640px)",
		});
		expect(style()).toContain("margin-left: clamp(260px, 20vw, 640px)");
		applyReserve(document, { side: "right", width: "300px" });
		expect(style()).toContain("margin-right: 300px");
		expect(document.querySelectorAll("#exile-ledger-reserve")).toHaveLength(1);
	});

	it("removes the margin when the panel floats or closes", () => {
		applyReserve(document, { side: "left", width: "300px" });
		applyReserve(document, { side: "left", width: null });
		expect(style()).toBeNull();
	});
});
