import { definePlugin, resolveConfig } from "@zaydemy/core";
import { describe, expect, it } from "vitest";
import { createTranslator, negotiateLocale } from "../src";

const plugin = definePlugin({
	id: "x",
	name: "X",
	version: "0",
	messages: {
		tr: { x: { hello: "Merhaba {name}", onlyTr: "Sadece TR" } },
		en: { x: { hello: "Hello {name}" } },
	},
});
const config = resolveConfig({
	brand: { name: "T", slug: "t" },
	locales: { default: "tr", supported: ["tr", "en"] },
	plugins: [plugin],
	pipelines: { default: [] },
});

describe("createTranslator", () => {
	it("reads core and plugin strings with interpolation", () => {
		const t = createTranslator(config, "en");
		expect(t("x.hello", { name: "Ada" })).toBe("Hello Ada");
		expect(t("application.status.enrolled")).toBe("Enrolled");
	});

	it("falls back to the default locale, then to the key", () => {
		const t = createTranslator(config, "en");
		expect(t("x.onlyTr")).toBe("Sadece TR");
		expect(t("x.missing")).toBe("x.missing");
	});
});

describe("negotiateLocale", () => {
	it("uses the first supported language", () => {
		expect(negotiateLocale(config, undefined, "de-DE,en-US;q=0.8,tr;q=0.5")).toBe("en");
		expect(negotiateLocale(config, "fr")).toBe("tr");
	});
});
