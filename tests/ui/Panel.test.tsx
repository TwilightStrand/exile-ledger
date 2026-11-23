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
		expect(searchText(await mount())).toBe("No search yet.");
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
		expect(searchText(root)).toBe("Any item · 10000 results");
	});
});
