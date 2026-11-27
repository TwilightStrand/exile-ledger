import * as v from "valibot";
import type { Payload } from "../exchange";
import type { Bookmark, Folder } from "../model";
import type { Game } from "../tradeUrl";

/**
 * TFT Trade Extension (MIT) export codes: base64 of `{"folders":[...]}`, or
 * of `{"searches":[...]}` from its older builds. Field names follow TFT's
 * exportFolder and importLegacyFolders; anything else in the JSON is ignored.
 */

const TftBookmark = v.looseObject({
	name: v.optional(v.string(), ""),
	endpoint: v.optional(v.string(), ""),
	type: v.optional(v.string()),
	isDone: v.optional(v.boolean(), false),
	poeVersion: v.optional(v.string()),
	league: v.nullish(v.string(), "Auto"),
	idx: v.optional(v.number()),
});

const TftFolder = v.looseObject({
	id: v.string(),
	parentId: v.nullish(v.string(), null),
	name: v.optional(v.string(), ""),
	index: v.optional(v.number(), 0),
	bookmarks: v.optional(v.array(TftBookmark), []),
});

const Current = v.object({ folders: v.array(TftFolder) });

type LegacyFolderData = {
	id?: string | undefined;
	name: string;
	searches: {
		name: string;
		url: string;
		isPoE2: boolean;
		isMarkedDone: boolean;
	}[];
	subFolders: LegacyFolderData[];
};

const LegacyFolder: v.GenericSchema<unknown, LegacyFolderData> = v.looseObject({
	id: v.optional(v.string()),
	name: v.optional(v.string(), ""),
	searches: v.optional(
		v.array(
			v.looseObject({
				name: v.optional(v.string(), ""),
				url: v.optional(v.string(), ""),
				isPoE2: v.optional(v.boolean(), false),
				isMarkedDone: v.optional(v.boolean(), false),
			}),
		),
		[],
	),
	subFolders: v.optional(v.array(v.lazy(() => LegacyFolder)), []),
});

const Legacy = v.object({ searches: v.array(LegacyFolder) });

function decodeBase64(text: string): string | null {
	try {
		const standard = text.replaceAll("-", "+").replaceAll("_", "/");
		const bytes = Uint8Array.from(atob(standard), (c) => c.charCodeAt(0));
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

function parseJson(text: string | null): unknown {
	if (text === null) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/**
 * TFT stores the trade site's search id; older builds a whole URL. A trailing
 * "/live" is the live view of the same search.
 */
function searchOf(
	endpoint: string,
): { searchId: string; live: boolean } | null {
	const parts = endpoint.split(/[/?#]/).filter(Boolean);
	const live = parts.at(-1) === "live";
	const searchId = live ? parts.at(-2) : parts.at(-1);
	return searchId && /^[A-Za-z0-9]+$/.test(searchId)
		? { searchId, live }
		: null;
}

interface Flat {
	id: string;
	parentId: string | null;
	name: string;
	order: number;
	bookmarks: {
		name: string;
		endpoint: string;
		exchange: boolean;
		done: boolean;
		game: Game;
		league: string;
	}[];
}

function flattenLegacy(
	folders: readonly LegacyFolderData[],
	parentId: string | null,
	path: string,
): Flat[] {
	return folders.flatMap((folder, i) => {
		const id = folder.id ?? `${path}${i}`;
		return [
			{
				id,
				parentId,
				name: folder.name,
				order: i,
				bookmarks: folder.searches.map((s) => ({
					name: s.name,
					endpoint: s.url,
					exchange: false,
					done: s.isMarkedDone,
					game: s.isPoE2 ? "poe2" : "poe1",
					league: "Auto",
				})),
			},
			...flattenLegacy(folder.subFolders, id, `${id}-`),
		];
	});
}

function toPayload(flat: readonly Flat[], now: number): Payload {
	// Keyed by position, not by TFT's id: a damaged or hand-edited code can
	// repeat an id, and both folders must survive. A repeated id used as a
	// parent points at the first folder that has it.
	const firstIndex = new Map<string, number>();
	flat.forEach((f, i) => {
		if (!firstIndex.has(f.id)) firstIndex.set(f.id, i);
	});
	const parentIndex = (f: Flat): number | undefined =>
		f.parentId === null ? undefined : firstIndex.get(f.parentId);
	const idOf = (i: number) => `tft-folder-${i}`;
	// Our folders hold one game; a TFT folder takes the game most of its
	// bookmarks have, and an empty one inherits its parent's. The visited set
	// stops a parent cycle in a damaged code.
	const gameOf = new Map<number, Game>();
	const resolve = (i: number, seen: Set<number> = new Set()): Game => {
		const known = gameOf.get(i);
		if (known) return known;
		const f = flat[i];
		if (!f) return "poe1";
		seen.add(i);
		const poe2 = f.bookmarks.filter((b) => b.game === "poe2").length;
		const parent = parentIndex(f);
		const game: Game =
			f.bookmarks.length > 0
				? poe2 * 2 > f.bookmarks.length
					? "poe2"
					: "poe1"
				: parent !== undefined && !seen.has(parent)
					? resolve(parent, seen)
					: "poe1";
		gameOf.set(i, game);
		return game;
	};
	const folders: Folder[] = [];
	const bookmarks: Bookmark[] = [];
	flat.forEach((f, fi) => {
		const game = resolve(fi);
		const folderId = idOf(fi);
		const parent = parentIndex(f);
		const name = f.name || "TFT";
		folders.push({
			id: folderId,
			parentId: parent === undefined ? null : idOf(parent),
			name,
			game,
			order: f.order,
			archived: false,
			updatedAt: now,
		});
		// Bookmarks of the other game get a folder of their own beside this one,
		// under the parent when that is of their game too, so none are lost.
		const other: Game = game === "poe1" ? "poe2" : "poe1";
		const strays = f.bookmarks.filter((b) => b.game === other);
		const strayFolderId = `${folderId}-${other}`;
		if (strays.length > 0)
			folders.push({
				id: strayFolderId,
				parentId:
					parent !== undefined && resolve(parent) === other
						? idOf(parent)
						: null,
				name: `${name} (${other === "poe2" ? "PoE2" : "PoE1"})`,
				game: other,
				order: f.order,
				archived: false,
				updatedAt: now,
			});
		f.bookmarks.forEach((b, order) => {
			const search = searchOf(b.endpoint);
			if (!search) return;
			bookmarks.push({
				id: `tft-${fi}-${order}`,
				folderId: b.game === game ? folderId : strayFolderId,
				name: b.name || search.searchId,
				game: b.game,
				// TFT's "Auto" means the page's league, which an empty league does here too.
				league: b.league === "Auto" ? "" : b.league,
				searchId: search.searchId,
				tradeType: b.exchange ? "exchange" : "search",
				live: search.live,
				...(b.done ? { done: true } : {}),
				order,
				createdAt: now,
				updatedAt: now,
			});
		});
	});
	return { folders, bookmarks };
}

/**
 * Deepest legacy folder nesting read. TFT's own UI nests a handful of levels,
 * and the recursive schema and flattening below use the call stack, so a
 * code nested thousands deep must be refused before either runs.
 */
const MAX_LEGACY_DEPTH = 64;

function legacyTooDeep(json: unknown): boolean {
	if (typeof json !== "object" || json === null || !("searches" in json))
		return false;
	const stack: { value: unknown; depth: number }[] = [
		{ value: json.searches, depth: 1 },
	];
	for (let next = stack.pop(); next; next = stack.pop()) {
		if (!Array.isArray(next.value)) continue;
		if (next.depth > MAX_LEGACY_DEPTH) return true;
		for (const folder of next.value) {
			if (
				typeof folder === "object" &&
				folder !== null &&
				"subFolders" in folder
			)
				stack.push({ value: folder.subFolders, depth: next.depth + 1 });
		}
	}
	return false;
}

export function parseTft(text: string, now: number): Payload | null {
	const json = parseJson(decodeBase64(text.trim()));
	const current = v.safeParse(Current, json);
	if (current.success && current.output.folders.length > 0) {
		return toPayload(
			current.output.folders.map((f) => ({
				id: f.id,
				parentId: f.parentId,
				name: f.name,
				order: f.index,
				bookmarks: [...f.bookmarks]
					.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
					.map((b) => ({
						name: b.name,
						endpoint: b.endpoint,
						exchange: b.type === "exchange",
						done: b.isDone,
						game: b.poeVersion === "Poe2" ? "poe2" : "poe1",
						league: b.league,
					})),
			})),
			now,
		);
	}
	if (legacyTooDeep(json)) return null;
	const legacy = v.safeParse(Legacy, json);
	if (legacy.success && legacy.output.searches.length > 0)
		return toPayload(
			flattenLegacy(legacy.output.searches, null, "legacy-"),
			now,
		);
	return null;
}
