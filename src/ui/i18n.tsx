import { type ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";
import { en, type Messages } from "../core/i18n";

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

export function useMessages(): Messages {
	return useContext(MessagesContext);
}
