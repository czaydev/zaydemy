import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { id, timestamps } from "./columns";

export const roles = pgTable("roles", {
	id: id(),
	key: text("key").notNull().unique(),
	name: text("name").notNull(),
	...timestamps,
});

export const permissions = pgTable("permissions", {
	id: id(),
	key: text("key").notNull().unique(),
	name: text("name").notNull(),
	...timestamps,
});

export const rolePermissions = pgTable(
	"role_permissions",
	{
		roleId: text("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		permissionId: text("permission_id")
			.notNull()
			.references(() => permissions.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoles = pgTable(
	"user_roles",
	{
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		roleId: text("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const userPermissions = pgTable(
	"user_permissions",
	{
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		permissionId: text("permission_id")
			.notNull()
			.references(() => permissions.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.userId, t.permissionId] })],
);
