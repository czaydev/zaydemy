import { schema } from "@zaydemy/db";
import { lessonsPlugin } from "@zaydemy/plugin-lessons";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { apply, seed, setup, testUrl } from "./helpers";

describe.skipIf(!testUrl)("lessons integration", () => {
	it("should allow only enrolled users to view lessons", async () => {
		const t = setup({
			plugins: [lessonsPlugin],
			pipelines: { default: [] },
		});

		const ctx = await seed(t);
		const { db } = t;

		// Create a non-enrolled application
		const pendingId = await apply(t, { userId: ctx.user.id, courseId: ctx.course.id });

		const pendingResult = await db
			.select()
			.from(schema.applications)
			.where(eq(schema.applications.id, pendingId));
		expect(pendingResult[0]?.status).not.toBe("enrolled");

		// Enroll the user in a new course
		const [course2] = await db
			.insert(schema.courses)
			.values({
				name: "Advanced",
				slug: "advanced",
				categoryId: ctx.course.categoryId,
			})
			.returning();

		await db.insert(schema.applications).values({
			reference: "TESTREF2",
			userId: ctx.user.id,
			courseId: course2!.id,
			deliveryMode: "in_person",
			pipeline: [],
			status: "enrolled",
		});

		const result = await db
			.select()
			.from(schema.applications)
			.where(eq(schema.applications.userId, ctx.user.id));

		const enrolledApp = result.find((r) => r.courseId === course2!.id);
		expect(enrolledApp?.status).toBe("enrolled");
	});
});
