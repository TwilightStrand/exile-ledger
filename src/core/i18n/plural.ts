/** Forms keyed by CLDR plural category; `other` is required because every locale has it. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
	other: string;
};

const rules = new Map<string, Intl.PluralRules>();

/** Picks the form the locale's plural rules choose for `n`, falling back to `other`. */
export function plural(locale: string, n: number, forms: PluralForms): string {
	let rule = rules.get(locale);
	if (!rule) {
		rule = new Intl.PluralRules(locale);
		rules.set(locale, rule);
	}
	return forms[rule.select(n)] ?? forms.other;
}
