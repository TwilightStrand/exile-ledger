import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMemoryLibrary,
	emptyLibrary,
	saveSearch,
} from "../../src/core/library";
import type { PinnedItem } from "../../src/core/pins";
import { createMemorySettings } from "../../src/core/settings";
import { createMemorySource } from "../../src/core/source";
import { parseFetchResponse, parseSearch } from "../../src/core/tradeApi";
import { parseTradeUrl } from "../../src/core/tradeUrl";
import type { UiState } from "../../src/core/uiState";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { Panel, type PanelProps } from "../../src/ui/Panel";
import fetchResponse from "../fixtures/trade/poe2-fetch-response.json";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

// Every bookmark row draws one GameTag, so its render count is the number of
// rows that re-rendered.
const tagRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock("../../src/ui/parts", async (importOriginal) => {
	const parts = await importOriginal<typeof import("../../src/ui/parts")>();
	return {
		...parts,
		GameTag: (props: Parameters<typeof parts.GameTag>[0]) => {
			tagRenders.count++;
			return parts.GameTag(props);
		},
	};
});

const PAGE = "https://www.pathofexile.com/trade2/search/poe2/Standard";

function library(count: number) {
	let lib = emptyLibrary();
	let n = 0;
	for (let i = 0; i < count; i++) {
		lib = saveSearch(
			lib,
			{
				game: "poe2",
				league: "Standard",
				name: `Bookmark ${i}`,
				query: { query: { term: `b${i}` } },
				searchId: `s${i}`,
				live: false,
			},
			{ now: 1, newId: () => `k${++n}` },
		).library;
	}
	return createMemoryLibrary(lib);
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
	return { feed, searchId: search.searchId };
}

async function mount(overrides: Partial<PanelProps>) {
	const root = document.createElement("div");
	document.body.append(root);
	const props: PanelProps = {
		feed: createCaptureFeed(),
		settings: createMemorySettings(),
		library: createMemoryLibrary(),
		page: () => parseTradeUrl(new URL(PAGE)),
		now: () => 1000,
		newId: () => crypto.randomUUID(),
		...overrides,
	};
	await act(async () => {
		render(<Panel {...props} />, root);
	});
	return root;
}

const rowLinks = (root: HTMLElement) => [
	...root.querySelectorAll<HTMLElement>("nav a"),
];

beforeEach(() => {
	document.body.innerHTML = "";
	tagRenders.count = 0;
});

describe("Panel render work", () => {
	it("does not re-render for captured results, only for a new search", async () => {
		const { feed, searchId } = capturedFeed();
		const root = await mount({ feed, library: library(20) });
		expect(rowLinks(root)).toHaveLength(20);
		const items = parseFetchResponse(fetchResponse) ?? [];
		tagRenders.count = 0;
		for (let i = 0; i < 5; i++) {
			await act(async () => {
				feed.push({ kind: "results", game: "poe2", queryId: searchId, items });
			});
		}
		expect(tagRenders.count).toBe(0);
	});

	it("leaves bookmark rows alone when something else in the panel changes", async () => {
		const pins = createMemorySource<PinnedItem[]>([]);
		const root = await mount({ library: library(20), pins });
		expect(rowLinks(root)).toHaveLength(20);
		tagRenders.count = 0;
		await act(async () => {
			await pins.update(() => [
				{ id: "p", name: "", baseType: "Ring", price: null, pinnedAt: 1 },
			]);
		});
		expect(tagRenders.count).toBe(0);
	});

	it("keeps collapsed folders' rows out of the DOM and brings them back on expand", async () => {
		const lib = library(3);
		const folderId = (await lib.load()).folders[0]?.id ?? "";
		const uiState = createMemorySource<UiState>({
			collapsed: [folderId],
			panelOpen: true,
		});
		const root = await mount({ library: lib, uiState });
		expect(rowLinks(root)).toHaveLength(0);
		await act(async () =>
			root
				.querySelector<HTMLButtonElement>("nav button[aria-expanded]")
				?.click(),
		);
		expect(rowLinks(root)).toHaveLength(3);
	});

	it("unmounts a collapsed folder's rows once the close transition is over", async () => {
		const root = await mount({ library: library(3) });
		expect(rowLinks(root)).toHaveLength(3);
		await act(async () =>
			root
				.querySelector<HTMLButtonElement>("nav button[aria-expanded]")
				?.click(),
		);
		expect(rowLinks(root)).toHaveLength(3);
		await act(() => new Promise((r) => setTimeout(r, 300)));
		expect(rowLinks(root)).toHaveLength(0);
	});

	it("re-renders only the rows a drag touches", async () => {
		const root = await mount({ library: library(20) });
		const rows = rowLinks(root).map((a) => a.parentElement);
		const [first, second] = rows;
		if (!first || !second) throw new Error("no rows");
		tagRenders.count = 0;
		await act(async () => {
			first.dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
		});
		await act(async () => {
			second.dispatchEvent(new DragEvent("dragover", { bubbles: true }));
		});
		expect(second.className).toContain("box-shadow");
		expect(first.className).toContain("opacity-40");
		// The dragged row and the row under the pointer; not all twenty.
		expect(tagRenders.count).toBe(2);
	});
});
