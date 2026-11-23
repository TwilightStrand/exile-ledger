import { describe, expect, it, vi } from "vitest";
import { observeResults } from "../../src/trade/observeResults";

describe("observeResults", () => {
	it("calls back once per frame for result changes and ignores other DOM changes", async () => {
		document.body.innerHTML =
			'<div class="resultset"></div><div id="other"></div>';
		const onChange = vi.fn();
		const stop = observeResults(document, onChange);

		document.getElementById("other")?.append(document.createElement("span"));
		await new Promise((r) => setTimeout(r, 50));
		expect(onChange).not.toHaveBeenCalled();

		const list = document.querySelector(".resultset");
		for (let i = 0; i < 5; i++) list?.append(document.createElement("div"));
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
		stop();
	});
});
