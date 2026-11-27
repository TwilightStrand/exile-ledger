/**
 * Every official trade site, for both games. Taken from the hosts GGG and its
 * regional publishers (Garena for Taiwan, Kakao Games for Korea) serve the
 * trade site on.
 */
// `budget` groups hosts that may share one GGG rate limit. Where it is not
// known whether two hosts share a backend, they share a budget: that can only
// make watchers wait longer, never send more than the server allows.
const TRADE_HOSTS = [
	{ domain: "pathofexile.com", subdomains: true, budget: "pathofexile.com" },
	{ domain: "pathofexile.tw", subdomains: true, budget: "pathofexile.tw" },
	{ domain: "pathofexile.com.tw", subdomains: true, budget: "pathofexile.tw" },
	{ domain: "poe.kakaogames.com", subdomains: false, budget: "kakaogames.com" },
	{
		domain: "poe2.kakaogames.com",
		subdomains: false,
		budget: "kakaogames.com",
	},
] as const;

export const TRADE_MATCHES: string[] = TRADE_HOSTS.flatMap(
	({ domain, subdomains }) =>
		subdomains
			? [`https://${domain}/trade*`, `https://*.${domain}/trade*`]
			: [`https://${domain}/trade*`],
);

/**
 * Host access the background needs to call the trade API for watchers. Kept
 * optional and asked for on first use, so installing still only shows the
 * content-script sites.
 */
export const TRADE_ORIGINS: string[] = TRADE_HOSTS.flatMap(
	({ domain, subdomains }) =>
		subdomains
			? [`https://${domain}/*`, `https://*.${domain}/*`]
			: [`https://${domain}/*`],
);

export function isTradeHost(hostname: string): boolean {
	return tradeDomain(hostname) !== null;
}

/**
 * The publisher domain a trade host belongs to, or null for any other host.
 * www., the bare domain and the language subdomains (br., ru., de., ...) are
 * front ends of one backend, so they share its rate limits.
 */
function tradeHost(hostname: string) {
	return TRADE_HOSTS.find(
		({ domain, subdomains }) =>
			hostname === domain || (subdomains && hostname.endsWith(`.${domain}`)),
	);
}

export function tradeDomain(hostname: string): string | null {
	return tradeHost(hostname)?.domain ?? null;
}

/** The rate limit budget a trade host draws on. */
export function tradeBudget(hostname: string): string | null {
	return tradeHost(hostname)?.budget ?? null;
}

/**
 * Whether a granted host permission pattern (`https://*.pathofexile.com/*`,
 * or one host such as `https://www.pathofexile.com/*`) is on a trade site.
 */
export function isTradePattern(pattern: string): boolean {
	const host = /^https:\/\/(?:\*\.)?([^/]+)\//.exec(pattern)?.[1];
	return host !== undefined && isTradeHost(host);
}

/**
 * Manifest match patterns cannot express "/trade or /trade2 as a whole path
 * segment", so `/trade*` also matches pages like `/trader`. The content script
 * checks this before doing anything.
 */
export function isTradePage(url: URL): boolean {
	if (url.protocol !== "https:" || !isTradeHost(url.hostname)) return false;
	const [first] = url.pathname.split("/").filter(Boolean);
	return first === "trade" || first === "trade2";
}
