import { describe, expect, it } from "vitest";
import {
	emptyLibrary,
	renameBookmark,
	saveSearch,
} from "../../src/core/library";
import type { Library } from "../../src/core/model";
import {
	chunkKey,
	META_KEY,
	type SyncPorts,
	syncOnce,
} from "../../src/core/syncEngine";
import { createFolder, deleteFolder } from "../../src/core/tree";

let ids = 0;
const newId = () => `id${++ids}`;

function install(shared: Map<string, unknown>, clock: { now: number }) {
	let local: Library = emptyLibrary();
	const writes = { local: 0, sync: 0 };
	const ports: SyncPorts = {
		readLocal: async () => local,
		writeLocal: async (lib) => {
			writes.local++;
			local = lib;
		},
		readSync: async () => Object.fromEntries(shared),
		writeSync: async (items) => {
			writes.sync++;
			for (const [k, val] of Object.entries(items)) shared.set(k, val);
		},
		removeSync: async (keys) => {
			for (const k of keys) shared.delete(k);
		},
		now: () => clock.now,
		newWriteId: newId,
	};
	return {
		ports,
		writes,
		get: () => local,
		edit: (change: (l: Library) => Library) => {
			local = change(local);
		},
	};
}

const save = (name: string, now: number) => (lib: Library) =>
	saveSearch(
		lib,
		{
			game: "poe2",
			league: "Standard",
			name,
			query: { query: { term: name } },
			searchId: name,
			live: false,
		},
		{ now, newId },
	).library;

describe("syncOnce with two installs sharing storage.sync", () => {
	it("converges after concurrent edits on both machines", async () => {
		const shared = new Map<string, unknown>();
		const clock = { now: 1000 };
		const home = install(shared, clock);
		const work = install(shared, clock);

		home.edit(save("Bow", 1000));
		expect((await syncOnce(home.ports)).state).toBe("on");
		await syncOnce(work.ports);
		expect(work.get().bookmarks.map((b) => b.name)).toEqual(["Bow"]);

		const bowId = work.get().bookmarks[0]?.id ?? "";
		clock.now = 2000;
		work.edit((l) => renameBookmark(l, bowId, "Bow from work", 2000));
		home.edit(save("Ring", 2001));
		await syncOnce(work.ports);
		await syncOnce(home.ports);
		await syncOnce(work.ports);

		expect(home.get()).toEqual(work.get());
		expect(
			home
				.get()
				.bookmarks.map((b) => b.name)
				.sort(),
		).toEqual(["Bow from work", "Ring"]);
	});

	it("propagates a folder delete and recovers bookmarks added to it elsewhere", async () => {
		const shared = new Map<string, unknown>();
		const clock = { now: 1000 };
		const a = install(shared, clock);
		const b = install(shared, clock);
		a.edit((l) => {
			const r = createFolder(
				l,
				{ name: "Gear", game: "poe2", parentId: null },
				{ now: 1000, newId },
			);
			return r.ok ? r.library : l;
		});
		await syncOnce(a.ports);
		await syncOnce(b.ports);
		const gearId = b.get().folders[0]?.id ?? "";

		clock.now = 3000;
		a.edit((l) => deleteFolder(l, gearId, 3000));
		b.edit((l) => ({
			...l,
			bookmarks: [
				...l.bookmarks,
				{
					id: "late",
					folderId: gearId,
					name: "Late add",
					game: "poe2",
					league: "Standard",
					live: false,
					order: 0,
					createdAt: 3500,
					updatedAt: 3500,
				},
			],
		}));
		await syncOnce(a.ports);
		await syncOnce(b.ports);
		await syncOnce(a.ports);

		expect(a.get()).toEqual(b.get());
		expect(a.get().folders.map((f) => f.name)).toEqual(["Recovered"]);
		expect(a.get().bookmarks.map((bm) => bm.name)).toEqual(["Late add"]);
	});

	it("writes nothing when nothing changed", async () => {
		const shared = new Map<string, unknown>();
		const clock = { now: 1000 };
		const a = install(shared, clock);
		a.edit(save("Bow", 1000));
		await syncOnce(a.ports);
		const before = { ...a.writes };
		await syncOnce(a.ports);
		expect(a.writes).toEqual(before);
	});

	it("waits instead of merging a half-written remote", async () => {
		const shared = new Map<string, unknown>([
			[META_KEY, { version: 1, chunks: 2, writeId: "new" }],
			[chunkKey(0), "new|AAAA"],
			[chunkKey(1), "old|BBBB"],
		]);
		const a = install(shared, { now: 1 });
		a.edit(save("Bow", 1));
		expect((await syncOnce(a.ports)).state).toBe("waiting");
		expect(a.writes.sync).toBe(0);
	});

	it("replaces a remote that stays half-written, and both machines recover", async () => {
		const shared = new Map<string, unknown>([
			[META_KEY, { version: 1, chunks: 2, writeId: "new" }],
			[chunkKey(0), "new|AAAA"],
			[chunkKey(1), "old|BBBB"],
		]);
		const clock = { now: 1 };
		const a = install(shared, clock);
		const b = install(shared, clock);
		a.edit(save("Bow", 1));
		b.edit(save("Ring", 1));
		expect((await syncOnce(a.ports, { replaceDamaged: true })).state).toBe(
			"on",
		);
		expect((await syncOnce(b.ports)).state).toBe("on");
		expect((await syncOnce(a.ports)).state).toBe("on");
		const names = (lib: Library) => lib.bookmarks.map((x) => x.name).sort();
		expect(names(a.get())).toEqual(["Bow", "Ring"]);
		expect(names(b.get())).toEqual(["Bow", "Ring"]);
	});

	it("treats a meta with a nonsense chunk count as damaged", async () => {
		const shared = new Map<string, unknown>([
			[META_KEY, { version: 1, chunks: 0, writeId: "x" }],
		]);
		const a = install(shared, { now: 1 });
		expect((await syncOnce(a.ports)).state).toBe("waiting");
	});

	it("stops writing when the library outgrows the sync budget, keeping local data", async () => {
		const shared = new Map<string, unknown>();
		const a = install(shared, { now: 1 });
		const noise = (n: number) =>
			Array.from(
				{ length: 400 },
				(_, i) => `${n}-${i}-${Math.random().toString(36)}`,
			).join(" ");
		for (let i = 0; i < 40; i++) a.edit(save(noise(i), 1));
		const status = await syncOnce(a.ports);
		expect(status.state).toBe("quota");
		expect(shared.size).toBe(0);
		expect(a.get().bookmarks).toHaveLength(40);
	});
});
