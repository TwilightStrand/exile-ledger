import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../../src/core/settings";

describe("parseSettings", () => {
	it.each([
		["nothing stored", undefined, DEFAULT_SETTINGS],
		["a non-object", "left", DEFAULT_SETTINGS],
		["an unknown side", { panelSide: "top" }, DEFAULT_SETTINGS],
		["a valid side", { panelSide: "right" }, { panelSide: "right" }],
	])("falls back to defaults for %s", (_label, raw, expected) => {
		expect(parseSettings(raw)).toEqual(expected);
	});

	it("docks the panel on the left by default", () => {
		expect(DEFAULT_SETTINGS.panelSide).toBe("left");
	});
});
