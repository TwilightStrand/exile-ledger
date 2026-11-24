import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";
import { messagesFor } from "../../core/i18n";
import { NINJA_ORIGIN } from "../../pricing/ratesService";
import { browserHistory } from "../../storage/historyStore";
import { browserLibrary } from "../../storage/libraryStore";
import { browserSettings } from "../../storage/settingsStore";
import { browserSyncStatus } from "../../storage/syncPorts";
import { MessagesProvider } from "../../ui/i18n";
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

const root = document.getElementById("app");
// Loaded before the first render so a light theme does not flash dark.
const initialSettings = await browserSettings.load();
if (root) {
	const t = messagesFor("en");
	document.title = t.settings.pageTitle;
	render(
		<MessagesProvider messages={t}>
			<SettingsPage
				settings={browserSettings}
				initialSettings={initialSettings}
				library={browserLibrary}
				history={browserHistory}
				syncStatus={browserSyncStatus}
				requestPricingAccess={requestPricingAccess}
				hasPricingAccess={hasPricingAccess}
				version={browser.runtime.getManifest().version}
				download={download}
			/>
		</MessagesProvider>,
		root,
	);
}
