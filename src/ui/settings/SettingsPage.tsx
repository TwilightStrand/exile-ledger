import { useEffect, useLayoutEffect, useState } from "preact/hooks";
import {
	type Backup,
	backupSettings,
	createBackup,
	importPayload,
	importWatchers,
	type Parsed,
	type Payload,
	parseBackup,
} from "../../core/exchange";
import type { HistoryEntry } from "../../core/history";
import { type LanguageSetting, LOCALE_NAMES, LOCALES } from "../../core/i18n";
import { decodeImport, type ImportSource } from "../../core/importers";
import type { Clock, LibrarySource } from "../../core/library";
import {
	DEFAULT_SETTINGS,
	PANEL_WIDTH,
	PANEL_WIDTH_UNITS,
	type PanelMode,
	type PanelSide,
	panelWidthValue,
	type Settings,
	type SettingsSource,
	switchWidthUnit,
} from "../../core/settings";
import type { Source } from "../../core/source";
import { OFF_STATUS, type SyncStatus } from "../../core/syncEngine";
import { WATCH_INTERVAL, type Watcher } from "../../core/watchers";
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
import { HotkeysSection } from "./HotkeysSection";

export interface SettingsPageProps {
	settings: SettingsSource;
	/** Settings already loaded by the page, so the first paint has the right theme. */
	initialSettings?: Settings;
	library: LibrarySource;
	/** Saved in backups and added back on restore. */
	watchers: Source<Watcher[]>;
	history: Source<HistoryEntry[]>;
	syncStatus: Source<SyncStatus>;
	version: string;
	/** Asks for access to poe.ninja; resolves to whether it was granted. */
	requestPricingAccess: () => Promise<boolean>;
	/** Whether this browser already has access to poe.ninja. */
	hasPricingAccess: () => Promise<boolean>;
	/** Asks for the trade sites, for background watcher checks. */
	requestTradeAccess: () => Promise<boolean>;
	hasTradeAccess: () => Promise<boolean>;
	/** Asks for the notifications permission; resolves to whether it was granted. */
	requestNotifications: () => Promise<boolean>;
	hasNotifications: () => Promise<boolean>;
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

function useSettingsValue(
	source: SettingsSource,
	initial: Settings | undefined,
): Settings {
	const [value, setValue] = useState<Settings>(initial ?? DEFAULT_SETTINGS);
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
const LANGUAGE_OPTIONS: readonly LanguageSetting[] = ["auto", ...LOCALES];
const PANEL_MODES: readonly PanelMode[] = ["overlay", "push"];

function BackupSection({
	settings,
	library,
	watchers,
	download,
	clock,
}: {
	settings: SettingsSource;
	library: LibrarySource;
	watchers: Source<Watcher[]>;
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
		const [lib, prefs, watched] = await Promise.all([
			library.load(),
			settings.load(),
			watchers.load(),
		]);
		const backup = createBackup(lib, prefs, clock().now, watched);
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
		const restoredWatchers =
			pending.kind === "backup" ? pending.backup.watchers : undefined;
		let watchersSaved = true;
		if (restoredWatchers && restoredWatchers.length > 0) {
			watchersSaved = await watchers
				.update(
					(current) =>
						importWatchers(current, restoredWatchers, clock()).watchers,
				)
				.then(
					() => true,
					() => false,
				);
		}
		// Settings are restored even when the watchers were not: they do not
		// depend on each other, and the bookmarks are already in, so a second
		// try of the whole restore would copy them twice.
		if (
			pending.kind === "backup" &&
			restoreSettings &&
			pending.backup.settings
		) {
			await settings.save(backupSettings(pending.backup));
		}
		setPending(null);
		setShareText("");
		const summary = t.imports.summary(counts.folders, counts.bookmarks);
		setMessage(
			watchersSaved
				? { tone: "ok", text: t.imports.imported(summary) }
				: { tone: "error", text: t.imports.watchersFailed(summary) },
		);
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
						class="min-w-0 flex-1 resize-y rounded-md border border-ledger-border bg-ledger-bg px-3 py-2 font-mono text-[12px] text-ledger-text outline-none placeholder:text-ledger-muted focus:border-ledger-gold/60"
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
	initialSettings,
	library,
	watchers,
	history,
	syncStatus,
	requestPricingAccess,
	hasPricingAccess,
	requestTradeAccess,
	hasTradeAccess,
	requestNotifications,
	hasNotifications,
	version,
	download,
	now = Date.now,
	newId = () => crypto.randomUUID(),
}: SettingsPageProps) {
	const t = useMessages();
	const s = t.settings;
	const prefs = useSettingsValue(settings, initialSettings);
	const [historyCleared, setHistoryCleared] = useState(false);
	const [pricingDenied, setPricingDenied] = useState(false);
	const [pricingAccess, setPricingAccess] = useState<boolean | null>(null);
	useEffect(() => {
		hasPricingAccess().then(setPricingAccess);
	}, [hasPricingAccess]);
	const [tradeAccess, setTradeAccess] = useState<boolean | null>(null);
	const [tradeDenied, setTradeDenied] = useState(false);
	const [notifyDenied, setNotifyDenied] = useState(false);
	const [notifyAccess, setNotifyAccess] = useState<boolean | null>(null);
	useEffect(() => {
		hasNotifications().then(setNotifyAccess, () => setNotifyAccess(null));
	}, [hasNotifications]);
	// Like prices: the setting syncs and backups restore it, permissions do not.
	const notifyMissingAccess = prefs.notifications && notifyAccess === false;
	useEffect(() => {
		hasTradeAccess().then(setTradeAccess);
	}, [hasTradeAccess]);
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
						hint={
							prefs.panelWidthUnit === "px"
								? s.panel.widthHintPx(PANEL_WIDTH.minPx, PANEL_WIDTH.maxPx)
								: s.panel.widthHintPercent(PANEL_WIDTH.minPx, PANEL_WIDTH.maxPx)
						}
					>
						<div class="flex flex-col items-end gap-2">
							<Segmented
								label={s.panel.widthUnit}
								value={prefs.panelWidthUnit}
								options={PANEL_WIDTH_UNITS.map((value) => ({
									value,
									label: s.panel.widthUnits[value],
								}))}
								onChange={(unit) =>
									settings.save(switchWidthUnit(prefs, unit, window.innerWidth))
								}
							/>
							<div class="flex items-center gap-3">
								<input
									type="range"
									aria-label={s.panel.widthInput}
									min={
										prefs.panelWidthUnit === "px"
											? PANEL_WIDTH.minPx
											: PANEL_WIDTH.min
									}
									max={
										prefs.panelWidthUnit === "px"
											? PANEL_WIDTH.maxPx
											: PANEL_WIDTH.max
									}
									step={1}
									value={panelWidthValue(prefs)}
									class="w-40 accent-ledger-gold"
									onChange={(e) => {
										const value = Number(e.currentTarget.value);
										settings.save(
											prefs.panelWidthUnit === "px"
												? { panelWidthPx: value }
												: { panelWidth: value },
										);
									}}
								/>
								<span class="w-14 text-right text-[13px] text-ledger-muted tabular-nums">
									{prefs.panelWidthUnit === "px"
										? t.panel.resizeValuePx(prefs.panelWidthPx)
										: `${Math.round(prefs.panelWidth)}%`}
								</span>
							</div>
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
					<Field label={s.appearance.language} hint={s.appearance.languageHint}>
						<select
							aria-label={s.appearance.language}
							value={prefs.language}
							class="rounded-md border border-ledger-border bg-ledger-bg px-2 py-1 text-[13px] text-ledger-text outline-none focus:border-ledger-gold/60"
							onChange={(e) => {
								const value = e.currentTarget.value;
								const language = LANGUAGE_OPTIONS.find((l) => l === value);
								if (language) settings.save({ language });
							}}
						>
							{LANGUAGE_OPTIONS.map((value) => (
								<option key={value} value={value}>
									{value === "auto"
										? s.appearance.languageAuto
										: LOCALE_NAMES[value]}
								</option>
							))}
						</select>
					</Field>
					<Field label={s.appearance.compact} hint={s.appearance.compactHint}>
						<Toggle
							label={s.appearance.compact}
							checked={prefs.compact}
							onChange={(compact) => settings.save({ compact })}
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
					{(sync.state === "error" ||
						sync.state === "quota" ||
						sync.state === "newer") && (
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
					<Field label={s.results.listingTime} hint={s.results.listingTimeHint}>
						<Toggle
							label={s.results.listingTime}
							checked={prefs.listingTime}
							onChange={(listingTime) => settings.save({ listingTime })}
						/>
					</Field>
					<Field label={s.results.affixCount} hint={s.results.affixCountHint}>
						<Toggle
							label={s.results.affixCount}
							checked={prefs.affixCount}
							onChange={(affixCount) => settings.save({ affixCount })}
						/>
					</Field>
					<Field label={s.results.itemTools} hint={s.results.itemToolsHint}>
						<Toggle
							label={s.results.itemTools}
							checked={prefs.itemTools}
							onChange={(itemTools) => settings.save({ itemTools })}
						/>
					</Field>
					<Field
						label={s.results.socketWarning}
						hint={s.results.socketWarningHint}
					>
						<Toggle
							label={s.results.socketWarning}
							checked={prefs.socketWarning}
							onChange={(socketWarning) => settings.save({ socketWarning })}
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
					<Field label={s.trade.fuzzyFilters} hint={s.trade.fuzzyFiltersHint}>
						<Toggle
							label={s.trade.fuzzyFilters}
							checked={prefs.tildePrefixFilters}
							onChange={(tildePrefixFilters) =>
								settings.save({ tildePrefixFilters })
							}
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

				<Section title={s.watchers.title} description={s.watchers.description}>
					<Field label={s.watchers.access} hint={s.watchers.accessHint}>
						{tradeAccess ? (
							<span class="text-[13px] text-ledger-live">
								{s.watchers.allowed}
							</span>
						) : (
							<button
								type="button"
								class={PRIMARY_BUTTON}
								onClick={async () => {
									const granted = await requestTradeAccess();
									setTradeAccess(granted);
									setTradeDenied(!granted);
								}}
							>
								{s.watchers.allow}
							</button>
						)}
					</Field>
					{tradeDenied && <Notice tone="error">{s.watchers.denied}</Notice>}
					<Field label={s.watchers.notify} hint={s.watchers.notifyHint}>
						<Toggle
							label={s.watchers.notify}
							checked={prefs.notifications && !notifyMissingAccess}
							onChange={async (notifications) => {
								if (notifications && !(await requestNotifications())) {
									setNotifyDenied(true);
									return;
								}
								if (notifications) setNotifyAccess(true);
								setNotifyDenied(false);
								settings.save({ notifications });
							}}
						/>
					</Field>
					{notifyMissingAccess && !notifyDenied && (
						<Notice tone="error">{s.watchers.notifyMissingAccess}</Notice>
					)}
					{notifyDenied && (
						<Notice tone="error">{s.watchers.notifyDenied}</Notice>
					)}
					<Field
						label={s.watchers.interval}
						hint={s.watchers.intervalHint(WATCH_INTERVAL.min)}
					>
						<input
							type="number"
							aria-label={s.watchers.intervalInput}
							min={WATCH_INTERVAL.min}
							max={1440}
							step={1}
							value={prefs.watchInterval}
							class="w-20 rounded-md border border-ledger-border bg-ledger-bg px-2 py-1 text-right text-[13px] text-ledger-text tabular-nums outline-none focus:border-ledger-gold/60"
							onChange={(e) => {
								const raw = e.currentTarget.value.trim();
								const minutes = Math.round(Number(raw));
								// An emptied field means nothing yet, not zero minutes.
								if (raw !== "" && Number.isFinite(minutes))
									settings.save({
										watchInterval: Math.min(
											1440,
											Math.max(WATCH_INTERVAL.min, minutes),
										),
									});
							}}
						/>
					</Field>
				</Section>

				<HotkeysSection
					hotkeys={prefs.hotkeys}
					onSave={(hotkeys) => settings.save({ hotkeys })}
				/>

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
					watchers={watchers}
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
