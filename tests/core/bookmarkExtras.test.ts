import { describe, expect, it } from "vitest";
import {
	overwriteBookmark,
	parseLibrary,
	setBookmarkDone,
} from "../../src/core/library";
import { mergeLibraries } from "../../src/core/merge";
import type { Bookmark, Folder, Library } from "../../src/core/model";
import { changeFolderLeague, setFolderDone } from "../../src/core/tree";

const folder = (id: string, parentId: string | null): Folder => ({
	id,
	parentId,
	name: id,
	game: "poe2",
	order: 0,
	archived: false,
	updatedAt: 1,
});

const bookmark = (
	id: string,
	folderId: string,
	extra: Partial<Bookmark> = {},
): Bookmark => ({
	id,
	folderId,
	name: `Bookmark ${id}`,
	game: "poe2",
	league: "Standard",
	query: { query: { term: id } },
	searchId: `s-${id}`,
	live: false,
	order: 3,
	createdAt: 1,
	updatedAt: 1,
	...extra,
});

/** root > child, with a sibling root that must never be touched. */
const library = (): Library => ({
	folders: [
		folder("root", null),
		folder("child", "root"),
		folder("other", null),
	],
	bookmarks: [
		bookmark("a", "root"),
		bookmark("b", "child"),
		bookmark("c", "child", { league: "Dawn" }),
		bookmark("x", "other"),
	],
	tombstones: [],
});

const find = (lib: Library, id: string) => {
	const found = lib.bookmarks.find((b) => b.id === id);
	if (!found) throw new Error(`no bookmark ${id}`);
	return found;
};

describe("overwriteBookmark", () => {
	it("replaces the search but keeps the bookmark's place and name", () => {
		const next = overwriteBookmark(
			library(),
			"a",
			{
				query: { query: { term: "new" } },
				searchId: "fresh",
				league: "Dawn",
				live: true,
			},
			50,
		);
		expect(find(next, "a")).toEqual({
			...bookmark("a", "root"),
			query: { query: { term: "new" } },
			searchId: "fresh",
			league: "Dawn",
			live: true,
			updatedAt: 50,
		});
	});

	it("drops a stale search id when the new search has none", () => {
		const next = overwriteBookmark(
			library(),
			"a",
			{ query: { query: {} }, searchId: null, league: "Standard", live: false },
			50,
		);
		expect(find(next, "a").searchId).toBeUndefined();
	});
});

describe("done", () => {
	it("old data without the field loads as not done", () => {
		const raw = { ...library(), bookmarks: [bookmark("a", "root")] };
		expect(parseLibrary(raw).bookmarks[0]?.done).toBeUndefined();
	});

	it("marks one bookmark and stamps it so it syncs", () => {
		const next = setBookmarkDone(library(), "a", true, 9);
		expect(find(next, "a")).toMatchObject({ done: true, updatedAt: 9 });
		expect(find(next, "b").done).toBeUndefined();
	});

	it("marks a folder's whole subtree and nothing else", () => {
		const next = setFolderDone(library(), "root", true, 9);
		expect(["a", "b", "c"].map((id) => find(next, id).done)).toEqual([
			true,
			true,
			true,
		]);
		expect(find(next, "x").done).toBeUndefined();
	});

	it("leaves bookmarks already in that state untouched", () => {
		const once = setBookmarkDone(library(), "a", true, 9);
		const twice = setFolderDone(once, "root", true, 20);
		expect(find(twice, "a").updatedAt).toBe(9);
	});

	it("the later write wins when two machines disagree", () => {
		const home = setBookmarkDone(library(), "a", true, 10);
		const work = setBookmarkDone(home, "a", false, 20);
		const merged = mergeLibraries(home, work, 30);
		expect(find(merged, "a").done).toBe(false);
		expect(find(mergeLibraries(work, home, 30), "a").done).toBe(false);
	});
});

describe("changeFolderLeague", () => {
	it("moves the subtree's bookmarks to the league and counts them", () => {
		const result = changeFolderLeague(library(), "root", "Dawn", 7);
		expect(result.changed).toBe(2);
		expect(find(result.library, "a")).toMatchObject({
			league: "Dawn",
			updatedAt: 7,
		});
		expect(find(result.library, "b").league).toBe("Dawn");
		// Already in Dawn: not rewritten, so it does not churn sync.
		expect(find(result.library, "c").updatedAt).toBe(1);
		expect(find(result.library, "x").league).toBe("Standard");
	});

	it("ignores a blank league", () => {
		const result = changeFolderLeague(library(), "root", "  ", 7);
		expect(result.changed).toBe(0);
		expect(result.library).toEqual(library());
	});
});
