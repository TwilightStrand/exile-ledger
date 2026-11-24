import { titleOfQuery } from "../core/describe";
import { searchWarningText } from "../core/i18n";
import { checkSearch } from "../core/searchChecks";
import type { CaptureState } from "../trade/captureFeed";
import { useMessages } from "./i18n";
import { Bookmark, Check, Search, Warning } from "./icons";
import { Chip, Eyebrow, GameTag } from "./parts";

export function CurrentSearch({
	capture,
	saved = false,
	onSave,
}: {
	capture: CaptureState;
	/** True when this exact search is already bookmarked. */
	saved?: boolean;
	onSave?: (() => void) | undefined;
}) {
	const t = useMessages();
	const event = capture.search;
	const warnings = event ? checkSearch(event.game, event.search.query) : [];

	return (
		<section
			class="mx-3 mt-3 rounded-md border border-ledger-border bg-ledger-surface p-3"
			data-testid="current-search"
		>
			<Eyebrow>{t.currentSearch.heading}</Eyebrow>
			{event ? (
				<>
					<h2 class="mt-1 truncate font-display text-[16px] leading-6 text-ledger-text">
						{titleOfQuery(event.search.query, t)}
					</h2>
					<div class="mt-2 flex flex-wrap items-center gap-1.5">
						<GameTag game={event.game} />
						<Chip>{event.league}</Chip>
						<Chip>{t.common.results(event.search.total)}</Chip>
					</div>
					{warnings.length > 0 && (
						<ul
							class="mt-2.5 space-y-1.5"
							aria-label={t.currentSearch.problems}
						>
							{warnings.map((warning) => (
								<li
									key={warning.id}
									class="flex animate-fade-in items-start gap-2 rounded border border-ledger-warn-edge/40 bg-ledger-warn-edge/10 px-2 py-1.5 text-[12px] leading-[18px] text-ledger-warn"
								>
									<Warning class="mt-px size-3.5 shrink-0 text-ledger-warn-mark" />
									{searchWarningText(t, warning)}
								</li>
							))}
						</ul>
					)}
					{onSave && saved && (
						<p class="mt-3 flex animate-pop-in items-center justify-center gap-1.5 rounded border border-ledger-border py-1.5 text-[12px] text-ledger-muted">
							<Check class="size-3.5 text-ledger-live" />
							{t.common.savedToBookmarks}
						</p>
					)}
					{onSave && !saved && (
						<button
							type="button"
							class="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-ledger-gold/45 bg-ledger-gold/10 py-1.5 text-[12px] font-semibold text-ledger-gold transition-colors hover:bg-ledger-gold/20 hover:text-ledger-gold-bright focus-visible:outline-2 focus-visible:outline-ledger-gold"
							onClick={onSave}
						>
							<Bookmark class="size-3.5" />
							{t.currentSearch.save}
						</button>
					)}
				</>
			) : (
				<p class="mt-1.5 flex items-start gap-2 text-[12px] leading-5 text-ledger-muted">
					<Search class="mt-0.5 size-3.5 shrink-0 text-ledger-faint" />
					{t.currentSearch.empty}
				</p>
			)}
		</section>
	);
}
