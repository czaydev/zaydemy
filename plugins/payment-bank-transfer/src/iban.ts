/** Normalises an IBAN to upper case without spaces. */
export function normalizeIban(input: string): string {
	return input.replace(/\s+/g, "").toUpperCase();
}

/** ISO 13616 check: country code, check digits and mod-97 checksum. */
export function isValidIban(input: string): boolean {
	const iban = normalizeIban(input);
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
	const rearranged = iban.slice(4) + iban.slice(0, 4);
	let remainder = 0;
	for (const char of rearranged) {
		const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
		for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
	}
	return remainder === 1;
}

/** Groups an IBAN in blocks of four for display. */
export function formatIban(iban: string): string {
	return normalizeIban(iban)
		.replace(/(.{4})/g, "$1 ")
		.trim();
}
