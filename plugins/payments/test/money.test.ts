import { describe, expect, it } from "vitest";
import { formatMoney, parseAmount, toDecimal } from "../src/money";
import { createReference } from "../src/reference";

describe("money", () => {
	it("formats minor units for providers", () => {
		expect(toDecimal(150000)).toBe("1500.00");
		expect(toDecimal(5)).toBe("0.05");
	});

	it("parses amounts typed in Turkish or English notation", () => {
		expect(parseAmount("1500")).toBe(150000);
		expect(parseAmount("1.500")).toBe(150000);
		expect(parseAmount("1.500,50")).toBe(150050);
		expect(parseAmount("1,500.5")).toBe(150050);
		expect(parseAmount("12,5")).toBe(1250);
		expect(parseAmount("0")).toBeNull();
		expect(parseAmount("abc")).toBeNull();
	});

	it("formats for display in the user's locale", () => {
		expect(formatMoney(150000, "TRY", "tr")).toBe("₺1.500,00");
	});
});

describe("createReference", () => {
	it("is alphanumeric so every provider accepts it as an order id", () => {
		expect(createReference()).toMatch(/^PAY[0-9A-Z]{10}$/);
	});
});
