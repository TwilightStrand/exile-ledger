import * as v from "valibot";
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

const StoredSchema = v.record(v.string(), v.unknown());

/**
 * Writes over the stored object rather than replacing it, so settings a newer
 * version added on another machine survive a save from this one.
 */
async function saveSettings(patch: Partial<Settings>): Promise<void> {
	const raw = await item.getValue();
	const stored = v.safeParse(StoredSchema, raw);
	await item.setValue({
		...(stored.success ? stored.output : {}),
		...parseSettings(raw),
		...patch,
	});
}

function watchSettings(onChange: (settings: Settings) => void): () => void {
	return item.watch((value) => onChange(parseSettings(value)));
}

export const browserSettings: SettingsSource = {
	load: loadSettings,
	save: saveSettings,
	watch: watchSettings,
};
