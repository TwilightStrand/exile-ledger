import { storage } from "wxt/utils/storage";
import { type LibrarySource, parseLibrary } from "../core/library";

// Local for now; the sync adapter (Task 11) mirrors this into storage.sync.
const item = storage.defineItem<unknown>("local:library");

export const browserLibrary: LibrarySource = {
	load: async () => parseLibrary(await item.getValue()),
	update: async (change) => {
		const next = change(parseLibrary(await item.getValue()));
		await item.setValue(next);
		return next;
	},
	watch: (onChange) => item.watch((value) => onChange(parseLibrary(value))),
};
