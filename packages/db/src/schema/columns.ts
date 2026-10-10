import { text, timestamp } from "drizzle-orm/pg-core";

/** Text primary key with a random UUID default. */
export const id = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

export const timestamps = {
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
};
