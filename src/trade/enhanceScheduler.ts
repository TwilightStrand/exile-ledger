import { SELECTORS } from "./selectors";

export interface EnhanceScheduler {
	/** Something every row shows changed (settings, language, watchers, pins, rates, the search). */
	all(): void;
	/** These listings were fetched; their rows may already be on the page. */
	items(ids: Iterable<string>): void;
	stop(): void;
}

/**
 * Runs `enhance` at most once per frame, on the result rows that need it: rows
 * it has not seen, rows the site reused for another listing or rebuilt inside,
 * and rows of listings that just arrived. Everything else keeps its marks.
 *
 * Hidden tabs do not run animation frames, so work queued there waits for the
 * tab to show again instead of being dropped. `enhance` runs on every flush,
 * even with no rows, because the caller also keeps the tab title in step with
 * the page there.
 */
export function scheduleEnhance(
	doc: Document,
	enhance: (rows: HTMLElement[]) => void,
): EnhanceScheduler {
	// The listing id each row had when it was last enhanced.
	const handled = new WeakMap<HTMLElement, string>();
	const dirtyRows = new Set<HTMLElement>();
	const dirtyIds = new Set<string>();
	let everything = false;
	let pending = false;
	let frame = 0;

	const absorb = (records: MutationRecord[]): boolean => {
		let touched = false;
		for (const record of records) {
			const target = record.target;
			if (!(target instanceof Element)) continue;
			const row = target.closest<HTMLElement>(SELECTORS.resultRow);
			if (row) {
				if (row.isConnected) dirtyRows.add(row);
				touched = true;
			} else if (
				target.closest(SELECTORS.resultList) ||
				target.querySelector(SELECTORS.resultList)
			) {
				// Rows added or swapped: the handled check below finds them.
				touched = true;
			}
		}
		// A hidden tab can collect changes for a long time; rows the site has
		// removed meanwhile need no work and should not be kept alive.
		if (doc.hidden) {
			for (const row of dirtyRows) if (!row.isConnected) dirtyRows.delete(row);
		}
		return touched;
	};

	const observer = new MutationObserver((records) => {
		if (absorb(records)) request();
	});
	observer.observe(doc.body, { childList: true, subtree: true });

	const flush = () => {
		frame = 0;
		if (doc.hidden) return;
		pending = false;
		absorb(observer.takeRecords());
		const rows: HTMLElement[] = [];
		for (const row of doc.querySelectorAll<HTMLElement>(SELECTORS.resultRow)) {
			const id = row.dataset.id ?? "";
			if (
				everything ||
				handled.get(row) !== id ||
				dirtyRows.has(row) ||
				dirtyIds.has(id)
			)
				rows.push(row);
		}
		everything = false;
		dirtyRows.clear();
		dirtyIds.clear();
		try {
			enhance(rows);
		} finally {
			for (const row of rows) handled.set(row, row.dataset.id ?? "");
			// Our own marks are childList changes inside the results; seeing them
			// would cost a second, empty pass.
			observer.takeRecords();
		}
	};

	function request() {
		pending = true;
		if (frame || doc.hidden) return;
		frame = requestAnimationFrame(flush);
	}

	const onVisible = () => {
		if (!doc.hidden && pending) request();
	};
	doc.addEventListener("visibilitychange", onVisible);

	return {
		all() {
			everything = true;
			request();
		},
		items(ids) {
			for (const id of ids) dirtyIds.add(id);
			request();
		},
		stop() {
			observer.disconnect();
			cancelAnimationFrame(frame);
			frame = 0;
			doc.removeEventListener("visibilitychange", onVisible);
		},
	};
}
