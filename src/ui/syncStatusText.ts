import { formatAgo } from "../core/describe";
import { en, type Messages } from "../core/i18n";
import type { SyncStatus } from "../core/syncEngine";

export function quotaPercent(status: SyncStatus): number {
	return Math.min(
		100,
		Math.round((status.usedBytes / status.quotaBytes) * 100),
	);
}

/** One line for tooltips and the settings page. */
export function syncStatusText(
	status: SyncStatus,
	now: number,
	t: Messages = en,
): string {
	switch (status.state) {
		case "off":
			return t.sync.off;
		case "on":
			return t.sync.on(
				status.lastSyncAt ? formatAgo(status.lastSyncAt, now, t.time) : null,
				quotaPercent(status),
			);
		case "waiting":
			return t.sync.waiting;
		case "quota":
			return t.sync.quota;
		case "error":
			return status.error ?? t.sync.failed;
	}
}

// Literal classes so Tailwind's scanner sees them.
export const SYNC_DOT: Record<SyncStatus["state"], string> = {
	on: "bg-ledger-live",
	waiting: "bg-ledger-gold",
	off: "bg-ledger-faint",
	quota: "bg-red-400",
	error: "bg-red-400",
};
