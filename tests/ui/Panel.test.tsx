import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createMemorySettings,
	type SettingsSource,
} from "../../src/core/settings";
import { parseSearch } from "../../src/core/tradeApi";
import { createCaptureFeed } from "../../src/trade/captureFeed";
import { Panel } from "../../src/ui/Panel";
import searchRequest from "../fixtures/trade/poe2-search-request.json";
import searchResponse from "../fixtures/trade/poe2-search-response.json";

async function mount(
	settings: SettingsSource = createMemorySettings(),
	feed = createCaptureFeed(),
) {
	const root = document.createElement("div");
	document.body.append(root);
	await act(async () => {
		render(<Panel feed={feed} settings={settings} />, root);
	});
	return root;
}

const sideOf = (root: HTMLElement) =>
	root.querySelector("aside")?.getAttribute("data-side");
const searchText = (root: HTMLElement) =>
	root.querySelector("[data-testid=current-search]")?.textContent;

describe("Panel", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("docks left when nothing is configured", async () => {
		expect(sideOf(await mount())).toBe("left");
	});

	it("uses the stored side and follows changes", async () => {
		const settings = createMemorySettings({ panelSide: "right" });
		const root = await mount(settings);
		expect(sideOf(root)).toBe("right");

		await act(() => settings.save({ panelSide: "left" }));
		expect(sideOf(root)).toBe("left");
	});

	it("works with no search captured", async () => {
		expect(searchText(await mount())).toContain(
			"Run a search on the trade site",
		);
	});

	it("shows a captured search", async () => {
		const feed = createCaptureFeed();
		const root = await mount(undefined, feed);
		const search = parseSearch(searchRequest, searchResponse);
		if (!search) throw new Error("fixture did not parse");
		await act(() => {
			feed.push({
				kind: "search",
				game: "poe2",
				realm: "poe2",
				league: "Standard",
				search,
			});
		});
		expect(searchText(root)).toContain("Body Armour");
		expect(searchText(root)).toContain("10,000 results");
	});
});

describe("Panel tabs and collapse", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	const tab = (root: HTMLElement, name: string) =>
		[...root.querySelectorAll<HTMLButtonElement>("[role=tab]")].find((t) =>
			t.textContent?.startsWith(name),
		);

	it("shows bookmarks with counts and switches to history", async () => {
		const root = document.createElement("div");
		document.body.append(root);
		await act(async () => {
			render(
				<Panel
					feed={createCaptureFeed()}
					settings={createMemorySettings()}
					bookmarks={[
						{
							kind: "folder",
							id: "f",
							name: "Gear",
							children: [
								{
									kind: "bookmark",
									id: "b",
									title: "Bow",
									game: "poe2",
									league: "Standard",
									live: true,
									href: "#",
								},
							],
						},
					]}
					history={[]}
				/>,
				root,
			);
		});
		expect(tab(root, "Bookmarks")?.getAttribute("aria-selected")).toBe("true");
		expect(tab(root, "Bookmarks")?.textContent).toBe("Bookmarks1");
		expect(root.querySelector("nav")?.textContent).toContain("Bow");

		await act(async () => tab(root, "History")?.click());
		expect(root.querySelector("[role=tabpanel]")?.textContent).toContain(
			"No history yet",
		);
	});

	it("collapses to an edge tab and expands again", async () => {
		const root = await mount();
		const button = (label: string) =>
			root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

		await act(async () => button("Collapse Exile Ledger")?.click());
		expect(root.querySelector("#exile-ledger-panel")).toBeNull();
		await act(async () => button("Expand Exile Ledger")?.click());
		expect(root.querySelector("#exile-ledger-panel")).not.toBeNull();
	});
});
