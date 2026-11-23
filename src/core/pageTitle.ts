/** The trade site prefixes "(3) " with the number of unread whispers on live searches. */
const COUNT_PREFIX = /^\((\d+)\)\s/;

export interface TitleParts {
	siteTitle: string;
	segment: string | null;
	live: boolean;
}

/** "(3) ⚡ Body Armour (Standard) - Trade - Path of Exile", keeping the site's count. */
export function composeTitle(
	current: string,
	{ siteTitle, segment, live }: TitleParts,
): string {
	const count = COUNT_PREFIX.exec(current)?.[1];
	return `${count ? `(${count}) ` : ""}${live ? "⚡ " : ""}${segment ? `${segment} - ` : ""}${siteTitle}`;
}

/** The site's own title without its count prefix or anything we added. */
export function siteTitleOf(
	current: string,
	lastSet: string | null,
	lastSite: string,
): string {
	const bare = current.replace(COUNT_PREFIX, "");
	const ours = lastSet?.replace(COUNT_PREFIX, "");
	return ours && bare === ours ? lastSite : bare;
}
