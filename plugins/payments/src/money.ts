import type { Locale } from "@zaydemy/core";

/** Formats an amount in minor units for display, e.g. 150000 → "₺1.500,00". */
export function formatMoney(amount: number, currency: string, locale: Locale): string {
	return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount / 100);
}

/** Minor units as a decimal string with two places, as payment APIs expect: 150000 → "1500.00". */
export function toDecimal(amount: number): string {
	const sign = amount < 0 ? "-" : "";
	const abs = Math.abs(amount);
	return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Parses a decimal amount typed by staff ("1500", "1.500,50", "1500.5") into minor units. */
export function parseAmount(input: string): number | null {
	const cleaned = input.trim().replace(/\s/g, "");
	if (!/^\d{1,3}([.,]?\d{3})*([.,]\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(cleaned)) return null;
	const match = /^(.*?)(?:[.,](\d{1,2}))?$/.exec(cleaned);
	const whole = (match?.[1] ?? "").replace(/[.,]/g, "");
	const fraction = (match?.[2] ?? "").padEnd(2, "0");
	const value = Number(whole) * 100 + Number(fraction || "0");
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}
