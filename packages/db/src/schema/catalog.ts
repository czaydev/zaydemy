import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { id, timestamps } from "./columns";

export const deliveryMode = pgEnum("delivery_mode", ["online", "in_person"]);

export const courseCategories = pgTable("course_categories", {
	id: id(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	...timestamps,
});

export const courses = pgTable("courses", {
	id: id(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description"),
	categoryId: text("category_id")
		.notNull()
		.references(() => courseCategories.id, { onDelete: "restrict" }),
	deliveryModes: deliveryMode("delivery_modes").array().notNull().default(["in_person"]),
	/** Key of a pipeline declared in zaydemy.config.ts; null uses the default pipeline. */
	pipeline: text("pipeline"),
	/** Per-stage options for this course, keyed by stage id (e.g. prepayment amount). */
	stageOptions: jsonb("stage_options").$type<Record<string, unknown>>().notNull().default({}),
	isOpen: boolean("is_open").notNull().default(true),
	archivedAt: timestamp("archived_at", { withTimezone: true }),
	...timestamps,
});

export const terms = pgTable("terms", {
	id: id(),
	number: integer("number").notNull().unique(),
	name: text("name"),
	isActive: boolean("is_active").notNull().default(false),
	...timestamps,
});
