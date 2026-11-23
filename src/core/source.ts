/** A value the UI reads and changes; browser storage in the extension, memory in previews and tests. */
export interface Source<T> {
	load(): Promise<T>;
	update(change: (value: T) => T): Promise<T>;
	watch(onChange: (value: T) => void): () => void;
}

export function createMemorySource<T>(initial: T): Source<T> {
	let current = initial;
	const listeners = new Set<(value: T) => void>();
	return {
		load: async () => current,
		update: async (change) => {
			current = change(current);
			for (const listener of listeners) listener(current);
			return current;
		},
		watch: (onChange) => {
			listeners.add(onChange);
			return () => listeners.delete(onChange);
		},
	};
}
