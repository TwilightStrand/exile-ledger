import { describe, expect, it } from "vitest";
import {
	DEFAULT_SETTINGS,
	panelWidthCss,
	parseSettings,
	switchWidthUnit,
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
		["an unknown width unit", { panelWidthUnit: "em" }, DEFAULT_SETTINGS],
		[
			"a pixel width past the maximum",
			{ panelWidthUnit: "px", panelWidthPx: 900 },
			{ ...DEFAULT_SETTINGS, panelWidthUnit: "px", panelWidthPx: 640 },
		],
		[
			"a fractional pixel width",
			{ panelWidthPx: 300.6 },
			{ ...DEFAULT_SETTINGS, panelWidthPx: 301 },
		],
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
	it("scales a percentage with the window between fixed pixel bounds", () => {
		expect(panelWidthCss("percent", 20)).toBe("clamp(260px, 20vw, 640px)");
	});

	it("uses a pixel width as is", () => {
		expect(panelWidthCss("px", 360)).toBe("360px");
	});
});

describe("switchWidthUnit", () => {
	it("keeps the panel's size when switching to pixels", () => {
		const next = switchWidthUnit(
			{ ...DEFAULT_SETTINGS, panelWidth: 25 },
			"px",
			1600,
		);
		expect(next).toMatchObject({ panelWidthUnit: "px", panelWidthPx: 400 });
	});

	it("keeps the panel's size when switching to percent", () => {
		const next = switchWidthUnit(
			{ ...DEFAULT_SETTINGS, panelWidthUnit: "px", panelWidthPx: 400 },
			"percent",
			1600,
		);
		expect(next).toMatchObject({ panelWidthUnit: "percent", panelWidth: 25 });
	});

	it("clamps to percent bounds a pixel width the window cannot express", () => {
		const next = switchWidthUnit(
			{ ...DEFAULT_SETTINGS, panelWidthUnit: "px", panelWidthPx: 260 },
			"percent",
			3840,
		);
		expect(next.panelWidth).toBe(14);
	});

	it("clamps a converted width to the unit's bounds", () => {
		const next = switchWidthUnit(
			{ ...DEFAULT_SETTINGS, panelWidth: 14 },
			"px",
			1280,
		);
		expect(next.panelWidthPx).toBe(260);
	});
});
