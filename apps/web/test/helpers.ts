import {
	bootstrap,
	matchApiRoute,
	type PluginSession,
	type ResolvedConfig,
	resolveConfig,
	splitPath,
	type ZaydemyConfig,
} from "@zaydemy/core";
import { createDatabase, schema } from "@zaydemy/db";
import { DrizzlePipelineStore } from "@zaydemy/db/pipeline-store";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const testUrl = process.env.TEST_DATABASE_URL;

/** Boots a runtime on the test database with the given plugins and pipelines. */
export function setup(config: Pick<ZaydemyConfig, "plugins" | "pipelines">) {
	const resolved = resolveConfig({
		brand: { name: "Test", slug: "test" },
		locales: { default: "tr", supported: ["tr"] },
		...config,
	});
	const db = createDatabase(testUrl as string, resolved.schema);
	const app = bootstrap(resolved, {
		db,
		store: new DrizzlePipelineStore(db),
		baseUrl: "http://localhost:3000",
	});
	return { app, db, config: resolved };
}

export type TestApp = ReturnType<typeof setup>;

/** Migrates and empties the database, then adds one user and one course. */
export async function seed({ db }: TestApp, stageOptions: Record<string, unknown> = {}) {
	await migrate(db, { migrationsFolder: "./drizzle" });
	await db.execute(
		sql`truncate users, course_categories, roles, permissions, settings, policies cascade`,
	);
	const [user] = await db
		.insert(schema.users)
		.values({ email: "ada@example.com", name: "Ada Lovelace" })
		.returning();
	const [category] = await db
		.insert(schema.courseCategories)
		.values({ name: "Dev", slug: "dev" })
		.returning();
	const [course] = await db
		.insert(schema.courses)
		.values({ name: "Bootcamp", slug: "bootcamp", categoryId: category!.id, stageOptions })
		.returning();
	const session: PluginSession = {
		user: { id: user!.id, email: user!.email, name: user!.name },
		roles: [],
		permissions: [],
	};
	return { user: user!, course: course!, session };
}

/** Creates an application on a pipeline and starts it. */
export async function apply(
	{ app, db }: TestApp,
	{
		userId,
		courseId,
		pipeline = "default",
	}: { userId: string; courseId: string; pipeline?: string },
) {
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

/** Calls a plugin API route the way the `/api/[...path]` catch-all does. */
export async function callApi(
	config: ResolvedConfig,
	method: string,
	path: string,
	options: { form?: Record<string, string>; session?: PluginSession | null } = {},
) {
	const match = matchApiRoute(config.api, method, splitPath(path));
	if (!match) throw new Error(`No route for ${method} ${path}`);
	// Browsers send an (empty) url-encoded body with every form post.
	const body = method === "GET" ? undefined : new URLSearchParams(options.form ?? {});
	const request = new Request(`http://localhost:3000/api${path}`, { method, body });
	return match.page.handler(request, {
		params: match.params,
		session: async () => options.session ?? null,
	});
}
