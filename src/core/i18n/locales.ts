export type Locale =
	| "en"
	| "de"
	| "es"
	| "zh"
	| "fr"
	| "pt"
	| "ru"
	| "pl"
	| "ko";

export const LOCALES: readonly Locale[] = [
	"en",
	"de",
	"es",
	"zh",
	"fr",
	"pt",
	"ru",
	"pl",
	"ko",
];

/** Each language in itself, as language pickers show them. */
export const LOCALE_NAMES: Record<Locale, string> = {
	en: "English",
	de: "Deutsch",
	es: "Español",
	zh: "简体中文",
	fr: "Français",
	pt: "Português",
	ru: "Русский",
	pl: "Polski",
	ko: "한국어",
};

export type LanguageSetting = "auto" | Locale;

const isLocale = (value: string): value is Locale =>
	LOCALES.some((l) => l === value);

/** The chosen language, or for "auto" the first browser language we have; English otherwise. */
export function resolveLocale(
	setting: LanguageSetting,
	browserLanguages: readonly string[],
): Locale {
	if (setting !== "auto") return setting;
	for (const tag of browserLanguages) {
		const base = tag.toLowerCase().split("-")[0] ?? "";
		if (isLocale(base)) return base;
	}
	return "en";
}
