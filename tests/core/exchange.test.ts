import { describe, expect, it } from "vitest";
import {
	createBackup,
	decodeShare,
	encodeShare,
	importPayload,
	parseBackup,
	SHARE_PREFIX,
} from "../../src/core/exchange";
import { emptyLibrary, parseLibrary } from "../../src/core/library";
import type { Bookmark, Folder, Library } from "../../src/core/model";
import { DEFAULT_SETTINGS } from "../../src/core/settings";

const folder = (id: string, parentId: string | null, order = 0): Folder => ({
	id,
	parentId,
	name: `Folder ${id} – ünïcødé ⚔`,
	game: "poe2",
	order,
	archived: false,
	updatedAt: 0,
});
const bookmark = (id: string, folderId: string): Bookmark => ({
	id,
	folderId,
	name: id,
	game: "poe2",
	league: "Standard",
	query: { query: { term: id } },
	live: false,
	order: 0,
	createdAt: 0,
	updatedAt: 0,
});

function lib(): Library {
	return parseLibrary({
		folders: [folder("a", null), folder("b", "a"), folder("x", null, 1)],
		bookmarks: [bookmark("m1", "a"), bookmark("m2", "b"), bookmark("m3", "x")],
		tombstones: [],
	});
}

const clock = () => {
	let n = 0;
	return { now: 50, newId: () => `new${++n}` };
};

describe("share strings", () => {
	it("round-trips a folder subtree, including non-ASCII names", () => {
		const text = encodeShare(lib(), "a");
		expect(text?.startsWith(SHARE_PREFIX)).toBe(true);
		const decoded = decodeShare(text ?? "");
		if (!decoded.ok) throw new Error(decoded.message);
		expect(decoded.value.folders.map((f) => f.id)).toEqual(["a", "b"]);
		expect(decoded.value.folders[0]?.name).toBe("Folder a – ünïcødé ⚔");
		expect(decoded.value.bookmarks.map((b) => b.id)).toEqual(["m1", "m2"]);
	});

	it.each([
		["", "not an Exile Ledger share string"],
		["3:eyJ4Ijoi", "not an Exile Ledger share string"],
		[`${SHARE_PREFIX}%%%`, "damaged"],
		[`${SHARE_PREFIX}eyJmb2xkZXJzIjpbXSwiYm9va21hcmtzIjpbXX0`, "no folders"],
	])("rejects %j with a message", (text, message) => {
		const decoded = decodeShare(text);
		expect(decoded.ok).toBe(false);
		if (!decoded.ok) expect(decoded.message).toContain(message);
	});
});

describe("importPayload", () => {
	it("adds copies with fresh IDs after existing folders and leaves existing data alone", () => {
		const start = lib();
		const decoded = decodeShare(encodeShare(start, "a") ?? "");
		if (!decoded.ok) throw new Error(decoded.message);
		const result = importPayload(start, decoded.value, clock());

		expect(result).toMatchObject({ folders: 2, bookmarks: 2 });
		expect(result.library.folders.slice(0, 3)).toEqual(start.folders);
		const imported = result.library.folders.slice(3);
		expect(imported.map((f) => [f.id, f.parentId, f.order])).toEqual([
			["new1", null, 2],
			["new2", "new1", 0],
		]);
		const importedBookmarks = result.library.bookmarks.slice(3);
		expect(importedBookmarks.map((b) => b.folderId)).toEqual(["new1", "new2"]);
		expect(new Set(result.library.bookmarks.map((b) => b.id)).size).toBe(5);
	});
});

describe("backups", () => {
	it("restores every folder, bookmark and setting into a clean profile", () => {
		const backup = createBackup(
			lib(),
			{ ...DEFAULT_SETTINGS, panelSide: "right" },
			99,
		);
		const parsed = parseBackup(JSON.stringify(backup));
		if (!parsed.ok) throw new Error(parsed.message);
		const restored = importPayload(
			emptyLibrary(),
			parsed.value.library,
			clock(),
		);
		expect(restored.library.folders.map((f) => f.name)).toEqual(
			lib().folders.map((f) => f.name),
		);
		expect(restored.library.bookmarks.map((b) => b.name)).toEqual([
			"m1",
			"m2",
			"m3",
		]);
		expect(parsed.value.settings?.panelSide).toBe("right");
	});

	it.each(["not json", "{}", JSON.stringify({ format: "other", version: 1 })])(
		"rejects %j",
		(text) => {
			expect(parseBackup(text).ok).toBe(false);
		},
	);
});
