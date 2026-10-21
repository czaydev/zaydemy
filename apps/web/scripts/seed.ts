import { randomBytes } from "node:crypto";
import { createAuth } from "@zaydemy/auth";
import { resolveConfig } from "@zaydemy/core";
import { createDatabase, schema } from "@zaydemy/db";
import { lessons, sections } from "@zaydemy/plugin-lessons/schema";
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
	if (!row) throw new Error(`Missing ${what}`);
	return row;
}

const resolved = resolveConfig(config);
const db = createDatabase(env("DATABASE_URL"), resolved.schema);

async function seedAccess() {
	const [role] = await db
		.insert(schema.roles)
		.values({ key: "admin", name: "Yönetici" })
		.onConflictDoUpdate({ target: schema.roles.key, set: { name: "Yönetici" } })
		.returning({ id: schema.roles.id });

	const declared = resolved.permissions;
	if (declared.length > 0) {
		await db.insert(schema.permissions).values(declared).onConflictDoNothing();
		const rows = await db
			.select({ id: schema.permissions.id })
			.from(schema.permissions)
			.where(
				inArray(
					schema.permissions.key,
					declared.map((p) => p.key),
				),
			);
		const mappedRows = rows.map((p) => {
			const roleId = role?.id;
			if (!roleId) throw new Error("Role ID is missing");
			return { roleId, permissionId: p.id };
		});
		await db.insert(schema.rolePermissions).values(mappedRows).onConflictDoNothing();
	}
	const roleId = role?.id;
	if (!roleId) throw new Error("Role ID is missing");
	return { id: roleId };
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
	const enabled = new Set(resolved.plugins.map((p) => p.id));
	const [category] = await db
		.insert(schema.courseCategories)
		.values({ name: "Yazılım", slug: "software" })
		.onConflictDoUpdate({ target: schema.courseCategories.slug, set: { name: "Yazılım" } })
		.returning({ id: schema.courseCategories.id });

	const categoryId = category?.id;
	if (!categoryId) throw new Error("Category ID is missing");

	const coursesData = await db
		.insert(schema.courses)
		.values([
			{
				name: "Web Geliştirme Bootcamp",
				slug: "web-bootcamp",
				description: "Tüm aşamaları kullanan örnek eğitim.",
				categoryId: categoryId,
				deliveryModes: ["in_person"],
				pipeline: "default",
				stageOptions: {
					prepayment: { amount: 15_000 },
					documents: { require: ["id-card"] },
					contract: { contentId: "enrollment-contract" },
					tuition: { amount: 1_500_000 },
				},
			},
			{
				name: "Git'e Giriş",
				slug: "intro-to-git",
				description: "Ücretsiz eğitim: başvuru doğrudan kayda dönüşür.",
				categoryId: categoryId,
				deliveryModes: ["online"],
				pipeline: "free",
			},
		])
		.onConflictDoNothing()
		.returning({ id: schema.courses.id, slug: schema.courses.slug });

	let gitCourseId = coursesData.find((c) => c.slug === "intro-to-git")?.id;
	if (!gitCourseId) {
		gitCourseId = (
			await db.select().from(schema.courses).where(eq(schema.courses.slug, "intro-to-git"))
		)[0]?.id;
	}

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

	if (enabled.has("lessons") && gitCourseId) {
		const [section1] = await db
			.insert(sections)
			.values({
				courseId: gitCourseId,
				title: "1. Modül: Git Temelleri",
				order: 1,
			})
			.onConflictDoNothing()
			.returning({ id: sections.id });

		let secId = section1?.id;
		if (!secId) {
			secId = (await db.select().from(sections).where(eq(sections.courseId, gitCourseId)))[0]?.id;
		}

		if (secId) {
			await db
				.insert(lessons)
				.values([
					{ sectionId: secId, title: "Versiyon Kontrolü Nedir?", order: 1, isPublished: true },
					{ sectionId: secId, title: "Git Kurulumu", order: 2, isPublished: true },
					{ sectionId: secId, title: "İlk Commit", order: 3, isPublished: false },
				])
				.onConflictDoNothing();
		}
	}
}

const role = await seedAccess();
await seedAdmin(role.id);
await seedCatalogue();
console.log("Seed complete.");
process.exit(0);
