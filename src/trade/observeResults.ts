import { SELECTORS } from "./selectors";

/**
 * Calls back when the page adds or replaces result rows. Batched to one call
 * per animation frame because the site adds rows in bursts while scrolling.
 */
export function observeResults(
	doc: Document,
	onChange: () => void,
): () => void {
	let frame = 0;
	const schedule = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			onChange();
		});
	};
	const observer = new MutationObserver((records) => {
		const touchesResults = records.some((r) => {
			const target = r.target;
			return (
				target instanceof Element &&
				(target.closest(SELECTORS.resultList) ||
					target.querySelector(SELECTORS.resultList))
			);
		});
		if (touchesResults) schedule();
	});
	observer.observe(doc.body, { childList: true, subtree: true });
	return () => {
		observer.disconnect();
		cancelAnimationFrame(frame);
	};
}
