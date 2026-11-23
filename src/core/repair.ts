import type { Folder } from "./model";
import { MAX_DEPTH } from "./tree";

/**
 * Makes any folder list a valid tree: a folder whose parent is missing, or
 * that sits in a cycle, moves to the root; folders deeper than MAX_DEPTH
 * move up to sit at level 5. Imports and sync merges can produce
 * all three, and the panel must never loop or hide a folder.
 */
export function repairTree(folders: Folder[]): Folder[] {
	const byId = new Map(folders.map((f) => [f.id, f]));
	const parent = new Map<string, string | null>();

	for (const f of folders) {
		let p = f.parentId;
		if (p !== null && (!byId.has(p) || byId.get(p)?.game !== f.game)) p = null;
		parent.set(f.id, p);
	}

	// Break cycles: walk up from each folder; meeting itself means a loop.
	for (const f of folders) {
		const seen = new Set<string>([f.id]);
		let p = parent.get(f.id) ?? null;
		while (p !== null) {
			if (seen.has(p)) {
				parent.set(f.id, null);
				break;
			}
			seen.add(p);
			p = parent.get(p) ?? null;
		}
	}

	const chain = (id: string): string[] => {
		const ids: string[] = [];
		let current: string | null = id;
		while (current !== null) {
			ids.unshift(current);
			current = parent.get(current) ?? null;
		}
		return ids;
	};

	return folders.map((f) => {
		const path = chain(f.id);
		let p = parent.get(f.id) ?? null;
		// path[MAX_DEPTH - 2] is the level-4 ancestor; its children sit at level 5.
		if (path.length > MAX_DEPTH) p = path[MAX_DEPTH - 2] ?? null;
		return p === f.parentId ? f : { ...f, parentId: p };
	});
}
