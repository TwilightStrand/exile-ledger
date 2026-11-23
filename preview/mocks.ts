import type { HistoryEntryView, TreeNodeView } from "../src/ui/viewModels";

const href = "#";

export const MOCK_BOOKMARKS: TreeNodeView[] = [
	{
		kind: "folder",
		id: "f1",
		name: "Lightning Arrow Deadeye",
		children: [
			{
				kind: "folder",
				id: "f1a",
				name: "Gear upgrades",
				children: [
					{
						kind: "bookmark",
						id: "b1",
						title: "Bow: 450+ pDPS, +2 arrows",
						game: "poe2",
						league: "Standard",
						live: true,
						href,
					},
					{
						kind: "bookmark",
						id: "b2",
						title: "Body Armour: 200+ life, res",
						game: "poe2",
						league: "Standard",
						live: false,
						href,
					},
					{
						kind: "bookmark",
						id: "b3",
						title: "Ring: life, attack speed",
						game: "poe2",
						league: "Standard",
						live: false,
						href,
					},
				],
			},
			{
				kind: "folder",
				id: "f1b",
				name: "Jewels",
				children: [
					{
						kind: "bookmark",
						id: "b4",
						title: "Time-Lost Diamond",
						game: "poe2",
						league: "Standard",
						live: false,
						href,
					},
				],
			},
			{
				kind: "bookmark",
				id: "b5",
				title: "Quiver: +1 arrow",
				game: "poe2",
				league: "Standard",
				live: true,
				href,
			},
		],
	},
	{
		kind: "folder",
		id: "f2",
		name: "Flipping",
		children: [
			{
				kind: "bookmark",
				id: "b6",
				title: "Divine Orb bulk",
				game: "poe1",
				league: "Mercenaries",
				live: false,
				href,
			},
			{
				kind: "bookmark",
				id: "b7",
				title: "Mageblood under 140 div",
				game: "poe1",
				league: "Mercenaries",
				live: true,
				href,
			},
		],
	},
	{
		kind: "bookmark",
		id: "b8",
		title: "Tabula Rasa",
		game: "poe1",
		league: "Standard",
		live: false,
		href,
	},
];

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
