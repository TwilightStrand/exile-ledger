import { browser } from "wxt/browser";
import { parseSyncStatus, type SyncPorts } from "../core/syncEngine";
import { browserLibrary, writeLibrary } from "./libraryStore";
import { localSource } from "./localSource";

export const browserSyncStatus = localSource(
	"local:syncStatus",
	parseSyncStatus,
);

export const browserSyncPorts: SyncPorts = {
	readLocal: () => browserLibrary.load(),
	// Through the same queue as tab edits, so an edit made while the sync pass
	// ran is merged in rather than overwritten.
	writeLocal: async (library) => {
		await writeLibrary(library);
	},
	readSync: () => browser.storage.sync.get(null),
	writeSync: (items) => browser.storage.sync.set(items),
	removeSync: (keys) => browser.storage.sync.remove(keys),
	now: Date.now,
	newWriteId: () => crypto.randomUUID().slice(0, 8),
};
