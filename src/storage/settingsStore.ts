import { storage } from "wxt/utils/storage";
import {
	parseSettings,
	type Settings,
	type SettingsSource,
} from "../core/settings";

// Kept apart from settings.ts because wxt storage needs the extension APIs at
// import time, and previews and tests import settings.ts without them.
// Settings are a few bytes, well under storage.sync's 8 KB per-item limit.
const item = storage.defineItem<unknown>("sync:settings");

async function loadSettings(): Promise<Settings> {
	return parseSettings(await item.getValue());
}

async function saveSettings(patch: Partial<Settings>): Promise<void> {
	await item.setValue({ ...(await loadSettings()), ...patch });
}

function watchSettings(onChange: (settings: Settings) => void): () => void {
	return item.watch((value) => onChange(parseSettings(value)));
}

export const browserSettings: SettingsSource = {
	load: loadSettings,
	save: saveSettings,
	watch: watchSettings,
};
