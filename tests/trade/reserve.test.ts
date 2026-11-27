import { beforeEach, describe, expect, it } from "vitest";
import { applyReserve, createReserver } from "../../src/trade/reserve";

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
			resizing: false,
		});
		expect(style()).toContain("margin-left: clamp(260px, 20vw, 640px)");
		applyReserve(document, { side: "right", width: "300px", resizing: false });
		expect(style()).toContain("margin-right: 300px");
		expect(document.querySelectorAll("#exile-ledger-reserve")).toHaveLength(1);
	});

	it("removes the margin when the panel floats or closes", () => {
		applyReserve(document, { side: "left", width: "300px", resizing: false });
		applyReserve(document, { side: "left", width: null, resizing: false });
		expect(style()).toBeNull();
	});
});

describe("createReserver", () => {
	beforeEach(() => {
		document.head.innerHTML = "";
	});

	it("follows a resize once a frame without easing, then settles with it", async () => {
		const reserver = createReserver(document);
		const writes: string[] = [];
		const observer = new MutationObserver(() => writes.push(style() ?? ""));
		observer.observe(document.head, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		for (let px = 300; px < 340; px++) {
			reserver.apply({ side: "left", width: `${px}px`, resizing: true });
		}
		expect(style()).toBeNull();
		await new Promise((r) => setTimeout(r, 40));
		expect(style()).toBe("html { margin-left: 339px; }");
		reserver.apply({ side: "left", width: "339px", resizing: false });
		expect(style()).toContain("transition: margin 220ms");
		await new Promise((r) => setTimeout(r, 0));
		observer.disconnect();
		expect(writes.length).toBeLessThanOrEqual(3);
	});
});
