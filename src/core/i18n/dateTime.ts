const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Date and time of a listing. Results are labelled in bulk on every pass, and
 * building a formatter costs far more than using one, so one is kept per locale.
 * `undefined` follows the browser's locale, as toLocaleString(undefined) does.
 */
export function listingDateTime(
	locale: string | undefined,
	at: number,
): string {
	const key = locale ?? "";
	let format = formatters.get(key);
	if (!format) {
		format = new Intl.DateTimeFormat(locale, {
			dateStyle: "medium",
			timeStyle: "short",
		});
		formatters.set(key, format);
	}
	return format.format(at);
}
