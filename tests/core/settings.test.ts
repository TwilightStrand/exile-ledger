import { describe, expect, it } from "vitest";
import {
	DEFAULT_SETTINGS,
	panelWidthCss,
	parseSettings,
} from "../../src/core/settings";

describe("parseSettings", () => {
	it.each([
		["nothing stored", undefined, DEFAULT_SETTINGS],
		["a non-object", "left", DEFAULT_SETTINGS],
		["an unknown side", { panelSide: "top" }, DEFAULT_SETTINGS],
		[
			"a valid side",
			{ panelSide: "right" },
			{ ...DEFAULT_SETTINGS, panelSide: "right" },
		],
		[
			"an out-of-range width",
			{ panelWidth: 304 },
			{ ...DEFAULT_SETTINGS, panelWidth: 40 },
		],
		["a non-number width", { panelWidth: "wide" }, DEFAULT_SETTINGS],
		["a non-boolean compact flag", { compact: "yes" }, DEFAULT_SETTINGS],
		["an unknown theme", { theme: "neon" }, DEFAULT_SETTINGS],
		["a non-string theme", { theme: 3 }, DEFAULT_SETTINGS],
		[
			"a known theme",
			{ theme: "bone" },
			{ ...DEFAULT_SETTINGS, theme: "bone" },
		],
		[
			"an unknown theme beside valid fields",
			{ theme: "neon", panelSide: "right" },
			{ ...DEFAULT_SETTINGS, panelSide: "right" },
		],
	])("falls back to defaults for %s", (_label, raw, expected) => {
		expect(parseSettings(raw)).toEqual(expected);
	});

	it("starts on the gold theme", () => {
		expect(DEFAULT_SETTINGS.theme).toBe("gold");
	});

	it("docks the panel on the left by default", () => {
		expect(DEFAULT_SETTINGS.panelSide).toBe("left");
	});

	it("keeps a tenth of a percent so dragging stays smooth", () => {
		expect(parseSettings({ panelWidth: 22.345 }).panelWidth).toBe(22.3);
	});
});

describe("panelWidthCss", () => {
	it("scales with the window between fixed pixel bounds", () => {
		expect(panelWidthCss(20)).toBe("clamp(260px, 20vw, 640px)");
	});
});
