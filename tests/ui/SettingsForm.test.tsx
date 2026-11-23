import { render } from "preact";
import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import { createMemorySettings } from "../../src/core/settings";
import { SettingsForm } from "../../src/ui/SettingsForm";

describe("SettingsForm", () => {
	it("shows the stored side and saves a new one", async () => {
		const settings = createMemorySettings();
		const root = document.createElement("div");
		document.body.append(root);
		await act(async () => {
			render(<SettingsForm settings={settings} />, root);
		});
		const radio = (side: string) =>
			root.querySelector<HTMLInputElement>(`input[value=${side}]`);

		expect(radio("left")?.checked).toBe(true);
		await act(async () => {
			radio("right")?.click();
		});
		expect((await settings.load()).panelSide).toBe("right");
		expect(radio("right")?.checked).toBe(true);
	});
});
