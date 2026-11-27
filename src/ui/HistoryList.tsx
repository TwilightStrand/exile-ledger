import { memo } from "preact/compat";
import { formatAgo } from "../core/describe";
import { useMessages } from "./i18n";
import { Bookmark, Check, Clock } from "./icons";
import { EmptyState, GameTag } from "./parts";
import type { HistoryEntryView } from "./viewModels";

export interface HistoryActions {
	onSave: (id: string) => void;
	onClear: () => void;
}

const ICON_BUTTON =
	"grid size-6 shrink-0 place-items-center rounded text-ledger-faint transition-colors hover:bg-ledger-border hover:text-ledger-gold focus-visible:outline-2 focus-visible:outline-ledger-gold";

export const HistoryList = memo(function HistoryList({
	entries,
	now,
	actions,
}: {
	entries: HistoryEntryView[];
	now: number;
	actions?: HistoryActions;
}) {
	const t = useMessages();
	if (entries.length === 0) {
		return (
			<EmptyState icon={Clock} title={t.history.emptyTitle}>
				{t.history.emptyBody}
			</EmptyState>
		);
	}
	return (
		<div class="py-2">
			{actions && (
				<div class="flex justify-end px-3 pb-1">
					<button
						type="button"
						class="rounded px-1.5 py-0.5 text-[11px] text-ledger-muted transition-colors hover:bg-ledger-raised hover:text-ledger-danger"
						onClick={actions.onClear}
					>
						{t.history.clear}
					</button>
				</div>
			)}
			<ol class="px-2">
				{entries.map((entry) => (
					<li key={entry.id} class="group relative">
						<a
							class="flex flex-col gap-0.5 rounded px-2 py-1.5 compact:py-0.5 no-underline transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold"
							href={entry.href}
						>
							<span class="flex items-center gap-2">
								<span class="min-w-0 flex-1 truncate text-[13px] text-ledger-text">
									{entry.title}
								</span>
								<GameTag game={entry.game} />
							</span>
							<span class="text-[11px] text-ledger-muted">
								{entry.league} · {formatAgo(entry.at, now, t.time)}
								{entry.total !== null && ` · ${t.common.results(entry.total)}`}
							</span>
						</a>
						{actions && (
							<div class="pointer-events-none absolute top-1.5 right-1 flex items-center rounded bg-ledger-raised opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
								{entry.saved ? (
									<span
										class="grid size-6 place-items-center text-ledger-live"
										title={t.common.savedToBookmarks}
									>
										<Check class="size-3.5" />
										<span class="sr-only">{t.common.savedToBookmarks}</span>
									</span>
								) : (
									<button
										type="button"
										class={ICON_BUTTON}
										aria-label={t.history.saveAs(entry.title)}
										onClick={() => actions.onSave(entry.id)}
									>
										<Bookmark class="size-3.5" />
									</button>
								)}
							</div>
						)}
					</li>
				))}
			</ol>
		</div>
	);
});
