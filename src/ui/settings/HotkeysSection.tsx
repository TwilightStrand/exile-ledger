import { useEffect, useState } from "preact/hooks";
import {
	assignHotkey,
	bindingFromEvent,
	DEFAULT_HOTKEYS,
	HOTKEY_ACTIONS,
	type HotkeyAction,
	type Hotkeys,
	hotkeyLabel,
} from "../../core/hotkeys";
import { useMessages } from "../i18n";
import { BUTTON, Notice, Section } from "./controls";

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

export function HotkeysSection({
	hotkeys,
	onSave,
	mac = isMac(),
}: {
	hotkeys: Hotkeys;
	onSave: (hotkeys: Hotkeys) => void;
	mac?: boolean;
}) {
	const t = useMessages();
	const h = t.settings.hotkeys;
	const [recording, setRecording] = useState<HotkeyAction | null>(null);
	const [problem, setProblem] = useState<string | null>(null);

	useEffect(() => {
		if (!recording) return;
		const onKeyDown = (event: KeyboardEvent) => {
			event.preventDefault();
			event.stopPropagation();
			const plain =
				!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
			if (event.code === "Escape" && plain) {
				setRecording(null);
				return;
			}
			const binding = bindingFromEvent(event);
			if (!binding) return;
			const result = assignHotkey(hotkeys, recording, binding);
			setRecording(null);
			if (result.ok) {
				setProblem(null);
				onSave(result.hotkeys);
				return;
			}
			const combo = hotkeyLabel(binding, mac);
			setProblem(
				result.reason === "reserved"
					? h.reserved(combo)
					: h.taken(combo, h.actions[result.by]),
			);
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [recording, hotkeys, onSave, mac, h]);

	return (
		<Section title={h.title} description={h.description}>
			<ul class="space-y-2">
				{HOTKEY_ACTIONS.map((action) => {
					const binding = hotkeys[action];
					const active = recording === action;
					return (
						<li key={action} class="flex items-center justify-between gap-3">
							<span class="text-[14px] text-ledger-text">
								{h.actions[action]}
							</span>
							<span class="flex items-center gap-1.5">
								<button
									type="button"
									aria-label={h.change(h.actions[action])}
									aria-pressed={active}
									class={`min-w-24 rounded-md border px-2.5 py-1 font-mono text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-ledger-gold ${
										active
											? "border-ledger-gold/60 bg-ledger-gold/15 text-ledger-gold-bright"
											: "border-ledger-border bg-ledger-bg text-ledger-text hover:border-ledger-line"
									}`}
									onClick={() => {
										setProblem(null);
										setRecording(active ? null : action);
									}}
								>
									{active
										? h.recording
										: binding
											? hotkeyLabel(binding, mac)
											: h.unbound}
								</button>
								<button
									type="button"
									aria-label={h.remove(h.actions[action])}
									disabled={!binding}
									class={`${BUTTON} px-2`}
									onClick={() => onSave({ ...hotkeys, [action]: null })}
								>
									×
								</button>
							</span>
						</li>
					);
				})}
			</ul>
			{recording && (
				<p role="status" class="text-[12px] text-ledger-muted">
					{h.recordingHint}
				</p>
			)}
			{problem && <Notice tone="error">{problem}</Notice>}
			<button
				type="button"
				class={BUTTON}
				onClick={() => {
					setRecording(null);
					setProblem(null);
					onSave(DEFAULT_HOTKEYS);
				}}
			>
				{h.reset}
			</button>
		</Section>
	);
}
