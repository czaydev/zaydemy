import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineStage, describeStageOptions, parseMoney, parseStageOptionsForm } from "../src";

const stage = defineStage({
	id: "example",
	label: "example.stage",
	options: z.object({
		amount: z
			.number()
			.int()
			.nonnegative()
			.default(0)
			.meta({ label: "example.amount", format: "money" }),
		currency: z.string().length(3).default("TRY"),
		types: z.array(z.string()).optional(),
		bookingUrl: z.url().optional(),
		strict: z.boolean().default(false),
	}),
});

describe("describeStageOptions", () => {
	it("maps zod fields to form fields with labels and defaults", () => {
		expect(describeStageOptions(stage)).toEqual([
			{ key: "amount", kind: "money", label: "example.amount", required: false, default: 0 },
			{ key: "currency", kind: "text", label: "currency", required: false, default: "TRY" },
			{ key: "types", kind: "list", label: "types", required: false },
			{ key: "bookingUrl", kind: "url", label: "bookingUrl", required: false },
			{ key: "strict", kind: "boolean", label: "strict", required: false, default: false },
		]);
	});

	it("returns nothing for a stage without options", () => {
		expect(describeStageOptions(defineStage({ id: "x", label: "x" }))).toEqual([]);
	});
});

describe("parseStageOptionsForm", () => {
	it("converts form values and leaves empty fields to their defaults", () => {
		expect(parseStageOptionsForm(stage, { amount: "1.250,50", types: "id-card, diploma" })).toEqual(
			{
				ok: true,
				options: { amount: 125_050, types: ["id-card", "diploma"], strict: false },
			},
		);
	});

	it("names the field that does not validate", () => {
		expect(parseStageOptionsForm(stage, { amount: "abc" })).toEqual({ ok: false, field: "amount" });
		expect(parseStageOptionsForm(stage, { bookingUrl: "not a url" })).toEqual({
			ok: false,
			field: "bookingUrl",
		});
	});
});

describe("parseMoney", () => {
	it("accepts Turkish and English separators", () => {
		expect(parseMoney("1.250,50")).toBe(125_050);
		expect(parseMoney("1,250.50")).toBe(125_050);
		expect(parseMoney("500")).toBe(50_000);
		expect(parseMoney("12,5")).toBe(1_250);
		expect(parseMoney("-3")).toBeNull();
	});
});
