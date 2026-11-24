import { type ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import {
	en,
	type LanguageSetting,
	type Messages,
	messagesFor,
	resolveLocale,
} from "../core/i18n";
import type { SettingsSource } from "../core/settings";

const MessagesContext = createContext<Messages>(en);

export function MessagesProvider({
	messages,
	children,
}: {
	messages: Messages;
	children: ComponentChildren;
}) {
	return (
		<MessagesContext.Provider value={messages}>
			{children}
		</MessagesContext.Provider>
	);
}

export const browserLanguages = (): readonly string[] =>
	typeof navigator === "undefined" ? [] : navigator.languages;

/** Messages in the user's chosen language, switching as soon as the setting changes. */
export function SettingsMessages({
	settings,
	initial,
	children,
}: {
	settings: SettingsSource;
	initial: LanguageSetting;
	children: ComponentChildren;
}) {
	const [language, setLanguage] = useState(initial);
	useEffect(
		() => settings.watch((next) => setLanguage(next.language)),
		[settings],
	);
	return (
		<MessagesProvider
			messages={messagesFor(resolveLocale(language, browserLanguages()))}
		>
			{children}
		</MessagesProvider>
	);
}

export function useMessages(): Messages {
	return useContext(MessagesContext);
}
