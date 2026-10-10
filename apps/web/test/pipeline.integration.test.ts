import { bootstrap, resolveConfig } from "@zaydemy/core";
import { createDatabase, schema } from "@zaydemy/db";
import { DrizzlePipelineStore } from "@zaydemy/db/pipeline-store";
import { decideInterview, interviewPlugin, interviews } from "@zaydemy/plugin-stage-interview";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, describe, expect, it } from "vitest";

// Runs against a real Postgres: TEST_DATABASE_URL=postgres://… pnpm test
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("pipeline on Postgres", () => {
	const config = resolveConfig({
		brand: { name: "Test", slug: "test" },
		locales: { default: "tr", supported: ["tr"] },
		plugins: [interviewPlugin],
		pipelines: { default: ["interview"], free: [] },
	});
	const db = createDatabase(url as string, config.schema);
	const app = bootstrap(config, {
		db,
		store: new DrizzlePipelineStore(db),
		baseUrl: "http://localhost:3000",
	});

	let userId: string;
	let courseId: string;

	beforeAll(async () => {
		await migrate(db, { migrationsFolder: "./drizzle" });
		await db.execute(sql`truncate users, course_categories cascade`);
		const [user] = await db
			.insert(schema.users)
			.values({ email: "a@example.com", name: "A" })
			.returning();
		const [category] = await db
			.insert(schema.courseCategories)
			.values({ name: "Dev", slug: "dev" })
			.returning();
		const [course] = await db
			.insert(schema.courses)
			.values({ name: "Bootcamp", slug: "bootcamp", categoryId: category!.id })
			.returning();
		userId = user!.id;
		courseId = course!.id;
	});

	async function apply(pipeline: string) {
		const [row] = await db
			.insert(schema.applications)
			.values({
				reference: crypto.randomUUID().slice(0, 8),
				userId,
				courseId,
				deliveryMode: "in_person",
				pipeline: app.engine.pipelineFor(pipeline),
			})
			.returning();
		await app.engine.start(row!.id);
		return row!.id;
	}

	const getApplication = async (id: string) =>
		(await db.select().from(schema.applications).where(eq(schema.applications.id, id)))[0];

	it("opens an interview, and passing it enrols the applicant", async () => {
		const id = await apply("default");
		expect(await getApplication(id)).toMatchObject({
			status: "in_progress",
			currentStage: "interview",
		});
		const [interview] = await db.select().from(interviews).where(eq(interviews.applicationId, id));
		expect(interview?.status).toBe("pending");

		await decideInterview(app, { applicationId: id, passed: true });
		expect(await getApplication(id)).toMatchObject({ status: "enrolled", currentStage: null });
		const events = await db
			.select({ type: schema.applicationEvents.type })
			.from(schema.applicationEvents)
			.where(eq(schema.applicationEvents.applicationId, id));
		expect(events.map((e) => e.type)).toEqual([
			"application.created",
			"stage.entered",
			"stage.completed",
			"application.enrolled",
		]);
	});

	it("rejects the application when the interview fails", async () => {
		const id = await apply("default");
		await decideInterview(app, { applicationId: id, passed: false });
		expect((await getApplication(id))?.status).toBe("rejected");
	});

	it("enrols immediately on the free pipeline", async () => {
		const id = await apply("free");
		expect((await getApplication(id))?.status).toBe("enrolled");
	});
});
