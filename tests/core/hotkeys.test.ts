import { describe, expect, it } from "vitest";
import {
	assignHotkey,
	bindingFromEvent,
	DEFAULT_HOTKEYS,
	HOTKEY_ACTIONS,
	type Hotkey,
	type HotkeyAction,
	hotkeyId,
	hotkeyLabel,
	matchHotkey,
	parseHotkeys,
	RESERVED_HOTKEYS,
} from "../../src/core/hotkeys";

const key = (
	code: string,
	mods: Partial<Omit<Hotkey, "code">> = {},
): Hotkey => ({
	code,
	ctrl: false,
	alt: false,
	shift: false,
	meta: false,
	...mods,
});

const bound = (action: HotkeyAction): Hotkey => {
	const binding = DEFAULT_HOTKEYS[action];
	if (!binding) throw new Error(`${action} has no default`);
	return binding;
};

const press = (code: string, init: KeyboardEventInit = {}) =>
	new KeyboardEvent("keydown", { code, ...init });

describe("bindingFromEvent", () => {
	it("records the physical key and its modifiers", () => {
		expect(
			bindingFromEvent(press("KeyL", { altKey: true, shiftKey: true })),
		).toEqual(key("KeyL", { alt: true, shift: true }));
	});

	it("waits while only modifiers are held", () => {
		expect(bindingFromEvent(press("ShiftLeft", { shiftKey: true }))).toBe(null);
		expect(bindingFromEvent(press("AltRight", { altKey: true }))).toBe(null);
	});
});

describe("matchHotkey", () => {
	const bindings = DEFAULT_HOTKEYS;

	it("finds the action bound to the pressed combo", () => {
		expect(
			matchHotkey(
				bindings,
				press("KeyL", { altKey: true, shiftKey: true }),
				false,
			),
		).toBe("togglePanel");
	});

	it("needs every modifier to match exactly", () => {
		expect(matchHotkey(bindings, press("KeyL", { altKey: true }), false)).toBe(
			null,
		);
		expect(
			matchHotkey(
				bindings,
				press("KeyL", { altKey: true, shiftKey: true, ctrlKey: true }),
				false,
			),
		).toBe(null);
	});

	it("inside a text field, runs only search-box shortcuts", () => {
		const inField = (code: string) =>
			matchHotkey(
				bindings,
				press(code, { altKey: true, shiftKey: true }),
				true,
			);
		expect(inField("KeyL")).toBe(null);
		expect(inField("KeyN")).toBe("focusMin");
		expect(inField("KeyS")).toBe("focusItemSearch");
	});

	it("never runs a key without Ctrl, Alt or Cmd inside a text field", () => {
		const plain = { ...bindings, focusItemSearch: key("Slash") };
		expect(matchHotkey(plain, press("Slash"), false)).toBe("focusItemSearch");
		expect(matchHotkey(plain, press("Slash"), true)).toBe(null);
	});

	it("skips unbound actions", () => {
		const none = { ...bindings, togglePanel: null };
		expect(
			matchHotkey(none, press("KeyL", { altKey: true, shiftKey: true }), false),
		).toBe(null);
	});
});

describe("assignHotkey", () => {
	it("refuses a combo another action already uses", () => {
		expect(
			assignHotkey(DEFAULT_HOTKEYS, "togglePanel", bound("clearSearch")),
		).toEqual({ ok: false, reason: "taken", by: "clearSearch" });
	});

	it("refuses browser shortcuts", () => {
		expect(
			assignHotkey(DEFAULT_HOTKEYS, "togglePanel", key("KeyT", { ctrl: true })),
		).toEqual({ ok: false, reason: "reserved" });
	});

	it("allows re-recording an action's own combo", () => {
		const result = assignHotkey(
			DEFAULT_HOTKEYS,
			"togglePanel",
			bound("togglePanel"),
		);
		expect(result.ok).toBe(true);
	});

	it("sets the new combo and leaves the others", () => {
		const result = assignHotkey(
			DEFAULT_HOTKEYS,
			"togglePanel",
			key("KeyK", { alt: true, shift: true }),
		);
		expect(result).toEqual({
			ok: true,
			hotkeys: {
				...DEFAULT_HOTKEYS,
				togglePanel: key("KeyK", { alt: true, shift: true }),
			},
		});
	});
});

describe("defaults", () => {
	it("bind every action, each to a different combo", () => {
		const ids = HOTKEY_ACTIONS.map((action) => hotkeyId(bound(action)));
		expect(new Set(ids).size).toBe(HOTKEY_ACTIONS.length);
	});

	it("avoid the browsers' own shortcuts", () => {
		for (const action of HOTKEY_ACTIONS) {
			const binding = DEFAULT_HOTKEYS[action];
			if (binding) expect(RESERVED_HOTKEYS.has(hotkeyId(binding))).toBe(false);
		}
	});
});

describe("parseHotkeys", () => {
	it("keeps valid bindings and defaults the rest one by one", () => {
		expect(
			parseHotkeys({
				togglePanel: key("KeyK", { alt: true }),
				clearSearch: null,
				focusMin: "nonsense",
			}),
		).toEqual({
			...DEFAULT_HOTKEYS,
			togglePanel: key("KeyK", { alt: true }),
			clearSearch: null,
		});
	});

	it("drops two actions sharing a combo back to their defaults", () => {
		const shared = key("KeyK", { alt: true });
		const parsed = parseHotkeys({ togglePanel: shared, clearSearch: shared });
		expect(parsed.togglePanel).toEqual(shared);
		expect(parsed.clearSearch).toEqual(DEFAULT_HOTKEYS.clearSearch);
	});
});

describe("hotkeyLabel", () => {
	it("writes modifiers in a fixed order and the key as printed", () => {
		expect(
			hotkeyLabel(key("KeyL", { alt: true, shift: true, ctrl: true }), false),
		).toBe("Ctrl+Alt+Shift+L");
		expect(hotkeyLabel(key("Digit3", { meta: true }), true)).toBe("⌘3");
		expect(hotkeyLabel(key("KeyL", { alt: true, shift: true }), true)).toBe(
			"⌥⇧L",
		);
		expect(hotkeyLabel(key("Slash"), false)).toBe("/");
	});
});
