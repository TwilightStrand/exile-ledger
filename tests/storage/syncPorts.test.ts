import { beforeEach, describe, expect, it } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { saveSearch } from "../../src/core/library";
import { META_KEY, syncOnce } from "../../src/core/syncEngine";
import {
	browserLibrary,
	listenForLibraryWrites,
} from "../../src/storage/libraryStore";
import { browserSyncPorts } from "../../src/storage/syncPorts";

describe("browserSyncPorts", () => {
	beforeEach(() => {
		fakeBrowser.reset();
		listenForLibraryWrites();
	});

	it("pushes the local library into storage.sync and pulls it back into an empty install", async () => {
		let n = 0;
		await browserLibrary.update(
			(lib) =>
				saveSearch(
					lib,
					{
						game: "poe1",
						league: "Standard",
						name: "Tabula",
						query: { query: { name: "Tabula Rasa" } },
						searchId: "t",
						live: false,
					},
					{ now: Date.now(), newId: () => `x${++n}` },
				).library,
		);
		expect((await syncOnce(browserSyncPorts)).state).toBe("on");
		const synced = await browser.storage.sync.get(null);
		expect(synced[META_KEY]).toBeDefined();

		await browser.storage.local.clear();
		expect((await browserLibrary.load()).bookmarks).toEqual([]);
		await syncOnce(browserSyncPorts);
		expect((await browserLibrary.load()).bookmarks.map((b) => b.name)).toEqual([
			"Tabula",
		]);
	});
});
