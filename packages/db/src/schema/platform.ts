import { boolean, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { id, timestamps } from "./columns";

export const notifications = pgTable("notifications", {
	id: id(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	body: text("body"),
	targetUrl: text("target_url"),
	isSystem: boolean("is_system").notNull().default(false),
	readAt: timestamp("read_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const policies = pgTable("policies", {
	id: id(),
	key: text("key").notNull().unique(),
	name: text("name").notNull(),
	version: text("version").notNull(),
	content: text("content").notNull(),
	...timestamps,
});

export const policyAcceptances = pgTable(
	"policy_acceptances",
	{
		id: id(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		policyKey: text("policy_key").notNull(),
		policyVersion: text("policy_version").notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [unique("policy_acceptances_unique").on(t.userId, t.policyKey, t.policyVersion)],
);

/** Key/value runtime settings; plugins namespace their keys as `<pluginId>.<key>`. */
export const settings = pgTable("settings", {
	key: text("key").primaryKey(),
	value: jsonb("value").notNull(),
	...timestamps,
});
