import { index, jsonb, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { courses, deliveryMode, terms } from "./catalog";
import { id, timestamps } from "./columns";

export const applicationStatus = pgEnum("application_status", [
	"in_progress",
	"enrolled",
	"rejected",
	"withdrawn",
]);

export const stageStatus = pgEnum("stage_status", [
	"pending",
	"active",
	"completed",
	"skipped",
	"failed",
]);

export const applications = pgTable(
	"applications",
	{
		id: id(),
		/** Human-friendly public reference shown to applicants. */
		reference: text("reference").notNull().unique(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		courseId: text("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "restrict" }),
		termId: text("term_id").references(() => terms.id, { onDelete: "set null" }),
		deliveryMode: deliveryMode("delivery_mode").notNull(),
		status: applicationStatus("status").notNull().default("in_progress"),
		/** Stage ids frozen at creation, so config changes never break running applications. */
		pipeline: text("pipeline").array().notNull(),
		currentStage: text("current_stage"),
		/** Answers to extra form fields contributed by plugins. */
		formData: jsonb("form_data").$type<Record<string, unknown>>().notNull().default({}),
		...timestamps,
	},
	(t) => [
		index("applications_user_idx").on(t.userId),
		index("applications_course_idx").on(t.courseId),
	],
);

export const applicationStages = pgTable(
	"application_stages",
	{
		id: id(),
		applicationId: text("application_id")
			.notNull()
			.references(() => applications.id, { onDelete: "cascade" }),
		stage: text("stage").notNull(),
		status: stageStatus("status").notNull().default("pending"),
		data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
		startedAt: timestamp("started_at", { withTimezone: true }),
		finishedAt: timestamp("finished_at", { withTimezone: true }),
		...timestamps,
	},
	(t) => [unique("application_stages_unique").on(t.applicationId, t.stage)],
);

export const applicationEvents = pgTable(
	"application_events",
	{
		id: id(),
		applicationId: text("application_id")
			.notNull()
			.references(() => applications.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		stage: text("stage"),
		actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
		payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [index("application_events_application_idx").on(t.applicationId)],
);
