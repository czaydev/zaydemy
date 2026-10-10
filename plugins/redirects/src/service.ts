import type { Zaydemy } from "@zaydemy/core";
import { and, eq, sql } from "drizzle-orm";
import { type Redirect, redirects } from "./schema";

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeTarget(url: string): boolean {
	try {
		const { protocol } = new URL(url);
		return protocol === "https:" || protocol === "http:";
	} catch {
		return false;
	}
}

/** Finds an active redirect and counts the visit in the same statement. */
export async function follow(db: Zaydemy["db"], slug: string): Promise<Redirect | null> {
	const [row] = await db
		.update(redirects)
		.set({ clicks: sql`${redirects.clicks} + 1` })
		.where(and(eq(redirects.slug, slug), eq(redirects.isActive, true)))
		.returning();
	return row ?? null;
}
