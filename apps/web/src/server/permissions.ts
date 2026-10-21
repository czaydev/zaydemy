import "server-only";
import { schema } from "@zaydemy/db";
import { getZaydemy, resolvedConfig } from "./zaydemy";

/**
 * Makes sure every permission the core and enabled plugins declare exists in
 * the database, so a newly enabled plugin's permissions can be granted
 * without re-running the seed.
 */
export async function syncPermissions() {
	if (resolvedConfig.permissions.length === 0) return;
	await getZaydemy()
		.db.insert(schema.permissions)
		.values(resolvedConfig.permissions)
		.onConflictDoNothing();
}
