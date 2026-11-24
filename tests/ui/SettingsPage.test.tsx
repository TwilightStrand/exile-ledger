import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { encodeShare } from "../../src/core/exchange";
import type { HistoryEntry } from "../../src/core/history";
import {
	createMemoryLibrary,
	emptyLibrary,
	saveSearch,
} from "../../src/core/library";
import { createMemorySettings } from "../../src/core/settings";
import { createMemorySource } from "../../src/core/source";
import { OFF_STATUS, type SyncStatus } from "../../src/core/syncEngine";
import { SettingsPage } from "../../src/ui/settings/SettingsPage";

function seededLibrary() {
	let n = 0;
	const { library } = saveSearch(
		emptyLibrary(),
		{
			game: "poe2",
			league: "Standard",
			name: "Garb",
			query: { query: { term: "Garb" } },
			searchId: "g",
			live: false,
		},
		{ now: 1, newId: () => `s${++n}` },
	);
	return library;
}

let grantPricing = true;

async function mount({
	equivalentPricing = false,
	hasAccess = false,
}: {
	equivalentPricing?: boolean;
	hasAccess?: boolean;
} = {}) {
	const settings = createMemorySettings({ equivalentPricing });
	const hasPricingAccess = async () => hasAccess;
	const library = createMemoryLibrary(seededLibrary());
	const history = createMemorySource<HistoryEntry[]>([]);
	const downloads: { name: string; text: string }[] = [];
	const root = document.createElement("div");
	document.body.append(root);
	let n = 0;
	await act(async () => {
		render(
			<SettingsPage
				settings={settings}
				library={library}
				history={history}
				syncStatus={createMemorySource<SyncStatus>({
					...OFF_STATUS,
					state: "on",
					usedBytes: 20480,
					lastSyncAt: Date.UTC(2026, 10, 24) - 120_000,
				})}
				requestPricingAccess={async () => grantPricing}
				hasPricingAccess={hasPricingAccess}
				version="1.2.3"
				download={(name, text) => downloads.push({ name, text })}
				now={() => Date.UTC(2026, 10, 24)}
				newId={() => `new${++n}`}
			/>,
			root,
		);
	});
	return { root, settings, library, downloads };
}

const button = (root: HTMLElement, text: string) =>
	[...root.querySelectorAll("button")].find(
		(b) => b.textContent?.trim() === text,
	);

describe("SettingsPage", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("shows sync state and quota", async () => {
		const { root } = await mount();
		expect(root.textContent).toContain(
			"Synced 2m ago · 20% of sync space used",
		);
	});

	it("turns on equivalent prices only when poe.ninja access is granted", async () => {
		const { root, settings } = await mount();
		const toggle = () =>
			root.querySelector<HTMLButtonElement>(
				"[role=switch][aria-label='Equivalent prices']",
			);
		grantPricing = false;
		await act(async () => toggle()?.click());
		expect((await settings.load()).equivalentPricing).toBe(false);
		expect(root.querySelector("[role=alert]")?.textContent).toContain(
			"need access to poe.ninja",
		);
		grantPricing = true;
		await act(async () => toggle()?.click());
		expect((await settings.load()).equivalentPricing).toBe(true);
	});

	it("shows prices as off when the setting synced from a browser that has access", async () => {
		const { root, settings } = await mount({ equivalentPricing: true });
		const toggle = root.querySelector<HTMLButtonElement>(
			"[role=switch][aria-label='Equivalent prices']",
		);
		expect(toggle?.getAttribute("aria-checked")).toBe("false");
		expect(root.querySelector("[role=alert]")?.textContent).toContain(
			"has not been allowed to read poe.ninja",
		);
		grantPricing = true;
		await act(async () => toggle?.click());
		expect(toggle?.getAttribute("aria-checked")).toBe("true");
		expect(root.querySelector("[role=alert]")).toBeNull();
		expect((await settings.load()).equivalentPricing).toBe(true);
	});

	it("leaves prices on when this browser already has access", async () => {
		const { root } = await mount({ equivalentPricing: true, hasAccess: true });
		expect(
			root
				.querySelector("[role=switch][aria-label='Equivalent prices']")
				?.getAttribute("aria-checked"),
		).toBe("true");
		expect(root.querySelector("[role=alert]")).toBeNull();
	});

	it("changes panel settings", async () => {
		const { root, settings } = await mount();
		const push = root.querySelector<HTMLInputElement>("input[value=push]");
		await act(async () => push?.click());
		const toggle = root.querySelector<HTMLButtonElement>(
			"[role=switch][aria-label='Record searches']",
		);
		await act(async () => toggle?.click());
		expect(await settings.load()).toMatchObject({
			panelMode: "push",
			historyEnabled: false,
		});
	});

	it("saves a backup file and restores it as new folders", async () => {
		const { root, library, downloads } = await mount();
		await act(async () => button(root, "Save backup file")?.click());
		expect(downloads[0]?.name).toBe("exile-ledger-backup-2026-11-24.json");

		const input = root.querySelector<HTMLInputElement>("input[type=file]");
		if (!input) throw new Error("no file input");
		const file = new File([downloads[0]?.text ?? ""], "backup.json", {
			type: "application/json",
		});
		Object.defineProperty(input, "files", { value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event("change"));
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(root.textContent).toContain("1 folder and 1 bookmark");
		await act(async () => button(root, "Import")?.click());

		const stored = await library.load();
		expect(stored.folders).toHaveLength(2);
		expect(stored.bookmarks.map((b) => b.name)).toEqual(["Garb", "Garb"]);
		expect(root.textContent).toContain("Imported 1 folder and 1 bookmark.");
	});

	it("imports a share string and rejects junk without writing", async () => {
		const { root, library } = await mount();
		const area = root.querySelector<HTMLTextAreaElement>("textarea");
		if (!area) throw new Error("no textarea");

		area.value = "garbage that is not an export";
		await act(async () => {
			area.dispatchEvent(new Event("input"));
		});
		await act(async () => button(root, "Read")?.click());
		expect(root.querySelector("[role=alert]")?.textContent).toContain(
			"not an Exile Ledger, Better Trading or Poe Trade Plus export",
		);
		expect((await library.load()).folders).toHaveLength(1);

		const share = encodeShare(seededLibrary(), "s1") ?? "";
		area.value = share;
		await act(async () => {
			area.dispatchEvent(new Event("input"));
		});
		await act(async () => button(root, "Read")?.click());
		await act(async () => button(root, "Import")?.click());
		expect((await library.load()).folders).toHaveLength(2);
	});
});
