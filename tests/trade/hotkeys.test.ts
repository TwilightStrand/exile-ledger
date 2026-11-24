import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HOTKEYS, type HotkeyAction } from "../../src/core/hotkeys";
import { installHotkeys, TRADE_ACTIONS } from "../../src/trade/hotkeys";

/** The parts of the trade site's search form the shortcuts touch. */
const FORM = `
<div class="search-panel">
  <div class="search-bar">
    <div class="search-left"><input id="item" class="multiselect__input"></div>
    <button class="clear-btn">Clear</button>
    <button class="toggle-search-btn">Show filters</button>
  </div>
  <div class="search-advanced">
    <div class="search-advanced-pane brown">
      <div class="filter-group-body">
        <div class="filter" id="f1">
          <span class="filter-title">+# to maximum Life</span>
          <input class="minmax" id="f1-min"><input class="minmax" id="f1-max">
        </div>
        <div class="filter" id="f2">
          <span class="filter-title">+#% to Fire Resistance</span>
          <input class="minmax" id="f2-min"><input class="minmax" id="f2-max">
        </div>
        <div class="filter"><input id="add" class="multiselect__input"></div>
      </div>
    </div>
  </div>
</div>`;

const byId = (id: string) => {
	const el = document.getElementById(id);
	if (!el) throw new Error(`missing #${id}`);
	return el;
};

let stop = () => {};
afterEach(() => {
	stop();
	document.body.innerHTML = "";
});

function setup() {
	document.body.innerHTML = `${FORM}<div id="panel-host"></div>`;
	const ran: HotkeyAction[] = [];
	stop = installHotkeys(document, {
		hotkeys: () => DEFAULT_HOTKEYS,
		isOurs: (node) => node instanceof Node && byId("panel-host").contains(node),
		run: (action) => ran.push(action),
	});
	return ran;
}

const altShift = (code: string, target: EventTarget = document.body) => {
	const event = new KeyboardEvent("keydown", {
		code,
		altKey: true,
		shiftKey: true,
		bubbles: true,
		cancelable: true,
		composed: true,
	});
	target.dispatchEvent(event);
	return event;
};

describe("installHotkeys", () => {
	it("runs the bound action and keeps the key from the page", () => {
		const ran = setup();
		const event = altShift("KeyL");
		expect(ran).toEqual(["togglePanel"]);
		expect(event.defaultPrevented).toBe(true);
	});

	it("in the site's search boxes runs only search-box shortcuts", () => {
		const ran = setup();
		const item = byId("item");
		altShift("KeyL", item);
		altShift("KeyN", item);
		expect(ran).toEqual(["focusMin"]);
	});

	it("never lets a plain-key shortcut eat typing in the panel's own inputs", () => {
		document.body.innerHTML = `${FORM}<div id="panel-host"></div>`;
		const ran: HotkeyAction[] = [];
		stop = installHotkeys(document, {
			hotkeys: () => ({
				...DEFAULT_HOTKEYS,
				togglePanel: {
					code: "KeyR",
					ctrl: false,
					alt: false,
					shift: false,
					meta: false,
				},
			}),
			isOurs: (node) =>
				node instanceof Node && byId("panel-host").contains(node),
			run: (action) => ran.push(action),
		});
		const own = document.createElement("input");
		byId("panel-host").append(own);
		const event = new KeyboardEvent("keydown", {
			code: "KeyR",
			bubbles: true,
			cancelable: true,
		});
		own.dispatchEvent(event);
		expect(ran).toEqual([]);
		expect(event.defaultPrevented).toBe(false);
	});

	it("treats the extension's own inputs as not the page's", () => {
		const ran = setup();
		const own = document.createElement("input");
		byId("panel-host").append(own);
		altShift("KeyL", own);
		expect(ran).toEqual(["togglePanel"]);
	});

	it("ignores unbound keys and lets them through", () => {
		const ran = setup();
		const event = altShift("KeyZ");
		expect(ran).toEqual([]);
		expect(event.defaultPrevented).toBe(false);
	});

	it("stops listening when removed", () => {
		const ran = setup();
		stop();
		altShift("KeyL");
		expect(ran).toEqual([]);
	});
});

describe("TRADE_ACTIONS", () => {
	it("focuses the item search", () => {
		setup();
		TRADE_ACTIONS.focusItemSearch(document);
		expect(document.activeElement).toBe(byId("item"));
	});

	it("focuses the add-stat box, opening hidden filters first", async () => {
		setup();
		document
			.querySelector(".search-advanced")
			?.classList.add("search-advanced-hidden");
		const toggle = vi.fn();
		document
			.querySelector(".toggle-search-btn")
			?.addEventListener("click", toggle);
		TRADE_ACTIONS.addStatFilter(document);
		expect(toggle).toHaveBeenCalledOnce();
		await new Promise((resolve) => requestAnimationFrame(resolve));
		expect(document.activeElement).toBe(byId("add"));
	});

	it("clears the search and returns to the item box", () => {
		setup();
		const clear = vi.fn();
		document.querySelector(".clear-btn")?.addEventListener("click", clear);
		TRADE_ACTIONS.clearSearch(document);
		expect(clear).toHaveBeenCalledOnce();
		expect(document.activeElement).toBe(byId("item"));
	});

	it("min and max follow the stat filter that has focus", () => {
		setup();
		byId("f1-max").focus();
		TRADE_ACTIONS.focusMin(document);
		expect(document.activeElement).toBe(byId("f1-min"));
	});

	it("min and max go to the last filter when focus is elsewhere", () => {
		setup();
		TRADE_ACTIONS.focusMax(document);
		expect(document.activeElement).toBe(byId("f2-max"));
		byId("item").focus();
		TRADE_ACTIONS.focusMin(document);
		expect(document.activeElement).toBe(byId("f2-min"));
	});
});
