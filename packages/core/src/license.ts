import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";

/**
 * Public key that verifies Zaydemy commercial licences (Ed25519, PEM).
 * Empty until the licensing service is set up, so no licence validates.
 */
export const ZAYDEMY_LICENSE_PUBLIC_KEY = "";

const payloadSchema = z.object({
	licensee: z.string(),
	features: z.array(z.string()),
	expiresAt: z.iso.datetime().optional(),
});

export type License = z.infer<typeof payloadSchema>;

export type LicenseVerifier = (token: string) => License | null;

/** Licence tokens are `<base64url JSON payload>.<base64url Ed25519 signature>`. */
export function createLicenseVerifier(
	publicKeyPem: string,
	now = () => new Date(),
): LicenseVerifier {
	if (!publicKeyPem) return () => null;
	const key = createPublicKey(publicKeyPem);
	return (token) => {
		const [payload, signature] = token.split(".");
		if (!payload || !signature) return null;
		const valid = verify(null, Buffer.from(payload), key, Buffer.from(signature, "base64url"));
		if (!valid) return null;
		const parsed = payloadSchema.safeParse(
			JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
		);
		if (!parsed.success) return null;
		if (parsed.data.expiresAt && new Date(parsed.data.expiresAt) < now()) return null;
		return parsed.data;
	};
}

export const WHITE_LABEL_FEATURE = "white-label";
