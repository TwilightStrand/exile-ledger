import { en, type Messages } from "./en";
import type { Locale } from "./locales";

export { en, type Messages } from "./en";
export {
	type LanguageSetting,
	LOCALE_NAMES,
	LOCALES,
	type Locale,
	resolveLocale,
} from "./locales";
export { type PluralForms, plural } from "./plural";
export { searchWarningText } from "./searchWarnings";

const CATALOGUES: Partial<Record<Locale, Messages>> = { en };

export function messagesFor(locale: Locale): Messages {
	return CATALOGUES[locale] ?? en;
}
