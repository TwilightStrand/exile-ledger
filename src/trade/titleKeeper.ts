import { composeTitle, siteTitleOf, type TitleParts } from "../core/pageTitle";

/**
 * Keeps our segment in the tab title. The site rewrites the title (whisper
 * counts, language), so a MutationObserver re-applies ours on top of whatever
 * the site set, keeping its count.
 */
export function createTitleKeeper(doc: Document) {
	let siteTitle = doc.title;
	let lastSet: string | null = null;
	let wanted: Omit<TitleParts, "siteTitle"> = { segment: null, live: false };

	const apply = () => {
		siteTitle = siteTitleOf(doc.title, lastSet, siteTitle);
		const next = composeTitle(doc.title, { siteTitle, ...wanted });
		if (doc.title !== next) {
			lastSet = next;
			doc.title = next;
		}
	};

	const titleEl = doc.querySelector("title");
	const observer = new MutationObserver(apply);
	if (titleEl)
		observer.observe(titleEl, {
			childList: true,
			characterData: true,
			subtree: true,
		});

	return {
		set(parts: Omit<TitleParts, "siteTitle">) {
			wanted = parts;
			apply();
		},
		stop() {
			observer.disconnect();
			wanted = { segment: null, live: false };
			apply();
		},
	};
}
