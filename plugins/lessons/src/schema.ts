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
	isPublished: boolean("is_published").notNull().default(true),
	openAt: timestamp("open_at"),
});

export const lessons = pgTable("course_lessons", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	sectionId: text("section_id")
		.notNull()
		.references(() => sections.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	body: text("body"),
	order: integer("order").notNull().default(0),
	isPublished: boolean("is_published").notNull().default(false),
	openAt: timestamp("open_at"),
});

export const lessonAttachments = pgTable("lesson_attachments", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	lessonId: text("lesson_id")
		.notNull()
		.references(() => lessons.id, { onDelete: "cascade" }),
	fileKey: text("file_key").notNull(),
	name: text("name").notNull(),
	size: integer("size").notNull(),
	type: text("type").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
