/**
 * Fills a fresh database with what a local install needs: an admin role that
 * holds every permission the enabled plugins declare, an admin account, and a
 * small demo catalogue. Safe to run more than once.
 *
 *   pnpm db:seed
 *
 * ADMIN_EMAIL / ADMIN_PASSWORD pick the admin account. Without a password a
 * random one is generated and printed. An existing user with that e-mail is
 * made admin as is.
 */
import { randomBytes } from "node:crypto";
import { createAuth } from "@zaydemy/auth";
import { resolveConfig } from "@zaydemy/core";
import { createDatabase, schema } from "@zaydemy/db";
import { bankAccounts } from "@zaydemy/plugin-payment-bank-transfer/schema";
import { documentTypes } from "@zaydemy/plugin-stage-documents/schema";
import { eq, inArray } from "drizzle-orm";
import config from "../zaydemy.config";

const env = (name: string, fallback?: string) => {
	const value = process.env[name] || fallback;
	if (!value) throw new Error(`${name} is not set. Copy .env.example to .env first.`);
	return value;
};

const adminEmail = env("ADMIN_EMAIL", "admin@example.com");
const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(12).toString("base64url");

function must<T>(row: T | undefined, what: string): T {
	if (!row) throw new Error(`Seed could not find ${what}.`);
	return row;
}

const resolved = resolveConfig(config);
const db = createDatabase(env("DATABASE_URL"), resolved.schema);
const enabled = new Set(resolved.plugins.map((p) => p.id));

async function seedAccess() {
	const declared = resolved.permissions;
	if (declared.length > 0) {
		await db.insert(schema.permissions).values(declared).onConflictDoNothing();
	}
	await db.insert(schema.roles).values({ key: "admin", name: "Admin" }).onConflictDoNothing();
	const role = must(
		(await db.select().from(schema.roles).where(eq(schema.roles.key, "admin")))[0],
		"the admin role",
	);
	const rows =
		declared.length === 0
			? []
			: await db
					.select({ id: schema.permissions.id })
					.from(schema.permissions)
					.where(
						inArray(
							schema.permissions.key,
							declared.map((p) => p.key),
						),
					);
	if (rows.length > 0) {
		await db
			.insert(schema.rolePermissions)
			.values(rows.map((p) => ({ roleId: role.id, permissionId: p.id })))
			.onConflictDoNothing();
	}
	return role;
}

async function seedAdmin(roleId: string) {
	const findUser = async () =>
		(await db.select().from(schema.users).where(eq(schema.users.email, adminEmail)))[0];
	let user = await findUser();
	if (!user) {
		const auth = createAuth({
			db,
			config: resolved,
			baseURL: env("BETTER_AUTH_URL", "http://localhost:3000"),
			secret: env("BETTER_AUTH_SECRET"),
		});
		await auth.api.signUpEmail({
			body: { email: adminEmail, password: adminPassword, name: "Admin" },
		});
		user = must(await findUser(), adminEmail);
		console.log(`Created admin ${adminEmail} / ${adminPassword}`);
	} else {
		console.log(`Made ${adminEmail} an admin`);
	}
	await db.insert(schema.userRoles).values({ userId: user.id, roleId }).onConflictDoNothing();
}

async function seedCatalogue() {
	await db
		.insert(schema.courseCategories)
		.values({ name: "Yazılım", slug: "software" })
		.onConflictDoNothing();
	const category = must(
		(
			await db
				.select()
				.from(schema.courseCategories)
				.where(eq(schema.courseCategories.slug, "software"))
		)[0],
		"the demo category",
	);
	await db
		.insert(schema.courses)
		.values([
			{
				name: "Full Stack Bootcamp",
				slug: "full-stack-bootcamp",
				description: "Ön ödeme, mülakat, belge, sözleşme ve eğitim ücreti adımlarıyla.",
				categoryId: category.id,
				deliveryModes: ["in_person", "online"],
				stageOptions: {
					prepayment: { amount: 50_000 },
					documents: { types: ["id-card"] },
					tuition: { amount: 1_500_000 },
				},
			},
			{
				name: "Git'e Giriş",
				slug: "intro-to-git",
				description: "Ücretsiz eğitim: başvuru doğrudan kayda dönüşür.",
				categoryId: category.id,
				deliveryModes: ["online"],
				pipeline: "free",
			},
		])
		.onConflictDoNothing();
	await db
		.insert(schema.terms)
		.values({ number: 1, name: "2026 Güz", isActive: true })
		.onConflictDoNothing();
	await db
		.insert(schema.policies)
		.values({
			key: "enrollment-contract",
			name: "Eğitim sözleşmesi",
			version: "1",
			content: "Bu örnek bir eğitim sözleşmesidir. Kendi metninizle değiştirin.",
		})
		.onConflictDoNothing();

	if (enabled.has("stage-documents")) {
		await db
			.insert(documentTypes)
			.values({ key: "id-card", name: "Kimlik fotokopisi", format: "image" })
			.onConflictDoNothing();
	}
	if (enabled.has("payment-bank-transfer")) {
		await db
			.insert(bankAccounts)
			.values({
				bankName: "Örnek Bank",
				accountHolder: "Zaydemy Eğitim A.Ş.",
				iban: "TR330006100519786457841326",
			})
			.onConflictDoNothing();
	}
}

const role = await seedAccess();
await seedAdmin(role.id);
await seedCatalogue();
console.log("Seed complete.");
process.exit(0);
