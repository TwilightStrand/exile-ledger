import { describe, expect, it } from "vitest";
import { createTitleKeeper } from "../../src/trade/titleKeeper";

describe("createTitleKeeper", () => {
	it("adds our segment, survives the site rewriting the title, and restores it on stop", async () => {
		document.head.innerHTML = "<title>Trade - Path of Exile</title>";
		const keeper = createTitleKeeper(document);
		keeper.set({ segment: "Bow (Standard)", live: true });
		expect(document.title).toBe("⚡ Bow (Standard) - Trade - Path of Exile");

		document.title = "(2) Trade - Path of Exile";
		await new Promise((r) => setTimeout(r, 0));
		expect(document.title).toBe(
			"(2) ⚡ Bow (Standard) - Trade - Path of Exile",
		);

		keeper.stop();
		expect(document.title).toBe("(2) Trade - Path of Exile");
	});
});
