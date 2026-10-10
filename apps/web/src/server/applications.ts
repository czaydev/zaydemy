import "server-only";
import { randomInt } from "node:crypto";
import { schema } from "@zaydemy/db";
import { and, count, eq } from "drizzle-orm";
import { getZaydemy } from "./zaydemy";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function createReference() {
	let out = "APP";
	for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
	return out;
}

export type ApplyResult = { ok: true } | { ok: false; error: "course_closed" | "limit_reached" };

/** Creates an application on the course's pipeline and enters its first stage. */
export async function applyToCourse(userId: string, courseId: string): Promise<ApplyResult> {
	const app = getZaydemy();
	const { db } = app;
	const [course] = await db
		.select()
		.from(schema.courses)
		.where(and(eq(schema.courses.id, courseId), eq(schema.courses.isOpen, true)));
	if (!course || course.archivedAt) return { ok: false, error: "course_closed" };

	const [user] = await db
		.select({ limit: schema.users.applicationLimit })
		.from(schema.users)
		.where(eq(schema.users.id, userId));
	const [open] = await db
		.select({ value: count() })
		.from(schema.applications)
		.where(
			and(eq(schema.applications.userId, userId), eq(schema.applications.status, "in_progress")),
		);
	if ((open?.value ?? 0) >= (user?.limit ?? 1)) return { ok: false, error: "limit_reached" };

	const [created] = await db
		.insert(schema.applications)
		.values({
			reference: createReference(),
			userId,
			courseId,
			deliveryMode: course.deliveryModes[0] ?? "in_person",
			pipeline: app.engine.pipelineFor(course.pipeline),
		})
		.returning({ id: schema.applications.id });
	if (!created) throw new Error("Application insert returned no row.");
	await app.engine.start(created.id, userId);
	return { ok: true };
}
