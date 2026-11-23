import { describe, expect, it } from "vitest";
import { parseLibrary } from "../../src/core/library";
import type { Bookmark, Folder, Library } from "../../src/core/model";
import {
	applyPlace,
	placeBookmark,
	placeFolder,
	siblingsOf,
} from "../../src/core/placement";

const folder = (
	id: string,
	parentId: string | null,
	order: number,
): Folder => ({
	id,
	parentId,
	name: id,
	game: "poe2",
	order,
	archived: false,
	updatedAt: 0,
});
const bookmark = (id: string, folderId: string, order: number): Bookmark => ({
	id,
	folderId,
	name: id,
	game: "poe2",
	league: "Standard",
	live: false,
	order,
	createdAt: 0,
	updatedAt: 0,
});

function lib(): Library {
	return parseLibrary({
		folders: [
			folder("a", null, 0),
			folder("b", null, 1),
			folder("a1", "a", 0),
			folder("c", null, 2),
		],
		bookmarks: [
			bookmark("m1", "a", 0),
			bookmark("m2", "a", 1),
			bookmark("m3", "a", 2),
			bookmark("n1", "b", 0),
		],
		tombstones: [],
	});
}

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("placeBookmark", () => {
	it("reorders within a folder and only touches rows that moved", () => {
		const result = placeBookmark(lib(), "m3", "a", 0, 9);
		if (!result.ok) throw new Error(result.reason);
		const inA = result.library.bookmarks
			.filter((b) => b.folderId === "a")
			.sort((x, y) => x.order - y.order);
		expect(ids(inA)).toEqual(["m3", "m1", "m2"]);
		expect(inA.map((b) => b.updatedAt)).toEqual([9, 9, 9]);
		expect(result.library.bookmarks.find((b) => b.id === "n1")?.updatedAt).toBe(
			0,
		);
	});

	it("moves into another folder at an index", () => {
		const result = placeBookmark(lib(), "m1", "b", 1, 9);
		if (!result.ok) throw new Error(result.reason);
		expect(
			ids(siblingsOf(result.library, { kind: "bookmark", folderId: "b" })),
		).toEqual(["n1", "m1"]);
		expect(
			ids(siblingsOf(result.library, { kind: "bookmark", folderId: "a" })),
		).toEqual(["m2", "m3"]);
	});

	it("clamps an index past the end", () => {
		const result = placeBookmark(lib(), "m1", "a", 99, 9);
		expect(
			result.ok &&
				ids(siblingsOf(result.library, { kind: "bookmark", folderId: "a" })),
		).toEqual(["m2", "m3", "m1"]);
	});

	it("refuses an unknown folder", () => {
		expect(placeBookmark(lib(), "m1", "zzz", 0, 9)).toEqual({
			ok: false,
			reason: "not-found",
		});
	});
});

describe("placeFolder", () => {
	it("reorders root folders", () => {
		const result = placeFolder(lib(), "c", null, 0, 9);
		expect(
			result.ok &&
				ids(
					siblingsOf(result.library, {
						kind: "folder",
						parentId: null,
						game: "poe2",
					}),
				),
		).toEqual(["c", "a", "b"]);
	});

	it("nests a folder at an index", () => {
		const result = placeFolder(lib(), "b", "a", 0, 9);
		expect(
			result.ok &&
				ids(
					siblingsOf(result.library, {
						kind: "folder",
						parentId: "a",
						game: "poe2",
					}),
				),
		).toEqual(["b", "a1"]);
	});

	it("refuses a cycle", () => {
		expect(placeFolder(lib(), "a", "a1", 0, 9)).toEqual({
			ok: false,
			reason: "cycle",
		});
	});
});

describe("applyPlace", () => {
	const order = (l: Library, folderId: string) =>
		ids(siblingsOf(l, { kind: "bookmark", folderId }));

	it("moves a bookmark down past its next sibling", () => {
		expect(
			order(
				applyPlace(
					lib(),
					{ kind: "bookmark", id: "m1", parentId: "a", beforeId: "m3" },
					9,
				),
				"a",
			),
		).toEqual(["m2", "m1", "m3"]);
	});

	it("moves a bookmark to the end", () => {
		expect(
			order(
				applyPlace(
					lib(),
					{ kind: "bookmark", id: "m1", parentId: "a", beforeId: null },
					9,
				),
				"a",
			),
		).toEqual(["m2", "m3", "m1"]);
	});

	it("refuses a bookmark at the root and a folder cycle", () => {
		const start = lib();
		expect(
			applyPlace(
				start,
				{ kind: "bookmark", id: "m1", parentId: null, beforeId: null },
				9,
			),
		).toBe(start);
		expect(
			applyPlace(
				start,
				{ kind: "folder", id: "a", parentId: "a1", beforeId: null },
				9,
			),
		).toBe(start);
	});

	it("moves a folder into another", () => {
		const moved = applyPlace(
			lib(),
			{ kind: "folder", id: "c", parentId: "b", beforeId: null },
			9,
		);
		expect(moved.folders.find((f) => f.id === "c")?.parentId).toBe("b");
	});
});
