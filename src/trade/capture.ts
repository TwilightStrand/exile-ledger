import * as v from "valibot";
import type { Game } from "../core/tradeApi";
import {
	classifyApiUrl,
	parseFetchResponse,
	parseSearch,
	type ResultItem,
	type SearchCapture,
} from "../core/tradeApi";
import { MESSAGE_SOURCE } from "./interceptor";

export type CaptureEvent =
	| {
			kind: "search";
			game: Game;
			realm: string | null;
			league: string;
			search: SearchCapture;
	  }
	| { kind: "results"; game: Game; queryId: string; items: ResultItem[] };

const EnvelopeSchema = v.object({
	source: v.literal(MESSAGE_SOURCE),
	payload: v.object({
		url: v.string(),
		method: v.string(),
		requestBody: v.nullable(v.string()),
		responseBody: v.string(),
	}),
});

function parseJson(text: string | null): unknown {
	if (text === null) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function parseUrl(text: string): URL | null {
	try {
		return new URL(text);
	} catch {
		return null;
	}
}

/** Validates a message from the MAIN-world interceptor; anything else is ignored. */
export function toCaptureEvent(data: unknown): CaptureEvent | null {
	const envelope = v.safeParse(EnvelopeSchema, data);
	if (!envelope.success) return null;
	const { url, requestBody, responseBody } = envelope.output.payload;

	const parsedUrl = parseUrl(url);
	const call = parsedUrl ? classifyApiUrl(parsedUrl) : null;
	if (!call) return null;

	if (call.kind === "search") {
		const search = parseSearch(parseJson(requestBody), parseJson(responseBody));
		if (!search) return null;
		return {
			kind: "search",
			game: call.game,
			realm: call.realm,
			league: call.league,
			search,
		};
	}

	const items = parseFetchResponse(parseJson(responseBody));
	if (!items) return null;
	return { kind: "results", game: call.game, queryId: call.queryId, items };
}

export function listenForCaptures(
	win: Window,
	onEvent: (event: CaptureEvent) => void,
): () => void {
	const listener = (message: MessageEvent<unknown>) => {
		if (message.source !== win || message.origin !== win.location.origin) {
			return;
		}
		const event = toCaptureEvent(message.data);
		if (event) onEvent(event);
	};
	win.addEventListener("message", listener);
	return () => win.removeEventListener("message", listener);
}
