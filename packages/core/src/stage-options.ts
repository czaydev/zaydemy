import { z } from "zod";

/**
 * How a stage option is edited in the admin course form. Plugins describe
 * their options with zod; `.meta({ label, hint, format: "money" })` on a field
 * gives it a translated label, a hint and, for amounts in minor units, a
 * money input.
 */
export type StageOptionKind = "money" | "number" | "text" | "url" | "list" | "boolean";

export interface StageOptionField {
	key: string;
	kind: StageOptionKind;
	/** i18n key, or the option name when the plugin gave none. */
	label: string;
	hint?: string;
	required: boolean;
	default?: unknown;
}

/** Anything with a stage's options schema. */
type WithOptions = { options?: z.ZodType };

interface JsonSchemaProperty {
	type?: string | string[];
	format?: string;
	label?: string;
	hint?: string;
	default?: unknown;
	items?: { type?: string };
}

/** Lists the editable options of a stage, in declaration order. */
export function describeStageOptions(stage: WithOptions): StageOptionField[] {
	if (!stage.options) return [];
	const schema = z.toJSONSchema(stage.options, { io: "input", unrepresentable: "any" }) as {
		properties?: Record<string, JsonSchemaProperty>;
		required?: string[];
	};
	const required = new Set(schema.required ?? []);
	return Object.entries(schema.properties ?? {}).flatMap(([key, prop]): StageOptionField[] => {
		const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
		let kind: StageOptionKind | undefined;
		if (prop.format === "money") kind = "money";
		else if (type === "integer" || type === "number") kind = "number";
		else if (type === "boolean") kind = "boolean";
		else if (type === "array" && prop.items?.type === "string") kind = "list";
		else if (type === "string") kind = prop.format === "uri" ? "url" : "text";
		if (!kind) return [];
		return [
			{
				key,
				kind,
				label: prop.label ?? key,
				hint: prop.hint,
				required: required.has(key) && prop.default === undefined,
				default: prop.default,
			},
		];
	});
}

/**
 * Turns the course form's raw values for one stage back into options and
 * validates them with the stage's schema. Empty fields are left out so
 * defaults apply. Money is entered in major units ("1.250,50" or "1250.50").
 */
export function parseStageOptionsForm(
	stage: WithOptions,
	values: Record<string, string | undefined>,
): { ok: true; options: Record<string, unknown> } | { ok: false; field?: string } {
	const raw: Record<string, unknown> = {};
	for (const field of describeStageOptions(stage)) {
		const value = values[field.key]?.trim();
		if (field.kind === "boolean") {
			raw[field.key] = value === "on" || value === "true";
			continue;
		}
		if (!value) continue;
		if (field.kind === "money") {
			const amount = parseMoney(value);
			if (amount === null) return { ok: false, field: field.key };
			raw[field.key] = amount;
		} else if (field.kind === "number") {
			const number = Number(value);
			if (!Number.isFinite(number)) return { ok: false, field: field.key };
			raw[field.key] = number;
		} else if (field.kind === "list") {
			raw[field.key] = value
				.split(/[,\n]/)
				.map((item) => item.trim())
				.filter(Boolean);
		} else {
			raw[field.key] = value;
		}
	}
	if (!stage.options) return { ok: true, options: {} };
	const parsed = stage.options.safeParse(raw);
	if (!parsed.success) {
		const field = parsed.error.issues[0]?.path[0];
		return { ok: false, field: typeof field === "string" ? field : undefined };
	}
	// Store what the admin entered, not the expanded defaults, so later default changes apply.
	return { ok: true, options: raw };
}

/** "1.250,50", "1250.50" or "1250" in major units → minor units, or null. */
export function parseMoney(value: string): number | null {
	let normalized = value.replace(/\s/g, "");
	const lastComma = normalized.lastIndexOf(",");
	const lastDot = normalized.lastIndexOf(".");
	if (lastComma > lastDot) normalized = normalized.replace(/\./g, "").replace(",", ".");
	else normalized = normalized.replace(/,/g, "");
	if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
	return Math.round(Number(normalized) * 100);
}
