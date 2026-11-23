import { formatAgo } from "../core/describe";
import type { SyncStatus } from "../core/syncEngine";

export function quotaPercent(status: SyncStatus): number {
	return Math.min(
		100,
		Math.round((status.usedBytes / status.quotaBytes) * 100),
	);
}

/** One line for tooltips and the settings page. */
export function syncStatusText(status: SyncStatus, now: number): string {
	switch (status.state) {
		case "off":
			return "Sync is off. Bookmarks stay on this machine.";
		case "on":
			return `Synced${status.lastSyncAt ? ` ${formatAgo(status.lastSyncAt, now)}` : ""} · ${quotaPercent(status)}% of sync space used`;
		case "waiting":
			return status.message ?? "Waiting for another browser to finish syncing.";
		case "quota":
		case "error":
			return status.message ?? "Sync stopped.";
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
