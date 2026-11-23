import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
	emptyLibrary,
	type SaveInput,
	saveSearch,
} from "../../src/core/library";
import { browserLibrary } from "../../src/storage/libraryStore";

const input: SaveInput = {
	game: "poe2",
	league: "Standard",
	name: "Garb",
	query: { query: { type: "Hatungo Garb" } },
	searchId: "abc",
	live: false,
};

describe("browserLibrary", () => {
	beforeEach(() => fakeBrowser.reset());

	it("starts empty", async () => {
		expect(await browserLibrary.load()).toEqual(emptyLibrary());
	});

	it("persists a saved bookmark for the next load", async () => {
		let n = 0;
		await browserLibrary.update(
			(lib) =>
				saveSearch(lib, input, { now: 1, newId: () => `id${++n}` }).library,
		);
		const reloaded = await browserLibrary.load();
		expect(reloaded.bookmarks.map((b) => b.name)).toEqual(["Garb"]);
	});

	it("notifies watchers", async () => {
		const seen = vi.fn();
		const stop = browserLibrary.watch(seen);
		await browserLibrary.update(
			(lib) =>
				saveSearch(lib, input, {
					now: 1,
					newId: crypto.randomUUID.bind(crypto),
				}).library,
		);
		await vi.waitFor(() => expect(seen).toHaveBeenCalled());
		stop();
	});
});
