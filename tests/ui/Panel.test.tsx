import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "../../src/core/history";
import { en } from "../../src/core/i18n";
import {
	createMemoryLibrary,
	emptyLibrary,
	type LibrarySource,
	saveSearch,
} from "../../src/core/library";
import type { PinnedItem } from "../../src/core/pins";
import {
	createMemorySettings,
	parseSettings,
	type SettingsSource,
} from "../../src/core/settings";
import { createMemorySource } from "../../src/core/source";
import { THEMES } from "../../src/core/themes";
import { parseSearch } from "../../src/core/tradeApi";
import { parseTradeUrl } from "../../src/core/tradeUrl";
import type { UiState } from "../../src/core/uiState";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { Panel, type PanelProps, type Reserve } from "../../src/ui/Panel";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

const DEFAULT_FOLDER_NAME = en.bookmarks.defaultFolder;

const POE2_PAGE = "https://www.pathofexile.com/trade2/search/poe2/Dawn";

function pageAt(url: string) {
	return () => parseTradeUrl(new URL(url));
}

function capturedFeed() {
	const feed = createCaptureFeed();
	const search = parseSearch(searchRequest, searchResponse);
	if (!search) throw new Error("fixture did not parse");
	feed.push({
		kind: "search",
		game: "poe2",
		realm: "poe2",
		league: "Standard",
		search,
	});
	return feed;
}

let n = 0;
async function mount(overrides: Partial<PanelProps> = {}) {
	const root = document.createElement("div");
	document.body.append(root);
	const props: PanelProps = {
		feed: createCaptureFeed(),
		settings: createMemorySettings(),
		library: createMemoryLibrary(),
		page: pageAt(POE2_PAGE),
		now: () => 1000,
		newId: () => `id${++n}`,
		...overrides,
	};
	await act(async () => {
		render(<Panel {...props} />, root);
	});
	return root;
}

const sideOf = (root: HTMLElement) =>
	root.querySelector("aside")?.getAttribute("data-side");
const searchCard = (root: HTMLElement) =>
	root.querySelector("[data-testid=current-search]");
const button = (root: HTMLElement, label: string) =>
	[...root.querySelectorAll<HTMLButtonElement>("button")].find(
		(b) =>
			b.getAttribute("aria-label") === label || b.textContent?.trim() === label,
	);
const treeText = (root: HTMLElement) =>
	root.querySelector("[role=tabpanel]")?.textContent ?? "";

beforeEach(() => {
	document.body.innerHTML = "";
});

describe("Panel first paint", () => {
	it("paints the stored theme on the first render when settings are passed in", () => {
		const root = document.createElement("div");
		document.body.append(root);
		const settings = createMemorySettings({ theme: "bone" });
		render(
			<Panel
				feed={createCaptureFeed()}
				settings={settings}
				initialSettings={parseSettings({ theme: "bone" })}
				library={createMemoryLibrary()}
				page={pageAt(POE2_PAGE)}
			/>,
			root,
		);
		const aside = root.querySelector("aside");
		expect(aside?.style.getPropertyValue("--color-ledger-panel")).toBe(
			THEMES.bone.colors.panel,
		);
		render(null, root);
	});
});

describe("Panel density", () => {
	it("marks the panel compact so rows shrink, and follows the setting", async () => {
		const settings = createMemorySettings({ compact: true });
		const root = await mount({ settings });
		const aside = root.querySelector("aside");
		expect(aside?.getAttribute("data-density")).toBe("compact");
		await act(() => settings.save({ compact: false }));
		expect(aside?.hasAttribute("data-density")).toBe(false);
	});
});

describe("Panel side", () => {
	it("docks left when nothing is configured", async () => {
		expect(sideOf(await mount())).toBe("left");
	});

	it("uses the stored side and follows changes", async () => {
		const settings: SettingsSource = createMemorySettings({
			panelSide: "right",
		});
		const root = await mount({ settings });
		expect(sideOf(root)).toBe("right");
		await act(() => settings.save({ panelSide: "left" }));
		expect(sideOf(root)).toBe("left");
	});
});

describe("Panel theme", () => {
	const token = (root: HTMLElement, name: string) =>
		root
			.querySelector("aside")
			?.style.getPropertyValue(`--color-ledger-${name}`);

	it("applies the stored theme and follows changes without a reload", async () => {
		const settings = createMemorySettings({ theme: "azure" });
		const root = await mount({ settings });
		expect(token(root, "gold")).toBe(THEMES.azure.colors.gold);
		expect(root.querySelector("aside")?.style.colorScheme).toBe("dark");
		await act(() => settings.save({ theme: "bone" }));
		expect(token(root, "gold")).toBe(THEMES.bone.colors.gold);
		expect(token(root, "panel")).toBe(THEMES.bone.colors.panel);
		expect(root.querySelector("aside")?.style.colorScheme).toBe("light");
	});
});

describe("Panel current search", () => {
	it("works with no search captured", async () => {
		const root = await mount();
		expect(searchCard(root)?.textContent).toContain(
			"Run a search on the trade site",
		);
		expect(treeText(root)).toContain("No bookmarks yet");
	});

	it("shows a captured search", async () => {
		const root = await mount({ feed: capturedFeed() });
		expect(searchCard(root)?.textContent).toContain("Body Armour");
		expect(searchCard(root)?.textContent).toContain("10,000 results");
		expect(
			searchCard(root)?.querySelector("[aria-label='Search problems']"),
		).toBeNull();
	});

	it("warns about a search that cannot match", async () => {
		const feed = createCaptureFeed();
		feed.push({
			kind: "search",
			game: "poe1",
			realm: null,
			league: "Standard",
			search: {
				query: {
					query: {
						type: "Empower Support",
						filters: {
							misc_filters: {
								filters: {
									gem_level: { min: 4 },
									corrupted: { option: "false" },
								},
							},
						},
					},
				},
				searchId: "q1",
				total: 0,
				resultIds: [],
			},
		});
		const root = await mount({ feed });
		const problems = searchCard(root)?.querySelector(
			"[aria-label='Search problems']",
		);
		expect(problems?.textContent).toContain(
			"Empower gems only go above level 3",
		);
	});
});

describe("Panel bookmarks", () => {
	it("saves the current search and lists it", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });

		await act(async () => button(root, "Save search")?.click());

		const stored = await library.load();
		expect(stored.bookmarks).toHaveLength(1);
		expect(stored.bookmarks[0]).toMatchObject({
			name: "Body Armour",
			game: "poe2",
			league: "Standard",
			searchId: searchResponse.id,
		});
		expect(treeText(root)).toContain(DEFAULT_FOLDER_NAME);
		expect(treeText(root)).toContain("Body Armour");
		expect(searchCard(root)?.textContent).toContain("Saved to bookmarks");
		expect(button(root, "Save search")).toBeUndefined();
	});

	it("links to the query in the open page's league", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });
		await act(async () => button(root, "Save search")?.click());

		const href = root.querySelector("nav a")?.getAttribute("href") ?? "";
		const url = new URL(href);
		expect(url.pathname).toBe("/trade2/search/poe2/Dawn");
		expect(JSON.parse(url.searchParams.get("q") ?? "")).toEqual(searchRequest);
	});

	it("shows only the open game's bookmarks", async () => {
		const { library } = saveSearch(
			emptyLibrary(),
			{
				game: "poe1",
				league: "Standard",
				name: "Tabula Rasa",
				query: { query: { name: "Tabula Rasa" } },
				searchId: null,
				live: false,
			},
			{ now: 1, newId: () => `p${++n}` },
		);
		const source: LibrarySource = createMemoryLibrary(library);

		const onPoe2 = await mount({ library: source });
		expect(treeText(onPoe2)).not.toContain("Tabula Rasa");

		const onPoe1 = await mount({
			library: source,
			page: pageAt("https://www.pathofexile.com/trade/search/Standard"),
		});
		expect(treeText(onPoe1)).toContain("Tabula Rasa");
	});

	it("renames a bookmark", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });
		await act(async () => button(root, "Save search")?.click());

		await act(async () => button(root, "Rename Body Armour")?.click());
		const input = root.querySelector<HTMLInputElement>(
			"input[aria-label='Bookmark name']",
		);
		if (!input) throw new Error("no rename field");
		expect(document.activeElement).toBe(input);
		input.value = "Chest upgrades";
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		});

		expect((await library.load()).bookmarks[0]?.name).toBe("Chest upgrades");
		expect(treeText(root)).toContain("Chest upgrades");
	});

	it("collapses a folder and keeps its rows out of the tab order", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });
		await act(async () => button(root, "Save search")?.click());

		const folder = root.querySelector<HTMLButtonElement>(
			"nav button[aria-expanded]",
		);
		await act(async () => folder?.click());
		expect(folder?.getAttribute("aria-expanded")).toBe("false");
		expect(
			folder
				?.closest("li")
				?.querySelector(":scope > div.grid")
				?.hasAttribute("inert"),
		).toBe(true);
	});

	it("deletes a bookmark after confirming", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });
		await act(async () => button(root, "Save search")?.click());

		await act(async () => button(root, "Delete Body Armour")?.click());
		expect(treeText(root)).toContain("Delete “Body Armour”?");
		await act(async () => button(root, "Delete")?.click());

		const stored = await library.load();
		expect(stored.bookmarks).toEqual([]);
		expect(stored.tombstones).toHaveLength(1);
		expect(treeText(root)).not.toContain("Body Armour");
		expect(treeText(root)).toContain(DEFAULT_FOLDER_NAME);
	});
});

describe("Panel folders", () => {
	async function typeName(root: HTMLElement, label: string, name: string) {
		const input = root.querySelector<HTMLInputElement>(
			`input[aria-label='${label}']`,
		);
		if (!input) throw new Error(`no ${label} field`);
		input.value = name;
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		});
	}

	it("creates a folder and a subfolder", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ library });

		await act(async () => button(root, "New folder")?.click());
		await typeName(root, "New folder name", "Gear");
		await act(async () => button(root, "New folder in Gear")?.click());
		await typeName(root, "New folder name", "Rings");

		const { folders } = await library.load();
		const gear = folders.find((f) => f.name === "Gear");
		expect(gear).toMatchObject({ parentId: null, game: "poe2" });
		expect(folders.find((f) => f.name === "Rings")?.parentId).toBe(gear?.id);
		expect(treeText(root)).toContain("Rings");
	});

	it("shows what a folder delete takes with it", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });
		await act(async () => button(root, "Save search")?.click());

		await act(async () =>
			button(root, `Delete ${DEFAULT_FOLDER_NAME}`)?.click(),
		);
		expect(treeText(root)).toContain(
			`Delete “${DEFAULT_FOLDER_NAME}” and its 1 bookmark?`,
		);
		await act(async () => button(root, "Delete")?.click());
		expect(await library.load()).toMatchObject({ folders: [], bookmarks: [] });
	});

	it("archives a folder and restores it", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library });
		await act(async () => button(root, "Save search")?.click());

		await act(async () =>
			button(root, `Archive ${DEFAULT_FOLDER_NAME}`)?.click(),
		);
		expect(root.querySelector("nav")).toBeNull();
		await act(async () =>
			[...root.querySelectorAll("button")]
				.find((b) => b.textContent?.startsWith("Archived"))
				?.click(),
		);
		await act(async () =>
			button(root, `Restore ${DEFAULT_FOLDER_NAME}`)?.click(),
		);
		expect((await library.load()).folders[0]?.archived).toBe(false);
		expect(treeText(root)).toContain("Body Armour");
	});

	it("remembers collapsed folders in the UI state", async () => {
		const uiState = createMemorySource<UiState>({
			collapsed: [],
			panelOpen: true,
		});
		const library = createMemoryLibrary();
		const root = await mount({ feed: capturedFeed(), library, uiState });
		await act(async () => button(root, "Save search")?.click());

		await act(async () =>
			root
				.querySelector<HTMLButtonElement>("nav button[aria-expanded]")
				?.click(),
		);
		const folderId = (await library.load()).folders[0]?.id;
		expect((await uiState.load()).collapsed).toEqual([folderId]);
	});
});

describe("Panel ordering and icons", () => {
	function twoBookmarks() {
		let lib = emptyLibrary();
		for (const name of ["First", "Second"]) {
			lib = saveSearch(
				lib,
				{
					game: "poe2",
					league: "Standard",
					name,
					query: { query: { term: name } },
					searchId: name,
					live: false,
				},
				{ now: 1, newId: () => `k${++n}` },
			).library;
		}
		return createMemoryLibrary(lib);
	}

	it("moves a bookmark down with Alt+ArrowDown", async () => {
		const library = twoBookmarks();
		const root = await mount({ library });
		const first = [...root.querySelectorAll("nav a")].find((a) =>
			a.textContent?.startsWith("First"),
		);
		await act(async () => {
			first?.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "ArrowDown",
					altKey: true,
					bubbles: true,
				}),
			);
		});
		const names = [...root.querySelectorAll("nav a")].map((a) =>
			a.textContent?.replace("PoE2", ""),
		);
		expect(names).toEqual(["Second", "First"]);
		const stored = (await library.load()).bookmarks.sort(
			(a, b) => a.order - b.order,
		);
		expect(stored.map((b) => b.name)).toEqual(["Second", "First"]);
	});

	it("sets a folder icon", async () => {
		const library = twoBookmarks();
		const root = await mount({ library });
		await act(async () =>
			button(root, `Change icon of ${DEFAULT_FOLDER_NAME}`)?.click(),
		);
		await act(async () => button(root, "Ring")?.click());
		expect((await library.load()).folders[0]?.icon).toBe("ring");
		expect(root.querySelector("fieldset")).toBeNull();
	});
});

describe("Panel history", () => {
	const tabButton = (root: HTMLElement, name: string) =>
		[...root.querySelectorAll<HTMLButtonElement>("[role=tab]")].find((t) =>
			t.textContent?.startsWith(name),
		);

	function historySource() {
		const entry = (
			id: string,
			game: HistoryEntry["game"],
			term: string,
			at: number,
		): HistoryEntry => ({
			id,
			game,
			league: "Standard",
			query: { query: { term } },
			searchId: `s-${id}`,
			total: 42,
			at,
		});
		return createMemorySource<HistoryEntry[]>([
			entry("a", "poe2", "Hatungo Garb", 900),
			entry("b", "poe1", "Tabula Rasa", 950),
		]);
	}

	it("lists the open game's searches and saves one as a bookmark", async () => {
		const library = createMemoryLibrary();
		const root = await mount({ library, history: historySource() });
		await act(async () => tabButton(root, "History")?.click());

		expect(treeText(root)).toContain("Hatungo Garb");
		expect(treeText(root)).toContain("42 results");
		expect(treeText(root)).not.toContain("Tabula Rasa");

		await act(async () =>
			button(root, "Save Hatungo Garb as bookmark")?.click(),
		);
		expect((await library.load()).bookmarks.map((b) => b.searchId)).toEqual([
			"s-a",
		]);
		expect(button(root, "Save Hatungo Garb as bookmark")).toBeUndefined();
	});

	it("clears only the open game's history", async () => {
		const history = historySource();
		const root = await mount({ history });
		await act(async () => tabButton(root, "History")?.click());
		await act(async () => button(root, "Clear history")?.click());
		expect((await history.load()).map((h) => h.game)).toEqual(["poe1"]);
		expect(treeText(root)).toContain("No history yet");
	});
});

describe("Panel layout and sharing", () => {
	it("copies a folder's share string", async () => {
		const copies: string[] = [];
		const root = await mount({
			feed: capturedFeed(),
			copyText: async (text) => {
				copies.push(text);
			},
		});
		await act(async () => button(root, "Save search")?.click());
		await act(async () =>
			button(root, `Copy share string for ${DEFAULT_FOLDER_NAME}`)?.click(),
		);
		expect(copies[0]).toMatch(/^EL1:/);
	});

	it("reserves page space only in push mode while open", async () => {
		const reserves: Reserve[] = [];
		const settings = createMemorySettings({
			panelMode: "push",
			panelWidth: 25,
		});
		const root = await mount({ settings, onReserve: (r) => reserves.push(r) });
		expect(reserves.at(-1)).toEqual({
			side: "left",
			width: "clamp(260px, 25vw, 640px)",
		});
		await act(async () => button(root, "Collapse Exile Ledger")?.click());
		expect(reserves.at(-1)).toEqual({ side: "left", width: null });
	});

	it("resizes from the keyboard and remembers the open state", async () => {
		const settings = createMemorySettings();
		const uiState = createMemorySource<UiState>({
			collapsed: [],
			panelOpen: true,
		});
		const root = await mount({ settings, uiState });
		const handle = root.querySelector("[role=separator]");
		const saves = vi.spyOn(settings, "save");
		for (let i = 0; i < 3; i++) {
			await act(async () => {
				handle?.dispatchEvent(
					new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
				);
			});
		}
		expect(handle?.getAttribute("aria-valuenow")).toBe("23");
		await vi.waitFor(async () =>
			expect((await settings.load()).panelWidth).toBe(23),
		);
		expect(saves).toHaveBeenCalledTimes(1);
		await act(async () => button(root, "Collapse Exile Ledger")?.click());
		expect((await uiState.load()).panelOpen).toBe(false);
	});
});

describe("Panel pins", () => {
	it("lists pins, jumps to them and unpins", async () => {
		const pins = createMemorySource<PinnedItem[]>([
			{
				id: "r1",
				name: "Viper Wrap",
				baseType: "Hatungo Garb",
				price: { amount: 2, currency: "divine" },
				pinnedAt: 1,
			},
		]);
		const jumps: string[] = [];
		const root = await mount({
			pins,
			onJumpToPin: (id) => {
				jumps.push(id);
				return false;
			},
		});
		const pinnedTab = [
			...root.querySelectorAll<HTMLButtonElement>("[role=tab]"),
		].find((t) => t.textContent?.startsWith("Pinned"));
		expect(pinnedTab?.textContent).toBe("Pinned1");
		await act(async () => pinnedTab?.click());

		await act(async () =>
			button(root, "Viper Wrap Hatungo Garb2 divine")?.click(),
		);
		expect(jumps).toEqual(["r1"]);
		expect(treeText(root)).toContain("Not on this page any more");

		await act(async () => button(root, "Unpin Viper Wrap")?.click());
		expect(await pins.load()).toEqual([]);
	});
});

describe("Panel tabs and collapse", () => {
	const tab = (root: HTMLElement, name: string) =>
		[...root.querySelectorAll<HTMLButtonElement>("[role=tab]")].find((t) =>
			t.textContent?.startsWith(name),
		);

	it("switches to history", async () => {
		const root = await mount();
		expect(tab(root, "Bookmarks")?.getAttribute("aria-selected")).toBe("true");
		await act(async () => tab(root, "History")?.click());
		expect(treeText(root)).toContain("No history yet");
	});

	it("collapses to an edge tab and expands again", async () => {
		const root = await mount();
		await act(async () => button(root, "Collapse Exile Ledger")?.click());
		expect(root.querySelector("#exile-ledger-panel")).toBeNull();
		await act(async () => button(root, "Expand Exile Ledger")?.click());
		expect(root.querySelector("#exile-ledger-panel")).not.toBeNull();
	});
});
