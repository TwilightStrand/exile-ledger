import { describe, expect, it } from "vitest";
import { emptyLibrary, parseLibrary } from "../../src/core/library";
import type { Bookmark, Folder, Library } from "../../src/core/model";
import {
	archivedRoots,
	createFolder,
	deleteFolder,
	depthOf,
	MAX_DEPTH,
	moveFolder,
	renameFolder,
	setArchived,
	subtreeStats,
} from "../../src/core/tree";

function folder(id: string, parentId: string | null, order = 0): Folder {
	return {
		id,
		parentId,
		name: id.toUpperCase(),
		game: "poe2",
		order,
		archived: false,
		updatedAt: 0,
	};
}

function bookmark(id: string, folderId: string): Bookmark {
	return {
		id,
		folderId,
		name: id,
		game: "poe2",
		league: "Standard",
		live: false,
		order: 0,
		createdAt: 0,
		updatedAt: 0,
	};
}

/** a > b > c > d > e (5 levels), plus x at the root. */
function chain(): Library {
	return parseLibrary({
		folders: [
			folder("a", null),
			folder("b", "a"),
			folder("c", "b"),
			folder("d", "c"),
			folder("e", "d"),
			folder("x", null, 1),
		],
		bookmarks: [
			bookmark("m1", "a"),
			bookmark("m2", "c"),
			bookmark("m3", "e"),
			bookmark("m4", "x"),
		],
		tombstones: [],
	});
}

const clock = (now = 9) => {
	let n = 0;
	return { now, newId: () => `new${++n}` };
};

describe("createFolder", () => {
	it("creates a root folder after the existing ones", () => {
		const result = createFolder(
			chain(),
			{ name: " Gear ", game: "poe2", parentId: null },
			clock(),
		);
		if (!result.ok) throw new Error(result.reason);
		expect(result.folder).toMatchObject({
			id: "new1",
			name: "Gear",
			parentId: null,
			order: 2,
			updatedAt: 9,
		});
	});

	it("nests under a parent", () => {
		const result = createFolder(
			chain(),
			{ name: "Sub", game: "poe2", parentId: "x" },
			clock(),
		);
		expect(result.ok && result.folder.parentId).toBe("x");
	});

	it("refuses a sixth level", () => {
		const result = createFolder(
			chain(),
			{ name: "Too deep", game: "poe2", parentId: "e" },
			clock(),
		);
		expect(result).toEqual({ ok: false, reason: "too-deep" });
	});

	it("refuses a blank name and a missing parent", () => {
		expect(
			createFolder(
				chain(),
				{ name: "  ", game: "poe2", parentId: null },
				clock(),
			),
		).toEqual({ ok: false, reason: "blank-name" });
		expect(
			createFolder(
				chain(),
				{ name: "A", game: "poe2", parentId: "nope" },
				clock(),
			),
		).toEqual({ ok: false, reason: "not-found" });
	});

	it("refuses a parent from the other game", () => {
		expect(
			createFolder(
				chain(),
				{ name: "A", game: "poe1", parentId: "x" },
				clock(),
			),
		).toEqual({ ok: false, reason: "not-found" });
	});
});

describe("depthOf", () => {
	it("counts levels from the root", () => {
		const { folders } = chain();
		expect(depthOf(folders, "a")).toBe(1);
		expect(depthOf(folders, "e")).toBe(MAX_DEPTH);
	});
});

describe("moveFolder", () => {
	it("moves a folder with its subtree", () => {
		const result = moveFolder(chain(), "d", "x", 5);
		if (!result.ok) throw new Error(result.reason);
		const moved = result.library.folders.find((f) => f.id === "d");
		expect(moved).toMatchObject({ parentId: "x", updatedAt: 5 });
		expect(depthOf(result.library.folders, "e")).toBe(3);
	});

	it("refuses to move a folder into itself or a descendant", () => {
		expect(moveFolder(chain(), "b", "b", 5)).toEqual({
			ok: false,
			reason: "cycle",
		});
		expect(moveFolder(chain(), "b", "d", 5)).toEqual({
			ok: false,
			reason: "cycle",
		});
	});

	it("refuses a move that would push the subtree past 5 levels", () => {
		// b's subtree is 4 levels (b, c, d, e); under x it would end at level 5: allowed.
		expect(moveFolder(chain(), "b", "x", 5).ok).toBe(true);
		const deeper = createFolder(
			chain(),
			{ name: "y", game: "poe2", parentId: "x" },
			clock(),
		);
		if (!deeper.ok) throw new Error(deeper.reason);
		// Under x > y it would end at level 6.
		expect(moveFolder(deeper.library, "b", deeper.folder.id, 5)).toEqual({
			ok: false,
			reason: "too-deep",
		});
	});

	it("moves to the root", () => {
		const result = moveFolder(chain(), "c", null, 5);
		expect(
			result.ok && result.library.folders.find((f) => f.id === "c")?.parentId,
		).toBeNull();
	});
});

describe("subtreeStats and deleteFolder", () => {
	it("counts folders and bookmarks below a folder, including itself", () => {
		expect(subtreeStats(chain(), "b")).toEqual({ folders: 4, bookmarks: 2 });
	});

	it("deletes the subtree and its bookmarks, leaving tombstones", () => {
		const library = deleteFolder(chain(), "b", 7);
		expect(library.folders.map((f) => f.id)).toEqual(["a", "x"]);
		expect(library.bookmarks.map((b) => b.id)).toEqual(["m1", "m4"]);
		expect(library.tombstones.map((t) => t.id).sort()).toEqual(
			["b", "c", "d", "e", "m2", "m3"].sort(),
		);
		expect(library.tombstones.every((t) => t.deletedAt === 7)).toBe(true);
	});
});

describe("setArchived and archivedRoots", () => {
	it("archives and unarchives the whole subtree", () => {
		const archived = setArchived(chain(), "c", true, 3);
		expect(archived.folders.filter((f) => f.archived).map((f) => f.id)).toEqual(
			["c", "d", "e"],
		);
		expect(archivedRoots(archived, "poe2").map((f) => f.id)).toEqual(["c"]);

		const restored = setArchived(archived, "c", false, 4);
		expect(restored.folders.some((f) => f.archived)).toBe(false);
		expect(archivedRoots(restored, "poe2")).toEqual([]);
	});

	it("brings an archived folder back at the root when its parent is gone", () => {
		const archived = setArchived(chain(), "c", true, 3);
		const parentDeleted = {
			...archived,
			folders: archived.folders.filter((f) => f.id !== "b"),
		};
		const restored = setArchived(parentDeleted, "c", false, 4);
		expect(restored.folders.find((f) => f.id === "c")?.parentId).toBeNull();
	});
});

describe("renameFolder", () => {
	it("trims and ignores blank names", () => {
		expect(renameFolder(chain(), "a", " Alpha ", 2).folders[0]).toMatchObject({
			name: "Alpha",
			updatedAt: 2,
		});
		const lib = chain();
		expect(renameFolder(lib, "a", " ", 2)).toBe(lib);
	});

	it("leaves an empty library alone", () => {
		expect(renameFolder(emptyLibrary(), "a", "x", 1)).toEqual(emptyLibrary());
	});
});
