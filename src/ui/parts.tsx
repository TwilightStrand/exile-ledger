import type { ComponentChildren, FunctionComponent } from "preact";
import type { Game } from "../core/tradeUrl";
import { useMessages } from "./i18n";

const GAME_TAG_CLASSES: Record<Game, string> = {
	poe1: "border-ledger-poe1/40 text-ledger-poe1",
	poe2: "border-ledger-poe2/40 text-ledger-poe2",
};

export function GameTag({ game }: { game: Game }) {
	const t = useMessages();
	return (
		<span
			class={`shrink-0 rounded-sm border px-1 text-[10px] leading-4 font-semibold tracking-wide ${GAME_TAG_CLASSES[game]}`}
		>
			{t.common.games[game]}
		</span>
	);
}

export function Chip({ children }: { children: ComponentChildren }) {
	return (
		<span class="rounded-sm border border-ledger-border bg-ledger-panel px-1.5 text-[11px] leading-5 text-ledger-muted">
			{children}
		</span>
	);
}

export function Eyebrow({ children }: { children: ComponentChildren }) {
	return (
		<p class="font-display text-[11px] tracking-[0.12em] text-ledger-gold/80 uppercase">
			{children}
		</p>
	);
}

export function EmptyState({
	icon: Icon,
	title,
	children,
}: {
	icon: FunctionComponent<{ class?: string }>;
	title: string;
	children: ComponentChildren;
}) {
	return (
		<div class="flex flex-col items-center px-6 py-10 text-center">
			<span class="mb-3 grid size-10 place-items-center rounded-full border border-ledger-line/60 text-ledger-gold/70">
				<Icon class="size-5" />
			</span>
			<p class="font-display text-[14px] text-ledger-text">{title}</p>
			<p class="mt-1 text-[12px] leading-5 text-ledger-muted">{children}</p>
		</div>
	);
}
