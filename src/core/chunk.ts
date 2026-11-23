/**
 * storage.sync allows 8 KB per item and about 100 KB in total. The synced
 * document is deflated (CompressionStream is built into both browsers, so no
 * library is needed), base64-encoded and cut into chunks well under the item
 * limit, which also counts the key and JSON quoting.
 */
export const CHUNK_CHARS = 7000;
/** Leaves room under the 100 KB quota for settings and the meta item. */
export const SYNC_BUDGET_BYTES = 90 * 1024;

type Bytes = Uint8Array<ArrayBuffer>;

async function pipe(
	bytes: Bytes,
	stream: CompressionStream | DecompressionStream,
): Promise<Bytes> {
	const out = new Blob([bytes]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64(bytes: Bytes): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

function fromBase64(text: string): Bytes | null {
	try {
		return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
	} catch {
		return null;
	}
}

export async function encodeChunks(value: unknown): Promise<string[]> {
	const json = new TextEncoder().encode(JSON.stringify(value));
	const packed = toBase64(
		await pipe(json, new CompressionStream("deflate-raw")),
	);
	const chunks: string[] = [];
	for (let i = 0; i < packed.length; i += CHUNK_CHARS) {
		chunks.push(packed.slice(i, i + CHUNK_CHARS));
	}
	return chunks.length > 0 ? chunks : [""];
}

/** Null for anything that does not decode; a half-written sync must never crash a reader. */
export async function decodeChunks(chunks: string[]): Promise<unknown> {
	const bytes = fromBase64(chunks.join(""));
	if (!bytes || bytes.length === 0) return null;
	try {
		const json = new TextDecoder().decode(
			await pipe(bytes, new DecompressionStream("deflate-raw")),
		);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

/** Bytes storage.sync counts for the items: key length plus JSON-encoded value. */
export function syncBytes(items: Record<string, unknown>): number {
	return Object.entries(items).reduce(
		(sum, [key, value]) => sum + key.length + JSON.stringify(value).length,
		0,
	);
}
