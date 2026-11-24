import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import { browserSettings } from "../../src/storage/settingsStore";

describe("settings storage", () => {
	beforeEach(() => fakeBrowser.reset());

	it("saves a change and reads it back", async () => {
		await browserSettings.save({ panelSide: "right" });
		expect(await browserSettings.load()).toEqual({
			...DEFAULT_SETTINGS,
			panelSide: "right",
		});
	});

	it("tells watchers about changes", async () => {
		const seen = vi.fn();
		const stop = browserSettings.watch(seen);
		await browserSettings.save({ panelSide: "right" });
		await vi.waitFor(() =>
			expect(seen).toHaveBeenCalledWith({
				...DEFAULT_SETTINGS,
				panelSide: "right",
			}),
		);
		stop();
	});
});

describe("settings from a newer version", () => {
	beforeEach(() => fakeBrowser.reset());

	it("survive a save from this version", async () => {
		await fakeBrowser.storage.sync.set({
			settings: { panelSide: "left", fromTheFuture: { on: true } },
		});
		await browserSettings.save({ panelSide: "right" });
		const { settings } = await fakeBrowser.storage.sync.get("settings");
		expect(settings).toMatchObject({
			panelSide: "right",
			fromTheFuture: { on: true },
		});
	});
});
