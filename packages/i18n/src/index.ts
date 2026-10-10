import type { Locale, Messages, ResolvedConfig, Translate } from "@zaydemy/core";
import { coreMessages } from "./messages";

export type { Translate };

/** Deep-merges message trees; later trees win. */
export function mergeMessages(...trees: (Messages | undefined)[]): Messages {
	const out: Messages = {};
	for (const tree of trees) {
		if (!tree) continue;
		for (const [key, value] of Object.entries(tree)) {
			const existing = out[key];
			out[key] =
				typeof value === "object" && typeof existing === "object"
					? mergeMessages(existing, value)
					: value;
		}
	}
	return out;
}

function lookup(messages: Messages, key: string): string | undefined {
	let node: string | Messages | undefined = messages;
	for (const part of key.split(".")) {
		if (typeof node !== "object") return undefined;
		node = node[part];
	}
	return typeof node === "string" ? node : undefined;
}

/**
 * Builds a translator for a locale. Missing keys fall back to the default
 * locale, then to the key itself so gaps are visible rather than blank.
 */
export function createTranslator(config: ResolvedConfig, locale: Locale): Translate {
	const fallbackLocale = config.locales.default;
	const primary = mergeMessages(coreMessages[locale], config.messages[locale]);
	const fallback =
		locale === fallbackLocale
			? primary
			: mergeMessages(coreMessages[fallbackLocale], config.messages[fallbackLocale]);

	return (key, values) => {
		const template = lookup(primary, key) ?? lookup(fallback, key) ?? key;
		return values
			? template.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
			: template;
	};
}

/** Picks the best supported locale from an Accept-Language header or cookie value. */
export function negotiateLocale(
	config: Pick<ResolvedConfig, "locales">,
	...candidates: (string | null | undefined)[]
): Locale {
	const supported = config.locales.supported;
	for (const candidate of candidates) {
		if (!candidate) continue;
		for (const part of candidate.split(",")) {
			const tag = part.split(";")[0]?.trim().toLowerCase().slice(0, 2);
			const match = supported.find((l) => l === tag);
			if (match) return match;
		}
	}
	return config.locales.default;
}

export { coreMessages };
