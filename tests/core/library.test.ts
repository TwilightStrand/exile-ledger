import { describe, expect, it } from "vitest";
import {
	bookmarkTree,
	DEFAULT_FOLDER_NAME,
	deleteBookmark,
	emptyLibrary,
	parseLibrary,
	renameBookmark,
	type SaveInput,
	saveSearch,
} from "../../src/core/library";
import searchRequest from "../fixtures/trade/poe2-search-request.json";

function ids() {
	let n = 0;
	return () => `id${++n}`;
}

const poe2Search: SaveInput = {
	game: "poe2",
	league: "Standard",
	name: "Body Armour",
	query: searchRequest,
	searchId: "abc",
	live: false,
};

describe("saveSearch", () => {
	it("creates a default folder for the game and puts the bookmark in it", () => {
		const { library, bookmark } = saveSearch(emptyLibrary(), poe2Search, {
			now: 10,
			newId: ids(),
		});
		expect(library.folders).toEqual([
			{
				id: "id1",
				parentId: null,
				name: DEFAULT_FOLDER_NAME,
				game: "poe2",
				order: 0,
				archived: false,
				updatedAt: 10,
			},
		]);
		expect(bookmark).toMatchObject({
			id: "id2",
			folderId: "id1",
			name: "Body Armour",
			game: "poe2",
			league: "Standard",
			searchId: "abc",
			order: 0,
			createdAt: 10,
			updatedAt: 10,
		});
		expect(library.bookmarks).toEqual([bookmark]);
	});

	it("reuses the default folder and appends in order", () => {
		const newId = ids();
		const first = saveSearch(emptyLibrary(), poe2Search, { now: 1, newId });
		const second = saveSearch(
			first.library,
			{ ...poe2Search, name: "Second" },
			{ now: 2, newId },
		);
		expect(second.library.folders).toHaveLength(1);
		expect(second.bookmark.order).toBe(1);
	});

	it("keeps PoE1 and PoE2 bookmarks in separate folders", () => {
		const newId = ids();
		const a = saveSearch(emptyLibrary(), poe2Search, { now: 1, newId });
		const b = saveSearch(
			a.library,
			{ ...poe2Search, game: "poe1" },
			{ now: 2, newId },
		);
		expect(b.library.folders.map((f) => f.game)).toEqual(["poe2", "poe1"]);
		expect(bookmarkTree(b.library, "poe1")).toHaveLength(1);
		expect(bookmarkTree(b.library, "poe2")[0]?.bookmarks[0]?.game).toBe("poe2");
	});
});

describe("renameBookmark and deleteBookmark", () => {
	const { library, bookmark } = saveSearch(emptyLibrary(), poe2Search, {
		now: 1,
		newId: ids(),
	});

	it("renames and bumps updatedAt", () => {
		const renamed = renameBookmark(library, bookmark.id, "  Chest  ", 5);
		expect(renamed.bookmarks[0]).toMatchObject({ name: "Chest", updatedAt: 5 });
	});

	it("ignores a blank name", () => {
		expect(renameBookmark(library, bookmark.id, "   ", 5)).toBe(library);
	});

	it("deletes and leaves a tombstone for sync", () => {
		const deleted = deleteBookmark(library, bookmark.id, 7);
		expect(deleted.bookmarks).toEqual([]);
		expect(deleted.tombstones).toEqual([{ id: bookmark.id, deletedAt: 7 }]);
	});
});

describe("bookmarkTree", () => {
	it("nests folders by parent and sorts by order", () => {
		const library = parseLibrary({
			folders: [
				{
					id: "b",
					parentId: null,
					name: "B",
					game: "poe2",
					order: 1,
					archived: false,
					updatedAt: 0,
				},
				{
					id: "a",
					parentId: null,
					name: "A",
					game: "poe2",
					order: 0,
					archived: false,
					updatedAt: 0,
				},
				{
					id: "a1",
					parentId: "a",
					name: "A1",
					game: "poe2",
					order: 0,
					archived: false,
					updatedAt: 0,
				},
				{
					id: "x",
					parentId: null,
					name: "Archived",
					game: "poe2",
					order: 2,
					archived: true,
					updatedAt: 0,
				},
			],
			bookmarks: [
				{
					id: "m2",
					folderId: "a1",
					name: "Second",
					game: "poe2",
					league: "Standard",
					live: false,
					order: 1,
					createdAt: 0,
					updatedAt: 0,
				},
				{
					id: "m1",
					folderId: "a1",
					name: "First",
					game: "poe2",
					league: "Standard",
					live: false,
					order: 0,
					createdAt: 0,
					updatedAt: 0,
				},
			],
			tombstones: [],
		});
		const tree = bookmarkTree(library, "poe2");
		expect(tree.map((f) => f.folder.name)).toEqual(["A", "B"]);
		expect(tree[0]?.folders[0]?.folder.name).toBe("A1");
		expect(tree[0]?.folders[0]?.bookmarks.map((b) => b.name)).toEqual([
			"First",
			"Second",
		]);
	});
});

describe("parseLibrary", () => {
	it.each([undefined, null, "x", { folders: "nope" }])(
		"returns an empty library for %o",
		(raw) => {
			expect(parseLibrary(raw)).toEqual(emptyLibrary());
		},
	);

	it("drops single invalid records and keeps the rest", () => {
		const library = parseLibrary({
			folders: [
				{
					id: "a",
					parentId: null,
					name: "A",
					game: "poe2",
					order: 0,
					archived: false,
					updatedAt: 0,
				},
				{ id: 5 },
			],
			bookmarks: [],
			tombstones: [],
		});
		expect(library.folders.map((f) => f.id)).toEqual(["a"]);
	});
});
