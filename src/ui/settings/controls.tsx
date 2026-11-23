import type { ComponentChildren } from "preact";

export function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ComponentChildren;
}) {
	return (
		<section class="rounded-lg border border-ledger-border bg-ledger-panel p-5">
			<h2 class="font-display text-[19px] tracking-[0.02em] text-ledger-gold-bright">
				{title}
			</h2>
			{description && (
				<p class="mt-1 text-[13px] text-ledger-muted">{description}</p>
			)}
			<div class="mt-4 space-y-5">{children}</div>
		</section>
	);
}

export function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ComponentChildren;
}) {
	return (
		<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
			<div class="min-w-[12rem] flex-1">
				<p class="text-[14px] text-ledger-text">{label}</p>
				{hint && (
					<p class="mt-0.5 text-[12px] leading-5 text-ledger-muted">{hint}</p>
				)}
			</div>
			<div class="shrink-0">{children}</div>
		</div>
	);
}

export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: readonly { value: T; label: string }[];
	onChange: (value: T) => void;
}) {
	return (
		<fieldset class="inline-flex rounded-md border border-ledger-border bg-ledger-bg p-0.5">
			<legend class="sr-only">{label}</legend>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<label
						key={option.value}
						class={`cursor-pointer rounded px-3 py-1 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ledger-gold ${
							selected
								? "bg-ledger-raised text-ledger-gold-bright"
								: "text-ledger-muted hover:text-ledger-text"
						}`}
					>
						<input
							type="radio"
							class="sr-only"
							name={label}
							value={option.value}
							checked={selected}
							onChange={() => onChange(option.value)}
						/>
						{option.label}
					</label>
				);
			})}
		</fieldset>
	);
}

export function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			class={`relative h-6 w-11 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-gold ${
				checked
					? "border-ledger-gold/60 bg-ledger-gold/30"
					: "border-ledger-border bg-ledger-bg"
			}`}
			onClick={() => onChange(!checked)}
		>
			<span
				class={`absolute top-0.5 left-0.5 size-[18px] rounded-full transition-transform duration-200 ${
					checked ? "translate-x-5 bg-ledger-gold-bright" : "bg-ledger-muted"
				}`}
			/>
		</button>
	);
}

export const BUTTON =
	"inline-flex items-center gap-1.5 rounded-md border border-ledger-border bg-ledger-raised px-3 py-1.5 text-[13px] text-ledger-text transition-colors hover:border-ledger-line hover:text-ledger-gold-bright focus-visible:outline-2 focus-visible:outline-ledger-gold disabled:cursor-not-allowed disabled:opacity-50";

export const PRIMARY_BUTTON =
	"inline-flex items-center gap-1.5 rounded-md border border-ledger-gold/50 bg-ledger-gold/15 px-3 py-1.5 text-[13px] font-semibold text-ledger-gold transition-colors hover:bg-ledger-gold/25 hover:text-ledger-gold-bright focus-visible:outline-2 focus-visible:outline-ledger-gold disabled:cursor-not-allowed disabled:opacity-50";

export function Notice({
	tone,
	children,
}: {
	tone: "ok" | "error";
	children: ComponentChildren;
}) {
	return (
		<p
			role={tone === "error" ? "alert" : "status"}
			class={`animate-fade-in rounded-md border px-3 py-2 text-[13px] ${
				tone === "ok"
					? "border-ledger-live/40 bg-ledger-live/10 text-ledger-live"
					: "border-red-400/40 bg-red-950/40 text-red-300"
			}`}
		>
			{children}
		</p>
	);
}
