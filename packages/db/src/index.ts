import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/** The client or an open transaction; plugin code accepts either. */
export type Database = PgDatabase<NodePgQueryResultHKT, Record<string, unknown>>;

/**
 * Creates a Drizzle client. Plugin tables are merged into the core schema so
 * relational queries work across them.
 */
export function createDatabase(url: string, pluginSchema: Record<string, unknown> = {}) {
	const pool = new Pool({ connectionString: url });
	return drizzle(pool, { schema: { ...schema, ...pluginSchema } });
}

export * from "./schema/columns";
export { schema };

declare module "@zaydemy/core" {
	interface Register {
		db: Database;
	}
}
