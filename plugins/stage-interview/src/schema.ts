import { id, schema, timestamps } from "@zaydemy/db";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const interviewStatus = pgEnum("interview_status", [
	"pending",
	"scheduled",
	"passed",
	"failed",
	"no_show",
	"canceled",
]);

export const interviews = pgTable("interviews", {
	id: id(),
	applicationId: text("application_id")
		.notNull()
		.unique()
		.references(() => schema.applications.id, { onDelete: "cascade" }),
	interviewerId: text("interviewer_id").references(() => schema.users.id, {
		onDelete: "set null",
	}),
	status: interviewStatus("status").notNull().default("pending"),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
	meetingUrl: text("meeting_url"),
	notes: text("notes"),
	...timestamps,
});
