import { createAuth, getUserAccess } from "@zaydemy/auth";
import { definePlugin, type MailMessage, resolveConfig } from "@zaydemy/core";
import { createDatabase, schema } from "@zaydemy/db";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("auth on Postgres", () => {
	const sent: MailMessage[] = [];
	const mailPlugin = definePlugin({
		id: "mail-test",
		name: "Test mail",
		version: "0",
		mailer: { send: async (message) => void sent.push(message) },
	});
	const config = resolveConfig({
		brand: { name: "Test", slug: "test" },
		locales: { default: "tr", supported: ["tr"] },
		plugins: [mailPlugin],
		pipelines: { default: [] },
	});
	const db = createDatabase(url as string);
	const auth = createAuth({ db, config, baseURL: "http://localhost:3000", secret: "x".repeat(32) });

	beforeAll(async () => {
		await migrate(db, { migrationsFolder: "./drizzle" });
		await db.execute(sql`truncate users, roles, permissions cascade`);
	});

	it("signs up with e-mail and password and returns roles and permissions in the session", async () => {
		const { headers, response } = await auth.api.signUpEmail({
			body: { email: "ada@example.com", password: "correct horse battery", name: "Ada" },
			returnHeaders: true,
		});
		const { user } = response;
		const cookie = headers
			.getSetCookie()
			.map((c) => c.split(";")[0])
			.join("; ");

		const [role] = await db
			.insert(schema.roles)
			.values({ key: "admin", name: "Admin" })
			.returning();
		const [permission] = await db
			.insert(schema.permissions)
			.values({ key: "interviews.manage", name: "Manage interviews" })
			.returning();
		await db
			.insert(schema.rolePermissions)
			.values({ roleId: role!.id, permissionId: permission!.id });
		await db.insert(schema.userRoles).values({ userId: user.id, roleId: role!.id });

		expect(await getUserAccess(db, user.id)).toEqual({
			roles: ["admin"],
			permissions: ["interviews.manage"],
		});

		const session = await auth.api.getSession({
			headers: new Headers({ cookie }),
			query: { disableCookieCache: true },
		});
		expect(session?.user.email).toBe("ada@example.com");
		expect(session?.permissions).toEqual(["interviews.manage"]);
	});

	it("sends one-time sign-in codes through the enabled mail plugin", async () => {
		await auth.api.sendVerificationOTP({ body: { email: "ada@example.com", type: "sign-in" } });
		expect(sent.at(-1)?.to).toBe("ada@example.com");
		expect(sent.at(-1)?.text).toMatch(/^\d{6}$/);
	});
});
