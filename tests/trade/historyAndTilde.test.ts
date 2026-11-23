import { describe, expect, it, vi } from "vitest";
import {
	BACK_FORWARD_FLAG,
	installHistoryPatch,
} from "../../src/trade/historyPatch";
import { installTildePrefix } from "../../src/trade/tildePrefix";

describe("installHistoryPatch", () => {
	function fakeWin(enabled: boolean) {
		const pushState = vi.fn();
		const replaceState = vi.fn();
		const win = {
			location: {
				href: "https://www.pathofexile.com/trade2/search/poe2/Standard/abc",
			},
			document: {
				documentElement: {
					dataset: { [BACK_FORWARD_FLAG]: enabled ? "on" : "off" },
				},
			},
			history: { pushState, replaceState },
		};
		installHistoryPatch(win);
		return { win, pushState, replaceState };
	}

	it("pushes when the site replaces one search with another", () => {
		const { win, pushState, replaceState } = fakeWin(true);
		win.history.replaceState(null, "", "/trade2/search/poe2/Standard/def");
		expect(pushState).toHaveBeenCalledOnce();
		expect(replaceState).not.toHaveBeenCalled();
	});

	it("leaves other replaces alone, and everything when switched off", () => {
		const on = fakeWin(true);
		on.win.history.replaceState(
			null,
			"",
			"/trade2/search/poe2/Standard/abc/live",
		);
		expect(on.replaceState).toHaveBeenCalledOnce();
		const off = fakeWin(false);
		off.win.history.replaceState(null, "", "/trade2/search/poe2/Standard/def");
		expect(off.pushState).not.toHaveBeenCalled();
	});
});

describe("installTildePrefix", () => {
	function typeFirst(input: HTMLInputElement, char: string) {
		input.value = char;
		input.dispatchEvent(
			new InputEvent("input", {
				data: char,
				inputType: "insertText",
				bubbles: true,
			}),
		);
	}

	it("adds ~ on the first character only, and respects the opt-outs", () => {
		document.body.innerHTML =
			'<input class="multiselect__input"><input class="other">';
		const [search, other] = [...document.querySelectorAll("input")];
		if (!search || !other) throw new Error("fixture");
		const stop = installTildePrefix(document, () => true);

		typeFirst(search, "l");
		expect(search.value).toBe("~l");
		search.value = "life";
		search.dispatchEvent(
			new InputEvent("input", {
				data: "e",
				inputType: "insertText",
				bubbles: true,
			}),
		);
		expect(search.value).toBe("life");
		typeFirst(search, " ");
		expect(search.value).toBe(" ");
		typeFirst(other, "x");
		expect(other.value).toBe("x");
		stop();
	});

	it("does nothing when switched off", () => {
		document.body.innerHTML = '<input class="multiselect__input">';
		const search = document.querySelector("input");
		if (!search) throw new Error("fixture");
		const stop = installTildePrefix(document, () => false);
		typeFirst(search, "l");
		expect(search.value).toBe("l");
		stop();
	});
});
