/**
 * Every official trade site, for both games. Taken from the hosts GGG and its
 * regional publishers (Garena for Taiwan, Kakao Games for Korea) serve the
 * trade site on.
 */
const TRADE_HOSTS = [
	{ domain: "pathofexile.com", subdomains: true },
	{ domain: "pathofexile.tw", subdomains: true },
	{ domain: "pathofexile.com.tw", subdomains: true },
	{ domain: "poe.kakaogames.com", subdomains: false },
	{ domain: "poe2.kakaogames.com", subdomains: false },
] as const;

export const TRADE_MATCHES: string[] = TRADE_HOSTS.flatMap(
	({ domain, subdomains }) =>
		subdomains
			? [`https://${domain}/trade*`, `https://*.${domain}/trade*`]
			: [`https://${domain}/trade*`],
);

function isTradeHost(hostname: string): boolean {
	return TRADE_HOSTS.some(
		({ domain, subdomains }) =>
			hostname === domain || (subdomains && hostname.endsWith(`.${domain}`)),
	);
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
