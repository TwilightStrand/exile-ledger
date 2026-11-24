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
	const ids = new Map(flat.map((f, i) => [f.id, `tft-folder-${i}`]));
	const byId = new Map(flat.map((f) => [f.id, f]));
	// Our folders hold one game; a TFT folder takes the game most of its
	// bookmarks have, and an empty one inherits its parent's. The visited set
	// stops a parent cycle in a damaged code.
	const gameOf = new Map<string, Game>();
	const resolve = (f: Flat, seen: Set<string> = new Set()): Game => {
		const known = gameOf.get(f.id);
		if (known) return known;
		seen.add(f.id);
		const poe2 = f.bookmarks.filter((b) => b.game === "poe2").length;
		const parent = f.parentId ? byId.get(f.parentId) : undefined;
		const game: Game =
			f.bookmarks.length > 0
				? poe2 * 2 > f.bookmarks.length
					? "poe2"
					: "poe1"
				: parent && !seen.has(parent.id)
					? resolve(parent, seen)
					: "poe1";
		gameOf.set(f.id, game);
		return game;
	};
	const folders: Folder[] = [];
	const bookmarks: Bookmark[] = [];
	flat.forEach((f, fi) => {
		const game = resolve(f);
		const folderId = ids.get(f.id) ?? f.id;
		const parent = f.parentId ? byId.get(f.parentId) : undefined;
		const name = f.name || "TFT";
		folders.push({
			id: folderId,
			parentId: parent ? (ids.get(parent.id) ?? null) : null,
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
					parent && resolve(parent) === other
						? (ids.get(parent.id) ?? null)
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
	const legacy = v.safeParse(Legacy, json);
	if (legacy.success && legacy.output.searches.length > 0)
		return toPayload(
			flattenLegacy(legacy.output.searches, null, "legacy-"),
			now,
		);
	return null;
}
