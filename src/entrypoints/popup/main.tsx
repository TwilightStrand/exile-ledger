import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";

function Popup() {
	const { version } = browser.runtime.getManifest();
	return (
		<main class="w-64 bg-ledger-bg p-3 font-sans text-sm text-ledger-text">
			<h1 class="font-semibold text-ledger-accent">Exile Ledger</h1>
			<p class="text-ledger-muted">Version {version}</p>
		</main>
	);
}

const root = document.getElementById("app");
if (root) render(<Popup />, root);
