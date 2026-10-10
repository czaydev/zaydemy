"use server";

import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requirePermission } from "../admin";
import { slugify } from "../courses";
import { getZaydemy } from "../zaydemy";

type Db = ReturnType<typeof getZaydemy>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

class LockOut extends Error {}

/** Whether `userId` holds `permission` through a role or directly. */
async function holds(tx: Tx, userId: string, permission: string) {
	const result = await tx.execute<{ ok: boolean }>(sql`
		select exists (
			select 1 from ${schema.permissions} p
			left join ${schema.rolePermissions} rp on rp.permission_id = p.id
			left join ${schema.userRoles} ur on ur.role_id = rp.role_id and ur.user_id = ${userId}
			left join ${schema.userPermissions} up on up.permission_id = p.id and up.user_id = ${userId}
			where p.key = ${permission} and (ur.user_id is not null or up.user_id is not null)
		) as ok`);
	return Boolean(result.rows[0]?.ok);
}

/**
 * Runs an access change and rolls it back if the acting admin would lose
 * the right to manage users, so nobody locks themselves out.
 */
async function guarded(actorId: string, change: (tx: Tx) => Promise<void>) {
	try {
		await getZaydemy().db.transaction(async (tx) => {
			await change(tx);
			if (!(await holds(tx, actorId, CORE_PERMISSIONS.manageUsers))) throw new LockOut();
		});
		return true;
	} catch (error) {
		if (error instanceof LockOut) return false;
		throw error;
	}
}

/** Saves a user's roles and how many open applications they may have. */
export async function updateUser(form: FormData) {
	const session = await requirePermission(CORE_PERMISSIONS.manageUsers);
	const userId = String(form.get("userId"));
	const roleIds = form.getAll("roleIds").map(String);
	const limit = Math.max(1, Math.min(20, Number(form.get("applicationLimit")) || 1));
	const ok = await guarded(session.user.id, async (tx) => {
		await tx
			.update(schema.users)
			.set({ applicationLimit: limit })
			.where(eq(schema.users.id, userId));
		await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
		if (roleIds.length > 0) {
			await tx.insert(schema.userRoles).values(roleIds.map((roleId) => ({ userId, roleId })));
		}
	});
	redirect(`/admin/users/${userId}?${ok ? "saved=1" : "error=lockout"}`);
}

/** Replaces the permissions of a role. */
export async function updateRole(form: FormData) {
	const session = await requirePermission(CORE_PERMISSIONS.manageUsers);
	const roleId = String(form.get("roleId"));
	const keys = form.getAll("permissions").map(String);
	const ok = await guarded(session.user.id, async (tx) => {
		await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId));
		if (keys.length === 0) return;
		const rows = await tx
			.select({ id: schema.permissions.id })
			.from(schema.permissions)
			.where(inArray(schema.permissions.key, keys));
		if (rows.length > 0) {
			await tx
				.insert(schema.rolePermissions)
				.values(rows.map((p) => ({ roleId, permissionId: p.id })));
		}
	});
	redirect(`/admin/roles?${ok ? "saved=1" : "error=lockout"}#${roleId}`);
}

/** Adds an empty role. */
export async function createRole(form: FormData) {
	await requirePermission(CORE_PERMISSIONS.manageUsers);
	const name = String(form.get("name") ?? "").trim();
	const key = slugify(name);
	if (name && key) {
		await getZaydemy().db.insert(schema.roles).values({ key, name }).onConflictDoNothing();
	}
	redirect("/admin/roles");
}

/** Deletes a role; users who held it lose it. */
export async function deleteRole(form: FormData) {
	const session = await requirePermission(CORE_PERMISSIONS.manageUsers);
	const roleId = String(form.get("roleId"));
	const ok = await guarded(session.user.id, async (tx) => {
		await tx.delete(schema.roles).where(eq(schema.roles.id, roleId));
	});
	redirect(`/admin/roles?${ok ? "saved=1" : "error=lockout"}`);
}
