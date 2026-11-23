import { useEffect, useState } from "preact/hooks";
import {
	DEFAULT_SETTINGS,
	PANEL_SIDES,
	type Settings,
	type SettingsSource,
} from "../core/settings";

const SIDE_LABELS = { left: "Left", right: "Right" } as const;

export function SettingsForm({ settings }: { settings: SettingsSource }) {
	const [current, setCurrent] = useState<Settings>(DEFAULT_SETTINGS);
	useEffect(() => {
		let active = true;
		settings.load().then((s) => {
			if (active) setCurrent(s);
		});
		const stop = settings.watch(setCurrent);
		return () => {
			active = false;
			stop();
		};
	}, [settings]);

	return (
		<fieldset class="flex items-center gap-3">
			<legend class="mb-1 text-ledger-muted">Panel side</legend>
			{PANEL_SIDES.map((side) => (
				<label key={side} class="flex items-center gap-1">
					<input
						type="radio"
						name="panel-side"
						value={side}
						checked={current.panelSide === side}
						onChange={() => settings.save({ panelSide: side })}
					/>
					{SIDE_LABELS[side]}
				</label>
			))}
		</fieldset>
	);
}
