/**
 * Runs in the page's MAIN world, so it must stay small and dependency-free:
 * it only copies the page's own trade API traffic out to the extension.
 * Everything it reports is validated again on the extension side, because any
 * page script can post a message that looks like ours.
 */
export const MESSAGE_SOURCE = "exile-ledger:capture";

export interface CapturedExchange {
	url: string;
	method: string;
	requestBody: string | null;
	responseBody: string;
}

const API_PATH = /\/api\/trade2?\/(search|fetch)\//;

interface XhrLike {
	status: number;
	responseText: string;
	open(method: string, url: string | URL, ...rest: never[]): void;
	send(body?: never): void;
	addEventListener(type: "load", listener: () => void): void;
}

export interface InterceptTarget {
	location: { href: string };
	fetch: typeof fetch;
	XMLHttpRequest: { prototype: object };
}

function isApiUrl(url: string): boolean {
	return API_PATH.test(url);
}

function resolve(base: string, input: string | URL): string {
	try {
		return new URL(input, base).toString();
	} catch {
		return "";
	}
}

function wrapFetch(
	win: InterceptTarget,
	report: (e: CapturedExchange) => void,
) {
	const original = win.fetch;
	win.fetch = async (input, init) => {
		const isRequest = typeof input !== "string" && !(input instanceof URL);
		const url = resolve(win.location.href, isRequest ? input.url : input);
		const watched = isApiUrl(url);
		const method = (
			init?.method ?? (isRequest ? input.method : "GET")
		).toUpperCase();
		const requestBody = !watched
			? null
			: typeof init?.body === "string"
				? init.body
				: isRequest
					? await input.clone().text()
					: null;

		const response = await original.call(win, input, init);
		if (watched && response.ok) {
			response
				.clone()
				.text()
				.then((responseBody) =>
					report({ url, method, requestBody, responseBody }),
				)
				.catch(() => {});
		}
		return response;
	};
}

function isXhrLike(value: object): value is XhrLike {
	return "open" in value && "send" in value && "addEventListener" in value;
}

function wrapXhr(win: InterceptTarget, report: (e: CapturedExchange) => void) {
	const proto = win.XMLHttpRequest.prototype;
	if (!isXhrLike(proto)) return;
	const originalOpen = proto.open;
	const originalSend = proto.send;
	const pending = new WeakMap<object, { method: string; url: string }>();

	proto.open = function (this: XhrLike, method, url, ...rest) {
		pending.set(this, {
			method: method.toUpperCase(),
			url: resolve(win.location.href, url),
		});
		originalOpen.call(this, method, url, ...rest);
	};

	proto.send = function (this: XhrLike, body) {
		const request = pending.get(this);
		if (request && isApiUrl(request.url)) {
			const requestBody = typeof body === "string" ? body : null;
			this.addEventListener("load", () => {
				if (this.status >= 200 && this.status < 300) {
					report({ ...request, requestBody, responseBody: this.responseText });
				}
			});
		}
		originalSend.call(this, body);
	};
}

export function installInterceptor(
	win: InterceptTarget,
	report: (e: CapturedExchange) => void,
): void {
	wrapFetch(win, report);
	wrapXhr(win, report);
}
