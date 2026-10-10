import { type Database, schema } from "@zaydemy/db";
import { eq } from "drizzle-orm";

const { permissions, rolePermissions, roles, userPermissions, userRoles } = schema;

export interface UserAccess {
	roles: string[];
	permissions: string[];
}

/** Role keys plus the union of role and direct permissions for a user. */
export async function getUserAccess(db: Database, userId: string): Promise<UserAccess> {
	const [roleRows, rolePermissionRows, directRows] = await Promise.all([
		db
			.select({ key: roles.key })
			.from(userRoles)
			.innerJoin(roles, eq(roles.id, userRoles.roleId))
			.where(eq(userRoles.userId, userId)),
		db
			.select({ key: permissions.key })
			.from(userRoles)
			.innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
			.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
			.where(eq(userRoles.userId, userId)),
		db
			.select({ key: permissions.key })
			.from(userPermissions)
			.innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
			.where(eq(userPermissions.userId, userId)),
	]);
	return {
		roles: roleRows.map((r) => r.key),
		permissions: [...new Set([...rolePermissionRows, ...directRows].map((r) => r.key))],
	};
}

export function can(access: UserAccess, permission: string): boolean {
	return access.permissions.includes(permission);
}
