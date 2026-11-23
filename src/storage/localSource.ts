import { storage } from "wxt/utils/storage";
import type { Source } from "../core/source";

/** A storage.local key read through a parser, so stored data is validated on every load. */
export function localSource<T>(
	key: `local:${string}`,
	parse: (raw: unknown) => T,
): Source<T> {
	const item = storage.defineItem<unknown>(key);
	return {
		load: async () => parse(await item.getValue()),
		update: async (change) => {
			const next = change(parse(await item.getValue()));
			await item.setValue(next);
			return next;
		},
		watch: (onChange) => item.watch((value) => onChange(parse(value))),
	};
}
