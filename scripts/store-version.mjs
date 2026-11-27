// Tells the release workflow whether a store already has a version, so a
// retried upload skips the store that took it instead of failing on a
// duplicate. Usage: node scripts/store-version.mjs <chrome|firefox> <version>
// Credentials come from the same environment variables `wxt submit` reads.
// Writes `present=true|false` to $GITHUB_OUTPUT and explains in the log.
import { createHmac, createSign, randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

const [store, version] = process.argv.slice(2);
if ((store !== "chrome" && store !== "firefox") || !version) {
	console.error(
		"Usage: node scripts/store-version.mjs <chrome|firefox> <version>",
	);
	process.exit(2);
}

function requireEnv(name) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

function base64url(value) {
	return Buffer.from(value).toString("base64url");
}

function jwt(alg, sign, claims) {
	const input = `${base64url(JSON.stringify({ alg, typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
	return `${input}.${sign(input)}`;
}

// Chrome versions are one to four dot-separated integers.
function compareVersions(a, b) {
	const left = a.split(".").map(Number);
	const right = b.split(".").map(Number);
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const diff = (left[i] ?? 0) - (right[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

async function chromeAccessToken() {
	const now = Math.floor(Date.now() / 1000);
	const assertion = jwt(
		"RS256",
		(input) =>
			createSign("RSA-SHA256")
				.update(input)
				.sign(requireEnv("CHROME_SERVICE_ACCOUNT_PRIVATE_KEY"), "base64url"),
		{
			iss: requireEnv("CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL"),
			scope: "https://www.googleapis.com/auth/chromewebstore",
			aud: "https://oauth2.googleapis.com/token",
			iat: now,
			exp: now + 60,
		},
	);
	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion,
		}),
	});
	if (!res.ok) {
		throw new Error(
			`Google token exchange failed: ${res.status} ${res.statusText}`,
		);
	}
	const body = await res.json();
	if (typeof body?.access_token !== "string") {
		throw new Error("Google token response has no access_token");
	}
	return body.access_token;
}

function channelVersions(revision) {
	const channels = Array.isArray(revision?.distributionChannels)
		? revision.distributionChannels
		: [];
	return channels
		.map((channel) => channel?.crxVersion)
		.filter((crxVersion) => typeof crxVersion === "string");
}

// Same endpoint publish-browser-extension calls before uploading (fetchStatus,
// Chrome Web Store API v2).
async function chromeHas(target) {
	const publisher = requireEnv("CHROME_PUBLISHER_ID");
	const item = requireEnv("CHROME_EXTENSION_ID");
	const res = await fetch(
		`https://chromewebstore.googleapis.com/v2/publishers/${encodeURIComponent(publisher)}/items/${encodeURIComponent(item)}:fetchStatus`,
		{
			headers: {
				Authorization: `Bearer ${await chromeAccessToken()}`,
				"x-goog-api-version": "2",
			},
		},
	);
	if (!res.ok) {
		throw new Error(
			`fetchStatus failed: ${res.status} ${res.statusText}: ${await res.text()}`,
		);
	}
	const status = await res.json();

	const published = channelVersions(status.publishedItemRevisionStatus);
	const newestPublished = published.find(
		(crxVersion) => compareVersions(crxVersion, target) >= 0,
	);
	if (newestPublished) {
		return `published as ${newestPublished}`;
	}

	// A rejected or cancelled submission does not hold the version, so those
	// states upload again.
	const submitted = status.submittedItemRevisionStatus;
	const holding = [
		"PENDING_REVIEW",
		"STAGED",
		"PUBLISHED",
		"PUBLISHED_TO_TESTERS",
	];
	if (holding.includes(submitted?.state)) {
		const pending = channelVersions(submitted).find(
			(crxVersion) => compareVersions(crxVersion, target) >= 0,
		);
		if (pending) return `submitted as ${pending} (${submitted.state})`;
	}
	return undefined;
}

// AMO's version detail endpoint takes a version number when it is prefixed
// with "v"; authenticated as the add-on's author it also returns unlisted and
// unreviewed versions. AMO never accepts a version number twice, so any hit
// means this version cannot be uploaded again.
async function firefoxHas(target) {
	const issuer = requireEnv("FIREFOX_JWT_ISSUER");
	const secret = requireEnv("FIREFOX_JWT_SECRET");
	const addon = requireEnv("FIREFOX_EXTENSION_ID");
	const now = Math.floor(Date.now() / 1000);
	const token = jwt(
		"HS256",
		(input) => createHmac("sha256", secret).update(input).digest("base64url"),
		{ iss: issuer, jti: randomUUID(), iat: now, exp: now + 60 },
	);
	const res = await fetch(
		`https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(addon)}/versions/v${encodeURIComponent(target)}/`,
		{ headers: { Authorization: `JWT ${token}` } },
	);
	if (res.status === 404) return undefined;
	if (!res.ok) {
		throw new Error(
			`AMO version lookup failed: ${res.status} ${res.statusText}: ${await res.text()}`,
		);
	}
	const found = await res.json();
	const fileStatus = found?.file?.status ?? "unknown";
	if (fileStatus === "disabled") {
		console.log(
			`::warning title=addons.mozilla.org::Version ${target} exists on AMO but is disabled (rejected, disabled or never submitted for review). AMO will not take this version number again; release a new version.`,
		);
	}
	return `${found?.channel ?? "unknown"} channel, file status ${fileStatus}`;
}

try {
	const found =
		store === "chrome" ? await chromeHas(version) : await firefoxHas(version);
	if (found) {
		console.log(`${store} already has ${version}: ${found}`);
	} else {
		console.log(`${store} does not have ${version} yet`);
	}
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`present=${found ? "true" : "false"}\ndetail=${found ?? ""}\n`,
		);
	}
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}
