import { formatAgo } from "../core/describe";
import { Clock } from "./icons";
import { EmptyState, GameTag } from "./parts";
import type { HistoryEntryView } from "./viewModels";

export function HistoryList({
	entries,
	now,
}: {
	entries: HistoryEntryView[];
	now: number;
}) {
	if (entries.length === 0) {
		return (
			<EmptyState icon={Clock} title="No history yet">
				Searches you run on the trade site are listed here.
			</EmptyState>
		);
	}
	return (
		<ol class="px-2 py-2">
			{entries.map((entry) => (
				<li key={entry.id}>
					<a
						class="flex flex-col gap-0.5 rounded px-2 py-1.5 no-underline transition-colors hover:bg-ledger-raised focus-visible:outline-2 focus-visible:outline-ledger-gold"
						href={entry.href}
					>
						<span class="flex items-center gap-2">
							<span class="min-w-0 flex-1 truncate text-[13px] text-ledger-text">
								{entry.title}
							</span>
							<GameTag game={entry.game} />
						</span>
						<span class="text-[11px] text-ledger-faint">
							{entry.league} · {formatAgo(entry.at, now)}
						</span>
					</a>
				</li>
			))}
		</ol>
	);
}
