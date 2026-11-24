import { useEffect, useLayoutEffect, useState } from "preact/hooks";
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
import { OFF_STATUS, type SyncStatus } from "../../core/syncEngine";
import { useMessages } from "../i18n";
import { Mark } from "../icons";
import { quotaPercent, syncStatusText } from "../syncStatusText";
import { applyTheme } from "../theme";
import {
	BUTTON,
	Field,
	Notice,
	PRIMARY_BUTTON,
	Section,
	Segmented,
	ThemePicker,
	Toggle,
} from "./controls";

export interface SettingsPageProps {
	settings: SettingsSource;
	library: LibrarySource;
	history: Source<HistoryEntry[]>;
	syncStatus: Source<SyncStatus>;
	version: string;
	/** Asks for access to poe.ninja; resolves to whether it was granted. */
	requestPricingAccess: () => Promise<boolean>;
	/** Whether this browser already has access to poe.ninja. */
	hasPricingAccess: () => Promise<boolean>;
	/** Saves text as a file; a Blob download in the extension, a spy in tests. */
	download: (filename: string, text: string) => void;
	now?: () => number;
	newId?: () => string;
}

function useSourceValue<T>(source: Source<T>, initial: T): T {
	const [value, setValue] = useState<T>(initial);
	useEffect(() => {
		let active = true;
		source.load().then((v) => {
			if (active) setValue(() => v);
		});
		const stop = source.watch((v) => setValue(() => v));
		return () => {
			active = false;
			stop();
		};
	}, [source]);
	return value;
}

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

const PANEL_SIDES: readonly PanelSide[] = ["left", "right"];
const PANEL_MODES: readonly PanelMode[] = ["overlay", "push"];

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
	const t = useMessages();
	const summary = (payload: Payload) =>
		t.imports.summary(payload.folders.length, payload.bookmarks.length);
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
			text: t.imports.backupSaved(summary(backup.library)),
		});
	};

	const stage = (parsed: Parsed<Pending>) => {
		if (parsed.ok) {
			setPending(parsed.value);
			setMessage(null);
		} else {
			setPending(null);
			setMessage({ tone: "error", text: t.imports.errors[parsed.error] });
		}
	};

	const readFile = async (file: File) => {
		const text = await file.text();
		const parsed = parseBackup(text);
		if (parsed.ok) {
			stage({ ok: true, value: { kind: "backup", backup: parsed.value } });
			return;
		}
		// Other extensions' backup files (Poe Trade Plus saves JSON) import like pasted exports.
		const other = decodeImport(text, clock().now);
		stage(
			other.ok
				? {
						ok: true,
						value: {
							kind: "share",
							source: other.value.source,
							payload: other.value.payload,
						},
					}
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
		try {
			await library.update((lib) => {
				const result = importPayload(lib, payload, clock());
				counts = result;
				return result.library;
			});
		} catch {
			setMessage({
				tone: "error",
				text: t.imports.saveFailed,
			});
			return;
		}
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
			text: t.imports.imported(
				t.imports.summary(counts.folders, counts.bookmarks),
			),
		});
	};

	return (
		<Section title={t.imports.title} description={t.imports.description}>
			<Field label={t.imports.backupLabel} hint={t.imports.backupHint}>
				<button type="button" class={PRIMARY_BUTTON} onClick={exportBackup}>
					{t.imports.saveBackup}
				</button>
			</Field>
			<Field label={t.imports.restoreLabel} hint={t.imports.restoreHint}>
				<label class={`${BUTTON} cursor-pointer`}>
					{t.imports.chooseFile}
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
				<p class="text-[14px] text-ledger-text">{t.imports.shareLabel}</p>
				<p class="mt-0.5 text-[12px] text-ledger-muted">
					{t.imports.shareHint}
				</p>
				<div class="mt-2 flex gap-2">
					<textarea
						aria-label={t.imports.shareInput}
						rows={2}
						spellcheck={false}
						placeholder={t.imports.sharePlaceholder}
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
						{t.imports.read}
					</button>
				</div>
			</div>

			{pending && (
				<div class="animate-pop-in rounded-md border border-ledger-gold/40 bg-ledger-gold/5 p-4">
					<p class="text-[14px] text-ledger-text">
						{pending.kind === "backup"
							? t.imports.backupFrom(
									pending.backup.exportedAt,
									summary(pending.backup.library),
								)
							: t.imports.fromSource(
									t.imports.sources[pending.source],
									summary(pending.payload),
								)}
					</p>
					{pending.kind === "backup" && pending.backup.settings && (
						<label class="mt-3 flex items-center gap-2 text-[13px] text-ledger-muted">
							<input
								type="checkbox"
								checked={restoreSettings}
								onChange={(e) => setRestoreSettings(e.currentTarget.checked)}
							/>
							{t.imports.restoreSettings}
						</label>
					)}
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							class={PRIMARY_BUTTON}
							onClick={confirmImport}
						>
							{t.imports.import}
						</button>
						<button
							type="button"
							class={BUTTON}
							onClick={() => setPending(null)}
						>
							{t.common.cancel}
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
	syncStatus,
	requestPricingAccess,
	hasPricingAccess,
	version,
	download,
	now = Date.now,
	newId = () => crypto.randomUUID(),
}: SettingsPageProps) {
	const t = useMessages();
	const s = t.settings;
	const prefs = useSettingsValue(settings);
	const [historyCleared, setHistoryCleared] = useState(false);
	const [pricingDenied, setPricingDenied] = useState(false);
	const [pricingAccess, setPricingAccess] = useState<boolean | null>(null);
	useEffect(() => {
		hasPricingAccess().then(setPricingAccess);
	}, [hasPricingAccess]);
	// The setting syncs but browser permissions do not, so another machine can
	// have prices on while this one was never asked.
	const pricingMissingAccess =
		prefs.equivalentPricing && pricingAccess === false;
	const sync = useSourceValue(syncStatus, OFF_STATUS);
	const clock = (): Clock => ({ now: now(), newId });
	// On <html> rather than this tree, so the page background and scrollbars follow too.
	useLayoutEffect(() => {
		applyTheme(document.documentElement, prefs.theme);
	}, [prefs.theme]);

	return (
		<div class="min-h-screen bg-ledger-bg px-4 py-10 font-sans text-ledger-text antialiased">
			<main class="mx-auto max-w-2xl space-y-6">
				<header class="flex items-center gap-3">
					<Mark class="size-8 text-ledger-gold" />
					<div>
						<h1 class="font-display text-[26px] leading-tight tracking-[0.03em] text-ledger-gold-bright">
							{t.app.name}
						</h1>
						<p class="text-[13px] text-ledger-muted">
							{s.versionLine(version)}
						</p>
					</div>
				</header>

				<Section title={s.panel.title} description={s.panel.description}>
					<Field label={s.panel.side}>
						<Segmented
							label={s.panel.side}
							value={prefs.panelSide}
							options={PANEL_SIDES.map((value) => ({
								value,
								label: s.panel.sides[value],
							}))}
							onChange={(panelSide) => settings.save({ panelSide })}
						/>
					</Field>
					<Field label={s.panel.layout} hint={s.panel.layoutHint}>
						<Segmented
							label={s.panel.layout}
							value={prefs.panelMode}
							options={PANEL_MODES.map((value) => ({
								value,
								label: s.panel.modes[value],
							}))}
							onChange={(panelMode) => settings.save({ panelMode })}
						/>
					</Field>
					<Field
						label={s.panel.width}
						hint={s.panel.widthHint(PANEL_WIDTH.minPx, PANEL_WIDTH.maxPx)}
					>
						<div class="flex items-center gap-3">
							<input
								type="range"
								aria-label={s.panel.widthInput}
								min={PANEL_WIDTH.min}
								max={PANEL_WIDTH.max}
								step={1}
								value={prefs.panelWidth}
								class="w-40 accent-ledger-gold"
								onChange={(e) =>
									settings.save({ panelWidth: Number(e.currentTarget.value) })
								}
							/>
							<span class="w-14 text-right text-[13px] text-ledger-muted tabular-nums">
								{Math.round(prefs.panelWidth)}%
							</span>
						</div>
					</Field>
				</Section>

				<Section
					title={s.appearance.title}
					description={s.appearance.description}
				>
					<Field label={s.appearance.theme}>
						<ThemePicker
							label={s.appearance.theme}
							value={prefs.theme}
							names={s.appearance.themes}
							onChange={(theme) => settings.save({ theme })}
						/>
					</Field>
				</Section>

				<Section title={s.sync.title} description={s.sync.description}>
					<Field label={s.sync.toggle} hint={syncStatusText(sync, now(), t)}>
						<Toggle
							label={s.sync.toggle}
							checked={prefs.syncEnabled}
							onChange={(syncEnabled) => settings.save({ syncEnabled })}
						/>
					</Field>
					{sync.state !== "off" && (
						<div>
							<div class="flex justify-between text-[12px] text-ledger-muted">
								<span>{s.sync.space}</span>
								<span class="tabular-nums">{quotaPercent(sync)}%</span>
							</div>
							<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ledger-bg">
								<div
									class={`h-full rounded-full transition-[width] duration-500 ${quotaPercent(sync) > 85 ? "bg-ledger-danger-mark" : "bg-ledger-gold"}`}
									style={{ width: `${quotaPercent(sync)}%` }}
								/>
							</div>
						</div>
					)}
					{(sync.state === "error" || sync.state === "quota") && (
						<Notice tone="error">{syncStatusText(sync, now(), t)}</Notice>
					)}
				</Section>

				<Section title={s.results.title} description={s.results.description}>
					<Field label={s.results.highlight} hint={s.results.highlightHint}>
						<Toggle
							label={s.results.highlight}
							checked={prefs.highlightMods}
							onChange={(highlightMods) => settings.save({ highlightMods })}
						/>
					</Field>
					<Field label={s.results.prices} hint={s.results.pricesHint}>
						<Toggle
							label={s.results.prices}
							checked={prefs.equivalentPricing && !pricingMissingAccess}
							onChange={async (equivalentPricing) => {
								if (equivalentPricing && !(await requestPricingAccess())) {
									setPricingDenied(true);
									return;
								}
								if (equivalentPricing) setPricingAccess(true);
								setPricingDenied(false);
								settings.save({ equivalentPricing });
							}}
						/>
					</Field>
					{pricingMissingAccess && !pricingDenied && (
						<Notice tone="error">{s.results.pricesMissingAccess}</Notice>
					)}
					{pricingDenied && (
						<Notice tone="error">{s.results.pricesDenied}</Notice>
					)}
				</Section>

				<Section title={s.trade.title}>
					<Field label={s.trade.tabTitles} hint={s.trade.tabTitlesHint}>
						<Toggle
							label={s.trade.tabTitles}
							checked={prefs.tabTitles}
							onChange={(tabTitles) => settings.save({ tabTitles })}
						/>
					</Field>
					<Field label={s.trade.fuzzy} hint={s.trade.fuzzyHint}>
						<Toggle
							label={s.trade.fuzzy}
							checked={prefs.tildePrefix}
							onChange={(tildePrefix) => settings.save({ tildePrefix })}
						/>
					</Field>
					<Field label={s.trade.backForward} hint={s.trade.backForwardHint}>
						<Toggle
							label={s.trade.backForward}
							checked={prefs.backForward}
							onChange={(backForward) => settings.save({ backForward })}
						/>
					</Field>
				</Section>

				<Section title={s.history.title}>
					<Field label={s.history.record} hint={s.history.recordHint}>
						<Toggle
							label={s.history.record}
							checked={prefs.historyEnabled}
							onChange={(historyEnabled) => settings.save({ historyEnabled })}
						/>
					</Field>
					<Field label={s.history.clearAll} hint={s.history.clearAllHint}>
						<button
							type="button"
							class={BUTTON}
							onClick={async () => {
								await history.update(() => []);
								setHistoryCleared(true);
							}}
						>
							{s.history.clear}
						</button>
					</Field>
					{historyCleared && <Notice tone="ok">{s.history.cleared}</Notice>}
				</Section>

				<BackupSection
					settings={settings}
					library={library}
					download={download}
					clock={clock}
				/>

				<Section title={s.about.title}>
					<p class="text-[13px] leading-6 text-ledger-muted">{s.about.body}</p>
				</Section>
			</main>
		</div>
	);
}
