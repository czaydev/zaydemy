import { randomInt } from "node:crypto";

// Crockford base32: no I, L, O or U, so references are easy to read out loud.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A short reference such as `PAY7K3QH2M9XD`. Alphanumeric only, because some
 * providers (PayTR) reject other characters in order ids.
 */
export function createReference(prefix = "PAY", length = 10): string {
	let out = prefix;
	for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
	return out;
}
