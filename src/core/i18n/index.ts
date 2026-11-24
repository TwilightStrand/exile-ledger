import { de } from "./de";
import { en, type Messages } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ko } from "./ko";
import type { Locale } from "./locales";
import { pl } from "./pl";
import { pt } from "./pt";
import { ru } from "./ru";
import { zh } from "./zh";

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

const CATALOGUES: Record<Locale, Messages> = {
	en,
	de,
	es,
	zh,
	fr,
	pt,
	ru,
	pl,
	ko,
};

export function messagesFor(locale: Locale): Messages {
	return CATALOGUES[locale];
}
