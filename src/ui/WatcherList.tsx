import { memo } from "preact/compat";
import { formatAgo } from "../core/describe";
import type {
	ListingWatcher,
	Price,
	SearchWatcher,
	Watcher,
} from "../core/watchers";
import { useMessages } from "./i18n";
import { Eye, Trash } from "./icons";
import { EmptyState, GameTag } from "./parts";

const ICON_BUTTON =
	"grid size-6 shrink-0 place-items-center rounded text-ledger-faint opacity-0 transition-colors group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-ledger-border hover:text-ledger-danger focus-visible:outline-2 focus-visible:outline-ledger-gold";

const STATUS_CLASS: Record<ListingWatcher["status"], string> = {
	listed: "text-ledger-muted",
	gone: "text-ledger-danger",
	back: "text-ledger-live",
};

export interface WatcherActions {
	onRemove: (id: string) => void;
	/** Opens a search watcher's search and marks its new results seen. */
	onOpenSearch: (watcher: SearchWatcher) => void;
	onOpenSettings: () => void;
}

function priceText(price: Price | null, fallback: string): string {
	return price ? `${price.amount} ${price.currency}` : fallback;
}

function CheckedLine({ watcher, now }: { watcher: Watcher; now: number }) {
	const t = useMessages();
	const w = t.watchers;
	const when =
		watcher.retryAt !== null && watcher.failures > 0
			? w.retrying
			: watcher.lastCheckedAt === null
				? w.notChecked
				: w.checked(formatAgo(watcher.lastCheckedAt, now, t.time));
	return (
		<span class="text-[11px] text-ledger-muted">
			{when} · {w.every(watcher.intervalMin)}
		</span>
	);
}

function ListingRow({
	watcher,
	now,
	actions,
}: {
	watcher: ListingWatcher;
	now: number;
	actions: WatcherActions;
}) {
	const t = useMessages();
	const w = t.watchers;
	const price =
		watcher.previousPrice && watcher.status !== "gone"
			? w.repriced(
					priceText(watcher.previousPrice, w.noPrice),
					priceText(watcher.price, w.noPrice),
				)
			: priceText(watcher.price, w.noPrice);
	return (
		<li class="group flex items-start gap-1 rounded px-2 py-1.5 compact:py-0.5 hover:bg-ledger-raised">
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="flex items-center gap-1.5">
					<span class="min-w-0 flex-1 truncate text-[13px] text-ledger-text">
						{watcher.name}
					</span>
					<GameTag game={watcher.game} />
				</span>
				<span class="text-[12px]">
					<span class={STATUS_CLASS[watcher.status]}>
						{w.status[watcher.status]}
					</span>
					<span class="text-ledger-muted"> · {price}</span>
				</span>
				<CheckedLine watcher={watcher} now={now} />
			</div>
			<button
				type="button"
				class={ICON_BUTTON}
				aria-label={w.remove(watcher.name)}
				onClick={() => actions.onRemove(watcher.id)}
			>
				<Trash class="size-3.5" />
			</button>
		</li>
	);
}

function SearchRow({
	watcher,
	now,
	actions,
}: {
	watcher: SearchWatcher;
	now: number;
	actions: WatcherActions;
}) {
	const t = useMessages();
	const w = t.watchers;
	const fresh = watcher.newIds.length;
	return (
		<li class="group flex items-start gap-1 rounded hover:bg-ledger-raised">
			<button
				type="button"
				class="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 compact:py-0.5 text-left focus-visible:outline-2 focus-visible:outline-ledger-gold"
				onClick={() => actions.onOpenSearch(watcher)}
			>
				<span class="flex w-full items-center gap-1.5">
					<span class="min-w-0 flex-1 truncate text-[13px] text-ledger-text">
						{watcher.name}
					</span>
					{fresh > 0 && (
						<span class="rounded-full bg-ledger-gold/20 px-1.5 text-[11px] text-ledger-gold-bright tabular-nums">
							{w.newResults(fresh)}
						</span>
					)}
					<GameTag game={watcher.game} />
				</span>
				{watcher.total !== null && (
					<span class="text-[12px] text-ledger-muted">
						{w.total(watcher.total)}
					</span>
				)}
				<CheckedLine watcher={watcher} now={now} />
			</button>
			<button
				type="button"
				class={`${ICON_BUTTON} mt-1.5 mr-1`}
				aria-label={w.remove(watcher.name)}
				onClick={() => actions.onRemove(watcher.id)}
			>
				<Trash class="size-3.5" />
			</button>
		</li>
	);
}

export const WatcherList = memo(function WatcherList({
	watchers,
	hasAccess,
	now,
	actions,
}: {
	watchers: Watcher[];
	hasAccess: boolean;
	now: number;
	actions: WatcherActions;
}) {
	const t = useMessages();
	const w = t.watchers;
	if (watchers.length === 0) {
		return (
			<EmptyState icon={Eye} title={w.emptyTitle}>
				{w.emptyBody}
			</EmptyState>
		);
	}
	const listings = watchers.filter((x) => x.kind === "listing");
	const searches = watchers.filter((x) => x.kind === "search");
	return (
		<div class="px-2 py-2">
			{!hasAccess && (
				<div
					role="alert"
					class="mx-1 mb-2 rounded border border-ledger-gold/40 bg-ledger-gold/10 px-2.5 py-2 text-[12px] text-ledger-text"
				>
					<p>{w.needsAccess}</p>
					<button
						type="button"
						class="mt-1.5 rounded border border-ledger-gold/50 px-2 py-0.5 text-[12px] text-ledger-gold transition-colors hover:bg-ledger-gold/15 focus-visible:outline-2 focus-visible:outline-ledger-gold"
						onClick={actions.onOpenSettings}
					>
						{w.allow}
					</button>
				</div>
			)}
			{searches.length > 0 && (
				<section aria-label={w.searches}>
					<h2 class="px-2 pt-1 pb-0.5 text-[11px] tracking-[0.06em] text-ledger-muted uppercase">
						{w.searches}
					</h2>
					<ul>
						{searches.map((x) => (
							<SearchRow key={x.id} watcher={x} now={now} actions={actions} />
						))}
					</ul>
				</section>
			)}
			{listings.length > 0 && (
				<section aria-label={w.listings}>
					<h2 class="px-2 pt-1 pb-0.5 text-[11px] tracking-[0.06em] text-ledger-muted uppercase">
						{w.listings}
					</h2>
					<ul>
						{listings.map((x) => (
							<ListingRow key={x.id} watcher={x} now={now} actions={actions} />
						))}
					</ul>
				</section>
			)}
		</div>
	);
});
