import { id, schema, timestamps } from "@zaydemy/db";
import { boolean, integer, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const documentFormat = pgEnum("document_format", ["pdf", "image"]);
export const documentStatus = pgEnum("document_status", ["uploaded", "approved", "rejected"]);

/** A document applicants may be asked for, e.g. an ID card copy or a diploma. */
export const documentTypes = pgTable("document_types", {
	id: id(),
	/** Used in course stage options: `{ documents: { types: ["diploma"] } }`. */
	key: text("key").notNull().unique(),
	name: text("name").notNull(),
	description: text("description"),
	format: documentFormat("format").notNull().default("pdf"),
	isActive: boolean("is_active").notNull().default(true),
	sortOrder: integer("sort_order").notNull().default(0),
	...timestamps,
});

/** The latest file a user uploaded for a document type; reused across applications. */
export const userDocuments = pgTable(
	"user_documents",
	{
		id: id(),
		userId: text("user_id")
			.notNull()
			.references(() => schema.users.id, { onDelete: "cascade" }),
		documentTypeId: text("document_type_id")
			.notNull()
			.references(() => documentTypes.id, { onDelete: "cascade" }),
		storageKey: text("storage_key").notNull(),
		fileName: text("file_name").notNull(),
		contentType: text("content_type").notNull(),
		size: integer("size").notNull(),
		status: documentStatus("status").notNull().default("uploaded"),
		/** Why staff rejected the file, shown to the applicant. */
		reviewNote: text("review_note"),
		reviewedBy: text("reviewed_by").references(() => schema.users.id, { onDelete: "set null" }),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		...timestamps,
	},
	(t) => [unique("user_documents_unique").on(t.userId, t.documentTypeId)],
);

export type DocumentType = typeof documentTypes.$inferSelect;
export type UserDocument = typeof userDocuments.$inferSelect;
