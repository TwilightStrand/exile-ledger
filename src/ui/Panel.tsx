import { useState } from "preact/hooks";

export function Panel() {
	const [open, setOpen] = useState(true);

	return (
		<aside
			class="fixed top-0 right-0 z-[2147483000] flex h-full font-sans text-sm text-ledger-text"
			aria-label="Exile Ledger"
		>
			<button
				type="button"
				class="mt-24 h-24 w-6 self-start rounded-l border border-r-0 border-ledger-border bg-ledger-panel text-ledger-accent"
				aria-expanded={open}
				aria-controls="exile-ledger-panel"
				onClick={() => setOpen((v) => !v)}
			>
				{open ? "›" : "‹"}
			</button>
			{open && (
				<div
					id="exile-ledger-panel"
					class="flex w-72 flex-col border-l border-ledger-border bg-ledger-panel"
				>
					<header class="border-b border-ledger-border px-3 py-2 font-semibold text-ledger-accent">
						Exile Ledger
					</header>
					<p class="px-3 py-2 text-ledger-muted">No bookmarks yet.</p>
				</div>
			)}
		</aside>
	);
}
