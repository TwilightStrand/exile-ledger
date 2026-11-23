import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { DEFAULT_SETTINGS, parseSettings } from "../../src/core/settings";
import { browserSettings } from "../../src/core/settingsStore";

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

describe("settings storage", () => {
	beforeEach(() => fakeBrowser.reset());

	it("saves a change and reads it back", async () => {
		await browserSettings.save({ panelSide: "right" });
		expect(await browserSettings.load()).toEqual({ panelSide: "right" });
	});

	it("tells watchers about changes", async () => {
		const seen = vi.fn();
		const stop = browserSettings.watch(seen);
		await browserSettings.save({ panelSide: "right" });
		await vi.waitFor(() =>
			expect(seen).toHaveBeenCalledWith({ panelSide: "right" }),
		);
		stop();
	});
});
