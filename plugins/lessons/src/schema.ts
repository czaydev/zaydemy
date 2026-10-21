import { schema } from "@zaydemy/db";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const sections = pgTable("course_sections", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	courseId: text("course_id")
		.notNull()
		.references(() => schema.courses.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	order: integer("order").notNull().default(0),
});

export const lessons = pgTable("course_lessons", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	sectionId: text("section_id")
		.notNull()
		.references(() => sections.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	order: integer("order").notNull().default(0),
	isPublished: boolean("is_published").notNull().default(false),
	openAt: timestamp("open_at"),
});
