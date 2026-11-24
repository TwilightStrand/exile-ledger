import "../../styles/tailwind.css";
import { render } from "preact";
import { browser } from "wxt/browser";
import { messagesFor } from "../../core/i18n";
import { MessagesProvider, useMessages } from "../../ui/i18n";
import { Mark } from "../../ui/icons";

function Popup() {
	const t = useMessages();
	const { version } = browser.runtime.getManifest();
	return (
		<main class="w-64 bg-ledger-bg p-4 font-sans text-sm text-ledger-text">
			<div class="flex items-center gap-2">
				<Mark class="size-5 text-ledger-gold" />
				<h1 class="font-display text-[17px] text-ledger-gold-bright">
					{t.app.name}
				</h1>
			</div>
			<p class="mt-1 text-[12px] text-ledger-muted">
				{t.popup.version(version)}
			</p>
			<p class="mt-3 text-[12px] leading-5 text-ledger-muted">{t.popup.body}</p>
			<button
				type="button"
				class="mt-3 w-full rounded-md border border-ledger-gold/50 bg-ledger-gold/15 py-1.5 text-[13px] font-semibold text-ledger-gold transition-colors hover:bg-ledger-gold/25"
				onClick={() => {
					browser.runtime.openOptionsPage();
					window.close();
				}}
			>
				{t.popup.openSettings}
			</button>
		</main>
	);
}

const root = document.getElementById("app");
if (root)
	render(
		<MessagesProvider messages={messagesFor("en")}>
			<Popup />
		</MessagesProvider>,
		root,
	);
