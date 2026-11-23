import { useEffect, useState } from "preact/hooks";
import {
	type Backup,
	createBackup,
	importPayload,
	type Parsed,
	type Payload,
	parseBackup,
} from "../../core/exchange";
import type { HistoryEntry } from "../../core/history";
import { decodeImport, type ImportSource } from "../../core/importers";
import type { Clock, LibrarySource } from "../../core/library";
import {
	DEFAULT_SETTINGS,
	PANEL_WIDTH,
	type PanelMode,
	type PanelSide,
	type Settings,
	type SettingsSource,
} from "../../core/settings";
import type { Source } from "../../core/source";
import { Mark } from "../icons";
import {
	BUTTON,
	Field,
	Notice,
	PRIMARY_BUTTON,
	Section,
	Segmented,
	Toggle,
} from "./controls";

export interface SettingsPageProps {
	settings: SettingsSource;
	library: LibrarySource;
	history: Source<HistoryEntry[]>;
	version: string;
	/** Saves text as a file; a Blob download in the extension, a spy in tests. */
	download: (filename: string, text: string) => void;
	now?: () => number;
	newId?: () => string;
}

const SIDES: readonly { value: PanelSide; label: string }[] = [
	{ value: "left", label: "Left" },
	{ value: "right", label: "Right" },
];

const MODES: readonly { value: PanelMode; label: string }[] = [
	{ value: "overlay", label: "Float over" },
	{ value: "push", label: "Push aside" },
];

function useSettingsValue(source: SettingsSource): Settings {
	const [value, setValue] = useState<Settings>(DEFAULT_SETTINGS);
	useEffect(() => {
		let active = true;
		source.load().then((s) => {
			if (active) setValue(s);
		});
		const stop = source.watch(setValue);
		return () => {
			active = false;
			stop();
		};
	}, [source]);
	return value;
}

type Pending =
	| { kind: "backup"; backup: Backup }
	| { kind: "share"; source: ImportSource; payload: Payload }
	| null;

const SOURCE_LABELS: Record<ImportSource, string> = {
	"exile-ledger": "Shared folder",
	"better-trading": "Better Trading export",
};

function countText(folders: number, bookmarks: number): string {
	return `${folders} folder${folders === 1 ? "" : "s"} and ${bookmarks} bookmark${bookmarks === 1 ? "" : "s"}`;
}

function summary(payload: Payload): string {
	return countText(payload.folders.length, payload.bookmarks.length);
}

function BackupSection({
	settings,
	library,
	download,
	clock,
}: {
	settings: SettingsSource;
	library: LibrarySource;
	download: SettingsPageProps["download"];
	clock: () => Clock;
}) {
	const [pending, setPending] = useState<Pending>(null);
	const [restoreSettings, setRestoreSettings] = useState(true);
	const [shareText, setShareText] = useState("");
	const [message, setMessage] = useState<{
		tone: "ok" | "error";
		text: string;
	} | null>(null);

	const exportBackup = async () => {
		const backup = createBackup(
			await library.load(),
			await settings.load(),
			clock().now,
		);
		const date = new Date(backup.exportedAt).toISOString().slice(0, 10);
		download(
			`exile-ledger-backup-${date}.json`,
			JSON.stringify(backup, null, 2),
		);
		setMessage({
			tone: "ok",
			text: `Backup saved with ${summary(backup.library)}.`,
		});
	};

	const stage = (parsed: Parsed<Pending>) => {
		if (parsed.ok) {
			setPending(parsed.value);
			setMessage(null);
		} else {
			setPending(null);
			setMessage({ tone: "error", text: parsed.message });
		}
	};

	const readFile = async (file: File) => {
		const parsed = parseBackup(await file.text());
		stage(
			parsed.ok
				? { ok: true, value: { kind: "backup", backup: parsed.value } }
				: parsed,
		);
	};

	const readShare = () => {
		const parsed = decodeImport(shareText, clock().now);
		stage(
			parsed.ok
				? {
						ok: true,
						value: {
							kind: "share",
							source: parsed.value.source,
							payload: parsed.value.payload,
						},
					}
				: parsed,
		);
	};

	const confirmImport = async () => {
		if (!pending) return;
		const payload =
			pending.kind === "backup" ? pending.backup.library : pending.payload;
		let counts = { folders: 0, bookmarks: 0 };
		await library.update((lib) => {
			const result = importPayload(lib, payload, clock());
			counts = result;
			return result.library;
		});
		if (
			pending.kind === "backup" &&
			restoreSettings &&
			pending.backup.settings
		) {
			await settings.save(pending.backup.settings);
		}
		setPending(null);
		setShareText("");
		setMessage({
			tone: "ok",
			text: `Imported ${countText(counts.folders, counts.bookmarks)}.`,
		});
	};

	return (
		<Section
			title="Backup and sharing"
			description="Imports always add new folders next to yours. Nothing you already have is changed or removed."
		>
			<Field
				label="Back up everything"
				hint="A file with every folder, bookmark and setting. History stays on this machine."
			>
				<button type="button" class={PRIMARY_BUTTON} onClick={exportBackup}>
					Save backup file
				</button>
			</Field>
			<Field
				label="Restore from a backup file"
				hint="Pick a file saved by Exile Ledger."
			>
				<label class={`${BUTTON} cursor-pointer`}>
					Choose file
					<input
						type="file"
						accept="application/json,.json"
						class="sr-only"
						onChange={(e) => {
							const file = e.currentTarget.files?.[0];
							if (file) readFile(file);
							e.currentTarget.value = "";
						}}
					/>
				</label>
			</Field>
			<div>
				<p class="text-[14px] text-ledger-text">Import a shared folder</p>
				<p class="mt-0.5 text-[12px] text-ledger-muted">
					Paste a string copied with “Copy share string” on a folder in the
					panel.
				</p>
				<div class="mt-2 flex gap-2">
					<textarea
						aria-label="Share string"
						rows={2}
						spellcheck={false}
						placeholder="EL1:…"
						class="min-w-0 flex-1 resize-y rounded-md border border-ledger-border bg-ledger-bg px-3 py-2 font-mono text-[12px] text-ledger-text outline-none placeholder:text-ledger-faint focus:border-ledger-gold/60"
						value={shareText}
						onInput={(e) => setShareText(e.currentTarget.value)}
					/>
					<button
						type="button"
						class={`${BUTTON} self-start`}
						disabled={!shareText.trim()}
						onClick={readShare}
					>
						Read
					</button>
				</div>
			</div>

			{pending && (
				<div class="animate-pop-in rounded-md border border-ledger-gold/40 bg-ledger-gold/5 p-4">
					<p class="text-[14px] text-ledger-text">
						{pending.kind === "backup"
							? `Backup from ${new Date(pending.backup.exportedAt).toLocaleString("en")}: ${summary(pending.backup.library)}.`
							: `${SOURCE_LABELS[pending.source]}: ${summary(pending.payload)}.`}
					</p>
					{pending.kind === "backup" && pending.backup.settings && (
						<label class="mt-3 flex items-center gap-2 text-[13px] text-ledger-muted">
							<input
								type="checkbox"
								checked={restoreSettings}
								onChange={(e) => setRestoreSettings(e.currentTarget.checked)}
							/>
							Also restore settings
						</label>
					)}
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							class={PRIMARY_BUTTON}
							onClick={confirmImport}
						>
							Import
						</button>
						<button
							type="button"
							class={BUTTON}
							onClick={() => setPending(null)}
						>
							Cancel
						</button>
					</div>
				</div>
			)}
			{message && <Notice tone={message.tone}>{message.text}</Notice>}
		</Section>
	);
}

export function SettingsPage({
	settings,
	library,
	history,
	version,
	download,
	now = Date.now,
	newId = () => crypto.randomUUID(),
}: SettingsPageProps) {
	const prefs = useSettingsValue(settings);
	const [historyCleared, setHistoryCleared] = useState(false);
	const clock = (): Clock => ({ now: now(), newId });

	return (
		<div class="min-h-screen bg-ledger-bg px-4 py-10 font-sans text-ledger-text antialiased">
			<main class="mx-auto max-w-2xl space-y-6">
				<header class="flex items-center gap-3">
					<Mark class="size-8 text-ledger-gold" />
					<div>
						<h1 class="font-display text-[26px] leading-tight tracking-[0.03em] text-ledger-gold-bright">
							Exile Ledger
						</h1>
						<p class="text-[13px] text-ledger-muted">
							Settings · version {version}
						</p>
					</div>
				</header>

				<Section
					title="Panel"
					description="How the panel sits on the trade site."
				>
					<Field label="Dock side">
						<Segmented
							label="Dock side"
							value={prefs.panelSide}
							options={SIDES}
							onChange={(panelSide) => settings.save({ panelSide })}
						/>
					</Field>
					<Field
						label="Layout"
						hint="Float over the page, or push the page aside so the panel never covers results."
					>
						<Segmented
							label="Layout"
							value={prefs.panelMode}
							options={MODES}
							onChange={(panelMode) => settings.save({ panelMode })}
						/>
					</Field>
					<Field label="Width" hint="You can also drag the panel's inner edge.">
						<div class="flex items-center gap-3">
							<input
								type="range"
								aria-label="Panel width"
								min={PANEL_WIDTH.min}
								max={PANEL_WIDTH.max}
								step={4}
								value={prefs.panelWidth}
								class="w-40 accent-[#d6ad62]"
								onChange={(e) =>
									settings.save({ panelWidth: Number(e.currentTarget.value) })
								}
							/>
							<span class="w-14 text-right text-[13px] text-ledger-muted tabular-nums">
								{prefs.panelWidth} px
							</span>
						</div>
					</Field>
				</Section>

				<Section title="History">
					<Field
						label="Record searches"
						hint="Kept on this machine only, up to 200 per game."
					>
						<Toggle
							label="Record searches"
							checked={prefs.historyEnabled}
							onChange={(historyEnabled) => settings.save({ historyEnabled })}
						/>
					</Field>
					<Field label="Clear all history" hint="Both games, on this machine.">
						<button
							type="button"
							class={BUTTON}
							onClick={async () => {
								await history.update(() => []);
								setHistoryCleared(true);
							}}
						>
							Clear history
						</button>
					</Field>
					{historyCleared && <Notice tone="ok">History cleared.</Notice>}
				</Section>

				<BackupSection
					settings={settings}
					library={library}
					download={download}
					clock={clock}
				/>

				<Section title="About and privacy">
					<p class="text-[13px] leading-6 text-ledger-muted">
						Exile Ledger keeps your bookmarks in your browser and syncs them
						through your browser account. It sends nothing anywhere else: no
						analytics, no tracking, and it never reads your Path of Exile
						session. It only sees the trade searches your own page makes.
					</p>
				</Section>
			</main>
		</div>
	);
}
