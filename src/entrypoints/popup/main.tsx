import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";
import { browserSettings } from "../../storage/settingsStore";
import { SettingsForm } from "../../ui/SettingsForm";

function Popup() {
	const { version } = browser.runtime.getManifest();
	return (
		<main class="w-64 bg-ledger-bg p-3 font-sans text-sm text-ledger-text">
			<h1 class="font-semibold text-ledger-accent">Exile Ledger</h1>
			<p class="mb-3 text-ledger-muted">Version {version}</p>
			<SettingsForm settings={browserSettings} />
		</main>
	);
}

const root = document.getElementById("app");
if (root) render(<Popup />, root);
