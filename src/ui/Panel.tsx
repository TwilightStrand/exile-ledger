import { useEffect, useState } from "preact/hooks";
import {
	DEFAULT_SETTINGS,
	type PanelSide,
	type SettingsSource,
} from "../core/settings";
import type { CaptureFeed, CaptureState } from "../trade/captureFeed";

function usePanelSide(settings: SettingsSource): PanelSide {
	const [side, setSide] = useState(DEFAULT_SETTINGS.panelSide);
	useEffect(() => {
		let active = true;
		settings.load().then((s) => {
			if (active) setSide(s.panelSide);
		});
		const stop = settings.watch((s) => setSide(s.panelSide));
		return () => {
			active = false;
			stop();
		};
	}, [settings]);
	return side;
}

function useCapture(feed: CaptureFeed): CaptureState {
	const [state, setState] = useState(feed.get);
	useEffect(() => {
		const unsubscribe = feed.subscribe(setState);
		return () => {
			unsubscribe();
		};
	}, [feed]);
	return state;
}

function describeSearch(state: CaptureState): string {
	const query = state.search?.search.query.query;
	if (!query) return "No search yet.";
	const what =
		typeof query.type === "string"
			? query.type
			: (query.type?.option ?? query.term ?? "Any item");
	return `${what} · ${state.search?.search.total ?? 0} results`;
}

// Literal class strings so Tailwind's scanner picks them up.
const SIDE_CLASSES = {
	left: {
		aside: "left-0 flex-row-reverse",
		toggle: "rounded-r border-l-0",
		panel: "border-r",
	},
	right: {
		aside: "right-0",
		toggle: "rounded-l border-r-0",
		panel: "border-l",
	},
} as const;

export interface PanelProps {
	feed: CaptureFeed;
	settings: SettingsSource;
	/** Previews pass this to show the collapsed state. */
	initiallyOpen?: boolean;
}

export function Panel({ feed, settings, initiallyOpen = true }: PanelProps) {
	const [open, setOpen] = useState(initiallyOpen);
	const capture = useCapture(feed);
	const side = usePanelSide(settings);
	const classes = SIDE_CLASSES[side];
	// Open, the arrow points the way the panel collapses; closed, the way it expands.
	const pointsLeft = (side === "left") === open;

	return (
		<aside
			class={`fixed top-0 z-[2147483000] flex h-full font-sans text-sm text-ledger-text ${classes.aside}`}
			aria-label="Exile Ledger"
			data-side={side}
		>
			<button
				type="button"
				class={`mt-24 h-24 w-6 self-start border border-ledger-border bg-ledger-panel text-ledger-accent ${classes.toggle}`}
				aria-expanded={open}
				aria-controls="exile-ledger-panel"
				aria-label={open ? "Collapse Exile Ledger" : "Expand Exile Ledger"}
				onClick={() => setOpen((v) => !v)}
			>
				{pointsLeft ? "‹" : "›"}
			</button>
			{open && (
				<div
					id="exile-ledger-panel"
					class={`flex w-72 flex-col border-ledger-border bg-ledger-panel ${classes.panel}`}
				>
					<header class="border-b border-ledger-border px-3 py-2 font-semibold text-ledger-accent">
						Exile Ledger
					</header>
					<p class="px-3 py-2 text-ledger-muted" data-testid="current-search">
						{describeSearch(capture)}
					</p>
				</div>
			)}
		</aside>
	);
}
