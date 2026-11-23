import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";
import { NINJA_ORIGIN } from "../../pricing/ratesService";
import { browserHistory } from "../../storage/historyStore";
import { browserLibrary } from "../../storage/libraryStore";
import { browserSettings } from "../../storage/settingsStore";
import { browserSyncStatus } from "../../storage/syncPorts";
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

const root = document.getElementById("app");
if (root) {
	render(
		<SettingsPage
			settings={browserSettings}
			library={browserLibrary}
			history={browserHistory}
			syncStatus={browserSyncStatus}
			requestPricingAccess={() =>
				browser.permissions.request({ origins: [NINJA_ORIGIN] })
			}
			version={browser.runtime.getManifest().version}
			download={download}
		/>,
		root,
	);
}
