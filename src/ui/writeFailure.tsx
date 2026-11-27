import { useMemo, useState } from "preact/hooks";
import type { Source } from "../core/source";
import { useMessages } from "./i18n";

/** "too-large" is a save the panel refused before writing: the query is over QUERY_MAX_BYTES. */
export type WriteFailure = "failed" | "reload" | "too-large";

/**
 * After the extension is updated or reloaded, a tab opened before keeps the
 * old content script, whose storage calls all fail with this message until
 * the page is reloaded; retrying cannot help, so the user is told to reload.
 */
export function failureOf(error: unknown): WriteFailure {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("Extension context invalidated")
		? "reload"
		: "failed";
}

/**
 * The same source, but every update's outcome is reported. The returned
 * promise still rejects for callers that await it; the handler attached here
 * keeps fire-and-forget calls from becoming unhandled rejections.
 */
export function reportingSource<T>(
	source: Source<T>,
	onFailure: (failure: WriteFailure) => void,
	onSuccess: () => void = () => {},
): Source<T> {
	return {
		load: () => source.load(),
		watch: (onChange) => source.watch(onChange),
		update: (change) => {
			let pending: Promise<T>;
			try {
				pending = source.update(change);
			} catch (error) {
				pending = Promise.reject(error);
			}
			pending.then(onSuccess, (error: unknown) => onFailure(failureOf(error)));
			return pending;
		},
	};
}

/** Wraps a source so failed writes show; returns the wrapped source and the notice state. */
export function useWriteFailures<T>(source: Source<T>) {
	const [failure, setFailure] = useState<WriteFailure | null>(null);
	const reporting = useMemo(
		() =>
			reportingSource(
				source,
				(next) =>
					// Once a reload is needed, a later plain failure must not hide that.
					setFailure((current) => (current === "reload" ? current : next)),
				// A later write that worked makes an old failure stale; a reload is
				// still needed, since this tab's other storage calls keep failing.
				() => setFailure((current) => (current === "reload" ? current : null)),
			),
		[source],
	);
	return {
		source: reporting,
		failure,
		report: setFailure,
		dismiss: () => setFailure(null),
	};
}

export function WriteFailureNotice({
	failure,
	onDismiss,
}: {
	failure: WriteFailure | null;
	onDismiss: () => void;
}) {
	const t = useMessages();
	if (!failure) return null;
	return (
		<div
			role="alert"
			class="mx-3 mt-3 flex shrink-0 items-start gap-2 rounded border border-ledger-gold/40 bg-ledger-gold/10 px-2.5 py-2 text-[12px] text-ledger-text"
		>
			<p class="min-w-0 flex-1">
				{failure === "reload"
					? t.panel.reloadNeeded
					: failure === "too-large"
						? t.panel.queryTooLarge
						: t.panel.saveFailed}
			</p>
			<button
				type="button"
				class="shrink-0 rounded border border-ledger-gold/50 px-2 py-0.5 text-[12px] text-ledger-gold transition-colors hover:bg-ledger-gold/15 focus-visible:outline-2 focus-visible:outline-ledger-gold"
				onClick={(e) => {
					// The button goes away with the notice; without this, focus would
					// fall to the trade page's body, outside the panel.
					const panel = e.currentTarget.closest("#exile-ledger-panel");
					onDismiss();
					panel
						?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")
						?.focus();
				}}
			>
				{t.panel.dismiss}
			</button>
		</div>
	);
}
