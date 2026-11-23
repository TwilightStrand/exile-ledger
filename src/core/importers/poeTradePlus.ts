import * as v from "valibot";
import type { Payload } from "../exchange";
import type { Bookmark, Folder } from "../model";
import type { Game } from "../tradeUrl";
import { iconFromBetterTrading } from "./betterTrading";

/**
 * Poe Trade Plus (MIT, read from the published 2.1.1 add-on) has three formats:
 * - folder strings "4:" / "5:" + base64 UTF-8 JSON; locations "game:type:league:slug",
 *   and v5 adds one level of categories inside a folder ("1:"–"3:" match Better Trading);
 * - a bookmark document `{format: "poe-trade-plus", version: 1, game, folders}`;
 * - a full extension backup `{app: "Poe Trade Plus", schema: 3, data: {bookmarks: {poe1, poe2}}}`.
 * Categories become subfolders; realm is dropped because links follow the open page.
 */

const GameSchema = v.picklist(["poe1", "poe2"]);
const LocationType = v.picklist([
	"search",
	"exchange",
	"bulk",
	"live",
	"other",
]);

const DocumentBookmark = v.object({
	title: v.string(),
	categoryId: v.nullable(v.string()),
	position: v.number(),
	location: v.object({
		game: GameSchema,
		type: LocationType,
		league: v.nullable(v.string()),
		slug: v.nullable(v.string()),
	}),
});

const DocumentFolder = v.object({
	id: v.string(),
	title: v.string(),
	position: v.number(),
	icon: v.nullable(v.string()),
	archivedAt: v.nullable(v.string()),
	categories: v.array(
		v.object({ id: v.string(), title: v.string(), position: v.number() }),
	),
	bookmarks: v.array(DocumentBookmark),
});

const DocumentSchema = v.object({
	format: v.literal("poe-trade-plus"),
	version: v.literal(1),
	game: GameSchema,
	folders: v.array(DocumentFolder),
});
type PtpDocument = v.InferOutput<typeof DocumentSchema>;

const ExtensionBackupSchema = v.object({
	app: v.literal("Poe Trade Plus"),
	schema: v.literal(3),
	data: v.object({
		bookmarks: v.object({
			poe1: v.optional(v.unknown()),
			poe2: v.optional(v.unknown()),
		}),
	}),
});

const FolderString = v.object({
	icn: v.nullish(v.string()),
	tit: v.string(),
	ver: v.optional(v.picklist(["1", "2"])),
	cats: v.optional(v.array(v.object({ id: v.string(), tit: v.string() }))),
	trs: v.array(
		v.object({ tit: v.string(), loc: v.string(), cat: v.optional(v.string()) }),
	),
});

function parseJson(text: string | null): unknown {
	if (text === null) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function decodeUtf8Base64(text: string): string | null {
	try {
		const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
		return new TextDecoder("utf-8", { fatal: true }).decode(
			Uint8Array.from(binary, (c) => c.charCodeAt(0)),
		);
	} catch {
		return null;
	}
}

type LocationKind = v.InferOutput<typeof LocationType>;

/** Our trade type and live flag for a location; "other" pages cannot be opened as a search. */
function mapType(
	type: LocationKind,
): { tradeType: "search" | "exchange"; live: boolean } | null {
	if (type === "search") return { tradeType: "search", live: false };
	if (type === "live") return { tradeType: "search", live: true };
	if (type === "exchange" || type === "bulk")
		return { tradeType: "exchange", live: false };
	return null;
}

interface Collected {
	folders: Folder[];
	bookmarks: Bookmark[];
}

function bookmarkFrom(
	id: string,
	folderId: string,
	game: Game,
	title: string,
	league: string | null,
	slug: string | null,
	type: LocationKind,
	order: number,
	now: number,
): Bookmark[] {
	const mapped = mapType(type);
	if (!mapped || !slug) return [];
	return [
		{
			id,
			folderId,
			name: title,
			game,
			league: league ?? "",
			searchId: slug,
			tradeType: mapped.tradeType,
			live: mapped.live,
			order,
			createdAt: now,
			updatedAt: now,
		},
	];
}

function fromDocument(
	doc: PtpDocument,
	prefix: string,
	now: number,
	into: Collected,
): void {
	for (const folder of [...doc.folders].sort(
		(a, b) => a.position - b.position,
	)) {
		const folderId = `${prefix}-${folder.id}`;
		into.folders.push({
			id: folderId,
			parentId: null,
			name: folder.title,
			game: doc.game,
			order: into.folders.filter(
				(f) => f.parentId === null && f.game === doc.game,
			).length,
			archived: folder.archivedAt !== null,
			icon: iconFromBetterTrading(folder.icon),
			updatedAt: now,
		});
		for (const category of folder.categories) {
			into.folders.push({
				id: `${folderId}-cat-${category.id}`,
				parentId: folderId,
				name: category.title,
				game: doc.game,
				order: category.position,
				archived: folder.archivedAt !== null,
				updatedAt: now,
			});
		}
		const categoryIds = new Set(folder.categories.map((c) => c.id));
		for (const [i, b] of folder.bookmarks.entries()) {
			if (b.location.game !== doc.game) continue;
			const home =
				b.categoryId && categoryIds.has(b.categoryId)
					? `${folderId}-cat-${b.categoryId}`
					: folderId;
			into.bookmarks.push(
				...bookmarkFrom(
					`${folderId}-b${i}`,
					home,
					doc.game,
					b.title,
					b.location.league,
					b.location.slug,
					b.location.type,
					b.position,
					now,
				),
			);
		}
	}
}

/** A "4:" or "5:" folder string. */
function parseFolderString(
	text: string,
	index: number,
	now: number,
): Payload | null {
	const match = text.trim().match(/^([45]):(.+)$/s);
	if (!match?.[1] || !match[2]) return null;
	const parsed = v.safeParse(
		FolderString,
		parseJson(decodeUtf8Base64(match[2])),
	);
	if (!parsed.success) return null;
	const data = parsed.output;
	const game: Game = data.ver === "2" ? "poe2" : "poe1";
	const folderId = `ptp-folder-${index}`;
	const folders: Folder[] = [
		{
			id: folderId,
			parentId: null,
			name: data.tit,
			game,
			order: index,
			archived: false,
			icon: iconFromBetterTrading(data.icn),
			updatedAt: now,
		},
		...(data.cats ?? []).map(
			(cat, order): Folder => ({
				id: `${folderId}-cat-${cat.id}`,
				parentId: folderId,
				name: cat.tit,
				game,
				order,
				archived: false,
				updatedAt: now,
			}),
		),
	];
	const categoryIds = new Set((data.cats ?? []).map((c) => c.id));
	const bookmarks = data.trs.flatMap((trade, order) => {
		const [, rawType = "search", league = "", ...slugParts] =
			trade.loc.split(":");
		const type = v.safeParse(LocationType, rawType);
		if (!type.success) return [];
		const home =
			trade.cat && categoryIds.has(trade.cat)
				? `${folderId}-cat-${trade.cat}`
				: folderId;
		return bookmarkFrom(
			`${folderId}-b${order}`,
			home,
			game,
			trade.tit,
			league || null,
			slugParts.join(":") || null,
			type.output,
			order,
			now,
		);
	});
	return { folders, bookmarks };
}

/** Any Poe Trade Plus export we understand, or null. */
export function parsePoeTradePlus(text: string, now: number): Payload | null {
	const trimmed = text.trim();
	const into: Collected = { folders: [], bookmarks: [] };

	if (trimmed.startsWith("{")) {
		const json = parseJson(trimmed);
		const doc = v.safeParse(DocumentSchema, json);
		if (doc.success) {
			fromDocument(doc.output, "ptp", now, into);
			return into;
		}
		const backup = v.safeParse(ExtensionBackupSchema, json);
		if (!backup.success) return null;
		for (const game of ["poe1", "poe2"] satisfies Game[]) {
			const gameDoc = v.safeParse(
				DocumentSchema,
				backup.output.data.bookmarks[game],
			);
			if (gameDoc.success)
				fromDocument(gameDoc.output, `ptp-${game}`, now, into);
		}
		return into.folders.length > 0 ? into : null;
	}

	const lines = trimmed
		.split(/\r?\n/)
		.filter((l) => l.trim() && !/^-+$/.test(l.trim()));
	if (lines.length === 0 || !lines.every((l) => /^[45]:/.test(l.trim())))
		return null;
	for (const [i, line] of lines.entries()) {
		const payload = parseFolderString(line, i, now);
		if (!payload) return null;
		into.folders.push(...payload.folders);
		into.bookmarks.push(...payload.bookmarks);
	}
	return into;
}
