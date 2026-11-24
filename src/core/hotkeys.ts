import * as v from "valibot";

export type HotkeyAction =
	| "togglePanel"
	| "focusItemSearch"
	| "addStatFilter"
	| "clearSearch"
	| "focusMin"
	| "focusMax";

export const HOTKEY_ACTIONS: readonly HotkeyAction[] = [
	"togglePanel",
	"focusItemSearch",
	"addStatFilter",
	"clearSearch",
	"focusMin",
	"focusMax",
];

/**
 * Actions that also run while a text field has focus. They are about moving
 * between the site's search boxes, so they are pressed from one; toggling the
 * panel is not, and stays out of the way of typing.
 */
const IN_FIELDS: ReadonlySet<HotkeyAction> = new Set([
	"focusItemSearch",
	"addStatFilter",
	"clearSearch",
	"focusMin",
	"focusMax",
]);

/**
 * `code` is the physical key. `key` would be the character it types, and with
 * Alt held on a Mac that is a symbol (Alt+Shift+L gives "Ò"), so a binding
 * recorded there would never match.
 */
export interface Hotkey {
	code: string;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	meta: boolean;
}

export type Hotkeys = Record<HotkeyAction, Hotkey | null>;

const ALT_SHIFT = { ctrl: false, alt: true, shift: true, meta: false };

/**
 * Alt+Shift with a letter: no browser menu or tab shortcut on Windows, macOS
 * or Linux uses the letters below (see RESERVED_HOTKEYS), and on a Mac it types
 * nothing useful in a search box.
 */
export const DEFAULT_HOTKEYS: Hotkeys = {
	togglePanel: { code: "KeyL", ...ALT_SHIFT },
	focusItemSearch: { code: "KeyS", ...ALT_SHIFT },
	addStatFilter: { code: "KeyF", ...ALT_SHIFT },
	clearSearch: { code: "KeyC", ...ALT_SHIFT },
	focusMin: { code: "KeyN", ...ALT_SHIFT },
	focusMax: { code: "KeyM", ...ALT_SHIFT },
};

export function hotkeyId(hotkey: Hotkey): string {
	return [
		hotkey.ctrl && "ctrl",
		hotkey.alt && "alt",
		hotkey.shift && "shift",
		hotkey.meta && "meta",
		hotkey.code,
	]
		.filter(Boolean)
		.join("+");
}

const letters = (prefix: string, keys: string) =>
	[...keys].map((k) => `${prefix}+${/\d/.test(k) ? `Digit${k}` : `Key${k}`}`);

/**
 * Combos the browsers use for themselves, in Chrome and Firefox on Windows,
 * Linux and macOS. A page cannot take most of them anyway, and one it can take
 * (Ctrl+D, Ctrl+S) would surprise anyone who uses it for the browser.
 */
export const RESERVED_HOTKEYS: ReadonlySet<string> = new Set([
	// Tabs, windows, address bar, find, print, save, bookmark, history, zoom.
	...letters("ctrl", "TWNLFRDHJPSOGEKUAQ0123456789"),
	...letters("meta", "TWNLFRDHJPSOGEKUAQYM0123456789"),
	...letters("ctrl+shift", "TNPBWQDOAJIKCEMRSHYX"),
	...letters("shift+meta", "TNPBWQDOAJIKCEMRSHYX"),
	// Firefox and Chrome menu bar on Windows and Linux, address bar, home.
	...letters("alt", "FEVSBTHDN"),
	// Chrome on Windows: toolbar, bookmarks bar, report an issue, dialogs.
	...letters("alt+shift", "TBIA"),
	// Developer tools and reader view.
	...letters("ctrl+alt", "IJCR"),
	...letters("alt+meta", "IJCR"),
	"ctrl+Tab",
	"ctrl+shift+Tab",
	"alt+ArrowLeft",
	"alt+ArrowRight",
	"meta+ArrowLeft",
	"meta+ArrowRight",
	"alt+Home",
	"F5",
	"F11",
	"F12",
	"ctrl+F5",
	"Escape",
	"Tab",
	"shift+Tab",
]);

const MODIFIER_CODES = new Set([
	"ShiftLeft",
	"ShiftRight",
	"ControlLeft",
	"ControlRight",
	"AltLeft",
	"AltRight",
	"MetaLeft",
	"MetaRight",
	"OSLeft",
	"OSRight",
	"CapsLock",
]);

/** The combo a key press makes, or null while only modifiers are held. */
export function bindingFromEvent(event: KeyboardEvent): Hotkey | null {
	if (!event.code || MODIFIER_CODES.has(event.code)) return null;
	return {
		code: event.code,
		ctrl: event.ctrlKey,
		alt: event.altKey,
		shift: event.shiftKey,
		meta: event.metaKey,
	};
}

/**
 * Where focus is when a key is pressed: in no text field, in one of the trade
 * site's, or in one of the panel's own.
 */
export type KeyContext = "none" | "page-field" | "own-field";

/**
 * The action a key press triggers. In any text field a binding needs Ctrl, Alt
 * or Cmd, so plain keys always type. In the site's fields only search-box
 * actions run; in the panel's own fields every action does.
 */
export function matchHotkey(
	hotkeys: Hotkeys,
	event: KeyboardEvent,
	context: KeyContext,
): HotkeyAction | null {
	// On Windows AltGr arrives as Ctrl+Alt and types characters such as "@" on
	// many layouts, so it never counts as a shortcut. Only with both set: macOS
	// browsers can report Option alone as AltGraph.
	if (event.ctrlKey && event.altKey && event.getModifierState?.("AltGraph"))
		return null;
	const pressed = bindingFromEvent(event);
	if (!pressed) return null;
	const id = hotkeyId(pressed);
	for (const action of HOTKEY_ACTIONS) {
		const binding = hotkeys[action];
		if (!binding || hotkeyId(binding) !== id) continue;
		if (context === "none") return action;
		const modified = binding.ctrl || binding.alt || binding.meta;
		if (!modified) return null;
		return context === "own-field" || IN_FIELDS.has(action) ? action : null;
	}
	return null;
}

export type AssignResult =
	| { ok: true; hotkeys: Hotkeys }
	| { ok: false; reason: "reserved" }
	| { ok: false; reason: "taken"; by: HotkeyAction };

export function assignHotkey(
	hotkeys: Hotkeys,
	action: HotkeyAction,
	hotkey: Hotkey,
): AssignResult {
	const id = hotkeyId(hotkey);
	if (RESERVED_HOTKEYS.has(id)) return { ok: false, reason: "reserved" };
	const by = HOTKEY_ACTIONS.find((other) => {
		const binding = hotkeys[other];
		return other !== action && binding !== null && hotkeyId(binding) === id;
	});
	if (by) return { ok: false, reason: "taken", by };
	return { ok: true, hotkeys: { ...hotkeys, [action]: hotkey } };
}

const HotkeySchema = v.object({
	code: v.pipe(v.string(), v.minLength(1), v.maxLength(32)),
	ctrl: v.boolean(),
	alt: v.boolean(),
	shift: v.boolean(),
	meta: v.boolean(),
});

const StoredHotkeySchema = v.nullable(HotkeySchema);

/**
 * Each action falls back on its own. A combo used twice (two devices editing
 * at once can sync that) stays with the first action; the second gets its
 * default, or nothing if that is taken too.
 */
export function parseHotkeys(raw: unknown): Hotkeys {
	const parsed = v.safeParse(v.record(v.string(), v.unknown()), raw);
	const record = parsed.success ? parsed.output : {};
	const out: Hotkeys = { ...DEFAULT_HOTKEYS };
	const used = new Set<string>();
	const take = (hotkey: Hotkey | null): Hotkey | null => {
		if (!hotkey) return null;
		const id = hotkeyId(hotkey);
		if (used.has(id) || RESERVED_HOTKEYS.has(id)) return null;
		used.add(id);
		return hotkey;
	};
	for (const action of HOTKEY_ACTIONS) {
		const stored = v.safeParse(StoredHotkeySchema, record[action]);
		if (stored.success) {
			const kept = take(stored.output);
			if (kept || stored.output === null) {
				out[action] = kept;
				continue;
			}
		}
		out[action] = take(DEFAULT_HOTKEYS[action]);
	}
	return out;
}

const KEY_NAMES: Record<string, string> = {
	Slash: "/",
	Backslash: "\\",
	Period: ".",
	Comma: ",",
	Semicolon: ";",
	Quote: "'",
	BracketLeft: "[",
	BracketRight: "]",
	Minus: "-",
	Equal: "=",
	Backquote: "`",
	Space: "Space",
	ArrowUp: "↑",
	ArrowDown: "↓",
	ArrowLeft: "←",
	ArrowRight: "→",
};

function keyName(code: string): string {
	const letter = /^Key([A-Z])$/.exec(code)?.[1];
	if (letter) return letter;
	const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)?.[1];
	if (digit) return digit;
	return KEY_NAMES[code] ?? code;
}

/** How a combo reads on this platform: "⌥⇧L" on a Mac, "Alt+Shift+L" elsewhere. */
export function hotkeyLabel(hotkey: Hotkey, mac: boolean): string {
	const key = keyName(hotkey.code);
	if (mac)
		return [
			hotkey.ctrl && "⌃",
			hotkey.alt && "⌥",
			hotkey.shift && "⇧",
			hotkey.meta && "⌘",
			key,
		]
			.filter(Boolean)
			.join("");
	return [
		hotkey.ctrl && "Ctrl",
		hotkey.alt && "Alt",
		hotkey.shift && "Shift",
		hotkey.meta && "Win",
		key,
	]
		.filter(Boolean)
		.join("+");
}
