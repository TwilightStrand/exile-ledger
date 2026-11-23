import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createMemoryLibrary,
	DEFAULT_FOLDER_NAME,
	emptyLibrary,
	type LibrarySource,
	saveSearch,
} from "../../src/core/library";
import {
	createMemorySettings,
	type SettingsSource,
} from "../../src/core/settings";
import { parseSearch } from "../../src/core/tradeApi";
import { parseTradeUrl } from "../../src/core/tradeUrl";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { Panel, type PanelProps } from "../../src/ui/Panel";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

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
		expect(treeText(root)).toContain("No bookmarks yet");
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
