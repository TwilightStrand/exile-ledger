import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { browserSettings } from "../../src/storage/settingsStore";

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
