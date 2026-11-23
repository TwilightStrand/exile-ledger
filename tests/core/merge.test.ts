import { describe, expect, it } from "vitest";
import { parseLibrary } from "../../src/core/library";
import {
	mergeLibraries,
	RECOVERED_FOLDER_NAME,
	recoveredFolderId,
	TOMBSTONE_TTL_MS,
} from "../../src/core/merge";
import type { Bookmark, Folder, Library } from "../../src/core/model";
import { depthOf } from "../../src/core/tree";

const folder = (
	id: string,
	parentId: string | null,
	updatedAt = 1,
	name = id,
): Folder => ({
	id,
	parentId,
	name,
	game: "poe2",
	order: 0,
	archived: false,
	updatedAt,
});
const bookmark = (
	id: string,
	folderId: string,
	updatedAt = 1,
	name = id,
): Bookmark => ({
	id,
	folderId,
	name,
	game: "poe2",
	league: "Standard",
	live: false,
	order: 0,
	createdAt: 1,
	updatedAt,
});
const lib = (
	folders: Folder[],
	bookmarks: Bookmark[] = [],
	tombstones: Library["tombstones"] = [],
) => parseLibrary({ folders, bookmarks, tombstones });

const NOW = 1_000_000;

describe("mergeLibraries", () => {
	it("keeps the newest edit of each item", () => {
		const base = [folder("a", null)];
		const machine1 = lib(base, [bookmark("m", "a", 5, "renamed on 1")]);
		const machine2 = lib(base, [bookmark("m", "a", 7, "renamed on 2")]);
		expect(mergeLibraries(machine1, machine2, NOW).bookmarks[0]?.name).toBe(
			"renamed on 2",
		);
		expect(mergeLibraries(machine2, machine1, NOW)).toEqual(
			mergeLibraries(machine1, machine2, NOW),
		);
	});

	it("unions independent additions from both machines", () => {
		const merged = mergeLibraries(
			lib([folder("a", null)]),
			lib([folder("b", null)]),
			NOW,
		);
		expect(merged.folders.map((f) => f.id)).toEqual(["a", "b"]);
	});

	it("lets a delete win over older edits but not newer ones", () => {
		const deletedLater = mergeLibraries(
			lib([folder("a", null)], [bookmark("m", "a", 5)]),
			lib([folder("a", null)], [], [{ id: "m", deletedAt: 6 }]),
			NOW,
		);
		expect(deletedLater.bookmarks).toEqual([]);

		const editedLater = mergeLibraries(
			lib([folder("a", null)], [bookmark("m", "a", 8)]),
			lib([folder("a", null)], [], [{ id: "m", deletedAt: 6 }]),
			NOW,
		);
		expect(editedLater.bookmarks.map((b) => b.id)).toEqual(["m"]);
	});

	it("breaks a cycle made by two machines moving folders into each other", () => {
		const machine1 = lib([folder("a", "b", 5), folder("b", null, 1)]);
		const machine2 = lib([folder("a", null, 1), folder("b", "a", 6)]);
		const merged = mergeLibraries(machine1, machine2, NOW);
		expect(merged.folders.some((f) => f.parentId === null)).toBe(true);
		for (const f of merged.folders)
			expect(depthOf(merged.folders, f.id)).toBeLessThanOrEqual(2);
	});

	it("moves bookmarks of a folder deleted elsewhere into Recovered", () => {
		const machine1 = lib(
			[folder("a", null)],
			[bookmark("m", "a", 9, "added after delete")],
		);
		const machine2 = lib([], [], [{ id: "a", deletedAt: 5 }]);
		const merged = mergeLibraries(machine1, machine2, NOW);
		expect(merged.folders.map((f) => [f.id, f.name])).toEqual([
			[recoveredFolderId("poe2"), RECOVERED_FOLDER_NAME],
		]);
		expect(merged.bookmarks[0]?.folderId).toBe(recoveredFolderId("poe2"));
		expect(mergeLibraries(merged, machine2, NOW)).toEqual(merged);
	});

	it("drops tombstones older than 30 days", () => {
		const merged = mergeLibraries(
			lib([], [], [{ id: "old", deletedAt: 1 }]),
			lib([]),
			TOMBSTONE_TTL_MS + 10,
		);
		expect(merged.tombstones).toEqual([]);
	});

	it("is idempotent", () => {
		const a = lib(
			[folder("a", null)],
			[bookmark("m", "a")],
			[{ id: "z", deletedAt: 3 }],
		);
		const once = mergeLibraries(a, a, NOW);
		expect(mergeLibraries(once, once, NOW)).toEqual(once);
	});
});
