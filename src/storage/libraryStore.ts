import * as v from "valibot";
import { browser } from "wxt/browser";
import { type LibrarySource, parseLibrary } from "../core/library";
import { mergeLibraries } from "../core/merge";
import { LibraryWriteSchema } from "../core/messages";
import type { Library } from "../core/model";
import { localSource } from "./localSource";

const stored = localSource("local:library", parseLibrary);

let queue: Promise<unknown> = Promise.resolve();

/**
 * Background only. Each write is merged into the copy stored at that moment,
 * and writes run one after another. A read-modify-write in each tab would
 * let two tabs (or a tab and the sync pass) overwrite each other's edits.
 * Entries are last-write-wins per id with tombstones, so the merge keeps both.
 */
export function writeLibrary(mine: Library): Promise<Library> {
	const run = queue.then(() =>
		stored.update((latest) => mergeLibraries(latest, mine, Date.now())),
	);
	queue = run.catch(() => {});
	return run;
}

/** Background only: accepts library writes from tabs and extension pages. */
export function listenForLibraryWrites(): () => void {
	// sendResponse plus `return true` is the async reply form every supported
	// Chrome and Firefox accepts; returning a promise is not.
	const listener = (
		message: unknown,
		_sender: unknown,
		sendResponse: (ok: boolean) => void,
	) => {
		const request = v.safeParse(LibraryWriteSchema, message);
		if (!request.success) return undefined;
		writeLibrary(parseLibrary(request.output.library)).then(
			() => sendResponse(true),
			() => sendResponse(false),
		);
		return true;
	};
	browser.runtime.onMessage.addListener(listener);
	return () => browser.runtime.onMessage.removeListener(listener);
}

/**
 * For tabs and extension pages. Never call `update` from the background: a
 * context does not receive its own runtime messages, so it would fail there.
 * The background uses `writeLibrary` directly.
 */
export const browserLibrary: LibrarySource = {
	load: stored.load,
	watch: stored.watch,
	update: async (change) => {
		const next = change(await stored.load());
		const ok: unknown = await browser.runtime.sendMessage({
			type: "exile-ledger:library-write",
			library: next,
		});
		if (ok !== true) throw new Error("Saving bookmarks failed.");
		return next;
	},
};
