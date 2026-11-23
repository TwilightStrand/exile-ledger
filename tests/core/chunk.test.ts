import { describe, expect, it } from "vitest";
import {
	CHUNK_CHARS,
	decodeChunks,
	encodeChunks,
	SYNC_BUDGET_BYTES,
	syncBytes,
} from "../../src/core/chunk";
import type { Bookmark, Folder } from "../../src/core/model";
import searchRequest from "../fixtures/trade/poe2-search-request.json";

function realisticLibrary(count: number) {
	const folders: Folder[] = Array.from({ length: 25 }, (_, i) => ({
		id: crypto.randomUUID(),
		parentId: null,
		name: `Build ${i} gear and upgrades`,
		game: i % 2 ? "poe1" : "poe2",
		order: i,
		archived: false,
		updatedAt: 1_790_000_000_000 + i,
	}));
	const bookmarks: Bookmark[] = Array.from({ length: count }, (_, i) => {
		const folder = folders[i % folders.length];
		if (!folder) throw new Error("no folder");
		return {
			id: crypto.randomUUID(),
			folderId: folder.id,
			name: `Search ${i}: life, resists and ${i % 7} more`,
			game: folder.game,
			league: "Rise of the Abyssal",
			query: {
				...searchRequest,
				query: {
					...searchRequest.query,
					stats: [
						{
							type: "and",
							filters: [
								{
									id: `explicit.stat_${3299347043 + (i % 40)}`,
									value: { min: 50 + (i % 30) },
								},
							],
						},
					],
				},
			},
			searchId: crypto.randomUUID().slice(0, 10),
			live: i % 9 === 0,
			order: i,
			createdAt: 1_790_000_000_000 + i,
			updatedAt: 1_790_000_000_000 + i,
		};
	});
	return { folders, bookmarks, tombstones: [] };
}

describe("encodeChunks / decodeChunks", () => {
	it("round-trips and keeps every chunk under the item size", async () => {
		const library = realisticLibrary(120);
		const chunks = await encodeChunks(library);
		for (const chunk of chunks)
			expect(chunk.length).toBeLessThanOrEqual(CHUNK_CHARS);
		expect(await decodeChunks(chunks)).toEqual(library);
	});

	it("fits 500 realistic bookmarks within the sync budget", async () => {
		const chunks = await encodeChunks(realisticLibrary(500));
		const items = Object.fromEntries(
			chunks.map((c, i) => [`el:c${i}`, `w123|${c}`]),
		);
		expect(syncBytes(items)).toBeLessThan(SYNC_BUDGET_BYTES);
	});

	it.each([[[""]], [["@@@"]], [["AAAA"]]])(
		"returns null for %j",
		async (chunks) => {
			expect(await decodeChunks(chunks)).toBeNull();
		},
	);
});
