import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
	emptyLibrary,
	type SaveInput,
	saveSearch,
} from "../../src/core/library";
import {
	browserLibrary,
	listenForLibraryWrites,
} from "../../src/storage/libraryStore";

const input: SaveInput = {
	game: "poe2",
	league: "Standard",
	name: "Garb",
	query: { query: { type: "Hatungo Garb" } },
	searchId: "abc",
	live: false,
};

describe("browserLibrary", () => {
	beforeEach(() => {
		fakeBrowser.reset();
		listenForLibraryWrites();
	});

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

	it("keeps both edits when two contexts save at the same time", async () => {
		let n = 0;
		const save = (name: string, searchId: string) =>
			browserLibrary.update(
				(lib) =>
					saveSearch(
						lib,
						{ ...input, name, searchId },
						{ now: 2, newId: () => `id${++n}` },
					).library,
			);
		await save("First", "a");
		await Promise.all([save("Bow", "b"), save("Ring", "c")]);
		const names = (await browserLibrary.load()).bookmarks
			.map((b) => b.name)
			.sort();
		expect(names).toEqual(["Bow", "First", "Ring"]);
	});
});
