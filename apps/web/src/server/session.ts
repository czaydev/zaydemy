import "server-only";
import type { PluginSession } from "@zaydemy/core";
import { headers } from "next/headers";
import { cache } from "react";
import { getZaydemy } from "./zaydemy";

/** Current session with roles and permissions, or null when signed out. */
export const getSession = cache(async () => {
	return getZaydemy().auth.api.getSession({ headers: await headers() });
});

/** The session in the shape plugins receive. */
export async function getPluginSession(): Promise<PluginSession | null> {
	return toPluginSession(await getSession());
}

export function toPluginSession(
	session: Awaited<ReturnType<typeof getSession>>,
): PluginSession | null {
	if (!session) return null;
	const { id, email, name, phoneNumber } = session.user as typeof session.user & {
		phoneNumber?: string | null;
	};
	return {
		user: { id, email, name, phoneNumber },
		roles: session.roles,
		permissions: session.permissions,
	};
}
