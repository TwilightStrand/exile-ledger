import type { Bookmark, Folder, Library } from "../src/core/model";
import type { HistoryEntryView } from "../src/ui/viewModels";

const href = "#";

function folder(
	id: string,
	name: string,
	game: Folder["game"],
	parentId: string | null,
	order: number,
): Folder {
	return { id, parentId, name, game, order, archived: false, updatedAt: 0 };
}

function bookmark(
	id: string,
	folderId: string,
	name: string,
	game: Bookmark["game"],
	league: string,
	order: number,
	live = false,
): Bookmark {
	return {
		id,
		folderId,
		name,
		game,
		league,
		query: { query: { term: name } },
		searchId: `mock-${id}`,
		live,
		order,
		createdAt: 0,
		updatedAt: 0,
	};
}

export const MOCK_LIBRARY: Library = {
	folders: [
		folder("f1", "Lightning Arrow Deadeye", "poe2", null, 0),
		folder("f1a", "Gear upgrades", "poe2", "f1", 0),
		folder("f1b", "Jewels", "poe2", "f1", 1),
		folder("f3", "Saved searches", "poe2", null, 1),
		folder("f2", "Flipping", "poe1", null, 0),
		folder("f4", "Saved searches", "poe1", null, 1),
	],
	bookmarks: [
		bookmark(
			"b1",
			"f1a",
			"Bow: 450+ pDPS, +2 arrows",
			"poe2",
			"Standard",
			0,
			true,
		),
		bookmark("b2", "f1a", "Body Armour: 200+ life, res", "poe2", "Standard", 1),
		bookmark("b3", "f1a", "Ring: life, attack speed", "poe2", "Standard", 2),
		bookmark("b4", "f1b", "Time-Lost Diamond", "poe2", "Standard", 0),
		bookmark("b5", "f1", "Quiver: +1 arrow", "poe2", "Standard", 0, true),
		bookmark("b9", "f3", "Body Armour", "poe2", "Standard", 0),
		bookmark("b6", "f2", "Divine Orb bulk", "poe1", "Mercenaries", 0),
		bookmark(
			"b7",
			"f2",
			"Mageblood under 140 div",
			"poe1",
			"Mercenaries",
			1,
			true,
		),
		bookmark("b8", "f4", "Tabula Rasa", "poe1", "Standard", 0),
	],
	tombstones: [],
};

const NOW = Date.UTC(2026, 10, 23, 18, 0);
export const MOCK_NOW = () => NOW;

export const MOCK_HISTORY: HistoryEntryView[] = [
	{
		id: "h1",
		title: "Body Armour",
		game: "poe2",
		league: "Standard",
		at: NOW - 2 * 60_000,
		href,
	},
	{
		id: "h2",
		title: "Viper Wrap Hatungo Garb",
		game: "poe2",
		league: "Standard",
		at: NOW - 40 * 60_000,
		href,
	},
	{
		id: "h3",
		title: "Mageblood Heavy Belt",
		game: "poe1",
		league: "Mercenaries",
		at: NOW - 5 * 3_600_000,
		href,
	},
	{
		id: "h4",
		title: "Any Jewel",
		game: "poe1",
		league: "Mercenaries",
		at: NOW - 28 * 3_600_000,
		href,
	},
	{
		id: "h5",
		title: "Headhunter Leather Belt",
		game: "poe1",
		league: "Standard",
		at: NOW - 9 * 86_400_000,
		href,
	},
];
