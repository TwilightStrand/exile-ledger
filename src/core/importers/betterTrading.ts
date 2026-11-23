import * as v from "valibot";
import type { Payload } from "../exchange";
import type { Bookmark, Folder, FolderIcon } from "../model";
import type { Game } from "../tradeUrl";

/**
 * Better Trading (exile-center/better-trading, MIT) export strings:
 * v1 is bare base64 of Latin-1 JSON; v2 and v3 prefix "2:" / "3:" and encode
 * UTF-8. v3 adds the trade site version ("1" PoE1, "2" PoE2) to the folder and
 * to each location ("ver:type:slug"); older locations are "type:slug".
 * A backup is one folder string per line, archived folders after SECTION.
 */
const SECTION = "\n--------------------\n";

const FolderSchema = v.object({
	icn: v.nullish(v.string()),
	tit: v.string(),
	ver: v.optional(v.picklist(["1", "2"])),
	trs: v.array(v.object({ tit: v.string(), loc: v.string() })),
});

function decodeBase64(text: string, utf8: boolean): string | null {
	try {
		const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
		if (!utf8) return binary;
		return new TextDecoder("utf-8", { fatal: true }).decode(
			Uint8Array.from(binary, (c) => c.charCodeAt(0)),
		);
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

// Better Trading's icons are currencies and ascendancies; map them onto our smaller set.
const BOW_CLASSES = ["deadeye", "raider", "pathfinder", "ritualist", "amazon"];
const CURRENCY = [
	"alchemy",
	"chaos",
	"exalt",
	"divine",
	"mirror",
	"annul",
	"augment",
	"chance",
	"regal",
	"transmute",
	"vaal",
	"wisdom",
	"artificer",
	"gemcutter",
	"glassblower",
];

export function iconFromBetterTrading(
	icon: string | null | undefined,
): FolderIcon {
	if (!icon) return "folder";
	const name = icon.replace(/^poe2-/, "");
	if (CURRENCY.includes(name)) return "coin";
	if (name === "map" || name === "waystone") return "map";
	if (name === "essence" || name === "fossil" || name === "rune") return "gem";
	if (name === "card" || name === "scarab") return "star";
	if (BOW_CLASSES.includes(name)) return "bow";
	return "sword";
}

interface Location {
	game: Game;
	type: "search" | "exchange";
	slug: string;
}

function parseLocation(
	loc: string,
	versioned: boolean,
	folderGame: Game,
): Location | null {
	const parts = loc.split(":");
	const [ver, type, slug] = versioned ? parts : ["1", ...parts];
	if ((type !== "search" && type !== "exchange") || !slug) return null;
	const game: Game = versioned ? (ver === "2" ? "poe2" : "poe1") : folderGame;
	return { game, type, slug };
}

/** One folder string, or null when it is not a Better Trading export. */
function parseFolderString(
	text: string,
	archived: boolean,
	index: number,
	now: number,
): Payload | null {
	const trimmed = text.trim();
	const version = trimmed.startsWith("3:")
		? 3
		: trimmed.startsWith("2:")
			? 2
			: 1;
	const body = version === 1 ? trimmed : trimmed.slice(2);
	const parsed = v.safeParse(
		FolderSchema,
		parseJson(decodeBase64(body, version >= 2)),
	);
	if (!parsed.success) return null;

	const data = parsed.output;
	const game: Game = data.ver === "2" ? "poe2" : "poe1";
	const folder: Folder = {
		id: `bt-folder-${index}`,
		parentId: null,
		name: data.tit,
		game,
		order: index,
		archived,
		icon: iconFromBetterTrading(data.icn),
		updatedAt: now,
	};
	const bookmarks = data.trs.flatMap((trade, order): Bookmark[] => {
		const location = parseLocation(trade.loc, version >= 3, game);
		if (!location || location.game !== game) return [];
		return [
			{
				id: `bt-${index}-${order}`,
				folderId: folder.id,
				name: trade.tit,
				game,
				league: "",
				searchId: location.slug,
				tradeType: location.type,
				live: false,
				order,
				createdAt: now,
				updatedAt: now,
			},
		];
	});
	return { folders: [folder], bookmarks };
}

/** A single export string or a full backup (several lines, archived after the separator). */
export function parseBetterTrading(text: string, now: number): Payload | null {
	const [active = "", archived = ""] = text
		.replaceAll("\r\n", "\n")
		.split(SECTION);
	const lines = [
		...active.split("\n").map((line) => ({ line, archived: false })),
		...archived.split("\n").map((line) => ({ line, archived: true })),
	].filter(({ line }) => line.trim());

	const payloads = lines.map(({ line, archived: isArchived }, i) =>
		parseFolderString(line, isArchived, i, now),
	);
	if (payloads.length === 0 || payloads.some((p) => p === null)) return null;
	return {
		folders: payloads.flatMap((p) => p?.folders ?? []),
		bookmarks: payloads.flatMap((p) => p?.bookmarks ?? []),
	};
}
