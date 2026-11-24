import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";
import {
	type LanguageSetting,
	messagesFor,
	resolveLocale,
} from "../../core/i18n";
import { TRADE_ORIGINS } from "../../core/sites";
import { NINJA_ORIGIN } from "../../pricing/ratesService";
import { browserHistory } from "../../storage/historyStore";
import { browserLibrary } from "../../storage/libraryStore";
import { browserSettings } from "../../storage/settingsStore";
import { browserSyncStatus } from "../../storage/syncPorts";
import { browserWatchers } from "../../storage/watcherStore";
import { browserLanguages, SettingsMessages } from "../../ui/i18n";
import { SettingsPage } from "../../ui/settings/SettingsPage";

function download(filename: string, text: string) {
	const url = URL.createObjectURL(
		new Blob([text], { type: "application/json" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	// Revoked on the next tick: Firefox cancels the download if the URL dies during the click.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

const requestPricingAccess = () =>
	browser.permissions.request({ origins: [NINJA_ORIGIN] });
const hasPricingAccess = () =>
	browser.permissions.contains({ origins: [NINJA_ORIGIN] });

const requestTradeAccess = () =>
	browser.permissions.request({ origins: TRADE_ORIGINS });
const hasTradeAccess = () =>
	browser.permissions.contains({ origins: TRADE_ORIGINS });

const requestNotifications = () =>
	browser.permissions.request({ permissions: ["notifications"] });

const root = document.getElementById("app");
// Loaded before the first render so a light theme does not flash dark.
const initialSettings = await browserSettings.load();
if (root) {
	const title = (language: LanguageSetting) => {
		document.title = messagesFor(
			resolveLocale(language, browserLanguages()),
		).settings.pageTitle;
	};
	title(initialSettings.language);
	browserSettings.watch((prefs) => title(prefs.language));
	render(
		<SettingsMessages
			settings={browserSettings}
			initial={initialSettings.language}
		>
			<SettingsPage
				settings={browserSettings}
				initialSettings={initialSettings}
				library={browserLibrary}
				history={browserHistory}
				syncStatus={browserSyncStatus}
				requestPricingAccess={requestPricingAccess}
				hasPricingAccess={hasPricingAccess}
				requestTradeAccess={requestTradeAccess}
				hasTradeAccess={hasTradeAccess}
				requestNotifications={requestNotifications}
				watchers={browserWatchers}
				version={browser.runtime.getManifest().version}
				download={download}
			/>
		</SettingsMessages>,
		root,
	);
}
