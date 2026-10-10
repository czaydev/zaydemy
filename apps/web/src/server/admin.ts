import "server-only";
import type { PluginSession } from "@zaydemy/core";
import { notFound, redirect } from "next/navigation";
import { getPluginSession } from "./session";

/** The signed-in user if they hold `permission`; otherwise sign-in or 404. */
export async function requirePermission(permission: string): Promise<PluginSession> {
	const session = await getPluginSession();
	if (!session) redirect("/auth/sign-in");
	if (!session.permissions.includes(permission)) notFound();
	return session;
}

export const PAGE_SIZE = 50;

/** 1-based page number from a search param. */
export function pageNumber(value: string | string[] | undefined): number {
	const page = Number(Array.isArray(value) ? value[0] : value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export function param(value: string | string[] | undefined): string | undefined {
	const first = Array.isArray(value) ? value[0] : value;
	return first?.trim() || undefined;
}
