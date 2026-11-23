import { browser } from "wxt/browser";
import { mergeLibraries } from "../core/merge";
import { parseSyncStatus, type SyncPorts } from "../core/syncEngine";
import { browserLibrary } from "./libraryStore";
import { localSource } from "./localSource";

export const browserSyncStatus = localSource(
	"local:syncStatus",
	parseSyncStatus,
);

export const browserSyncPorts: SyncPorts = {
	readLocal: () => browserLibrary.load(),
	// Merged again with whatever is stored now, so an edit made while the sync
	// pass ran is kept rather than overwritten.
	writeLocal: async (library) => {
		await browserLibrary.update((current) =>
			mergeLibraries(current, library, Date.now()),
		);
	},
	readSync: () => browser.storage.sync.get(null),
	writeSync: (items) => browser.storage.sync.set(items),
	removeSync: (keys) => browser.storage.sync.remove(keys),
	now: Date.now,
	newWriteId: () => crypto.randomUUID().slice(0, 8),
};
