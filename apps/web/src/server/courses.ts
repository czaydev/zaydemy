import "server-only";
import { describeStageOptions, type StageOptionField, type Translate } from "@zaydemy/core";
import { resolvedConfig } from "./zaydemy";

export interface StageSection {
	id: string;
	label: string;
	pipelines: string[];
	fields: (Omit<StageOptionField, "default"> & { hint?: string; placeholder?: string })[];
}

/** Stages used by some pipeline that have options a course can set, with translated labels. */
export function stageSections(t: Translate): StageSection[] {
	const used = new Map<string, string[]>();
	for (const [name, stages] of Object.entries(resolvedConfig.pipelines)) {
		for (const id of stages) used.set(id, [...(used.get(id) ?? []), name]);
	}
	return [...used.entries()].flatMap(([id, pipelines]) => {
		const stage = resolvedConfig.stages.get(id);
		if (!stage) return [];
		const fields = describeStageOptions(stage).map(({ default: fallback, ...field }) => ({
			...field,
			label: t(field.label),
			hint: field.hint ? t(field.hint) : undefined,
			placeholder:
				fallback === undefined || field.kind === "boolean"
					? undefined
					: field.kind === "money"
						? formatMajor(Number(fallback))
						: String(fallback),
		}));
		return fields.length > 0 ? [{ id, label: t(stage.label), pipelines, fields }] : [];
	});
}

/** Minor units → "1250.5" style text for a money input. */
export function formatMajor(minor: number): string {
	return (minor / 100).toString();
}

/** Form values for one course's stage options, keyed `stage.<id>.<option>`. */
export function stageOptionValues(
	sections: StageSection[],
	options: Record<string, unknown>,
): Record<string, string> {
	const values: Record<string, string> = {};
	for (const section of sections) {
		const stageOptions = (options[section.id] ?? {}) as Record<string, unknown>;
		for (const field of section.fields) {
			const value = stageOptions[field.key];
			if (value === undefined || value === null) continue;
			values[`stage.${section.id}.${field.key}`] =
				field.kind === "money"
					? formatMajor(Number(value))
					: Array.isArray(value)
						? value.join(", ")
						: String(value);
		}
	}
	return values;
}

/** URL-friendly slug, folding Turkish letters. */
export function slugify(text: string): string {
	const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
	return text
		.toLocaleLowerCase("tr")
		.replace(/[çğıöşü]/g, (c) => map[c] ?? c)
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
