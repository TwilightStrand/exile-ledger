import { en, type Messages } from "./en";

export { en, type Messages } from "./en";
export { type PluralForms, plural } from "./plural";
export { searchWarningText } from "./searchWarnings";

export type Locale = "en";

const CATALOGUES: Record<Locale, Messages> = { en };

export function messagesFor(locale: Locale): Messages {
	return CATALOGUES[locale];
}
