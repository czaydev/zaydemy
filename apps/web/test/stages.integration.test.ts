import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { definePlugin, type MailMessage } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { getProfile, linkInBioPlugin } from "@zaydemy/plugin-link-in-bio";
import { notificationsPlugin } from "@zaydemy/plugin-notifications";
import { paymentsPlugin } from "@zaydemy/plugin-payments";
import { redirects, redirectsPlugin } from "@zaydemy/plugin-redirects";
import { contractPlugin } from "@zaydemy/plugin-stage-contract";
import { documentsPlugin, documentTypes, userDocuments } from "@zaydemy/plugin-stage-documents";
import { localFileStorage } from "@zaydemy/plugin-storage-local";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { apply, callApi, seed, setup, testUrl } from "./helpers";

const multipart = (file: File) => {
	const form = new FormData();
	form.set("file", file);
	return form;
};

describe.skipIf(!testUrl)(
	"documents, contract, notifications, redirects and link in bio",
	async () => {
		const sent: MailMessage[] = [];
		const mail = definePlugin({
			id: "mail-test",
			name: "Mail",
			version: "0",
			mailer: { send: async (m) => void sent.push(m) },
		});
		const t = setup({
			plugins: [
				paymentsPlugin(),
				documentsPlugin({ maxSizeMb: 1 }),
				contractPlugin,
				notificationsPlugin(),
				redirectsPlugin,
				linkInBioPlugin,
				localFileStorage({ root: await mkdtemp(join(tmpdir(), "zaydemy-")) }),
				mail,
			],
			pipelines: { default: ["documents", "contract"] },
		});
		const { db, config } = t;
		let ctx: Awaited<ReturnType<typeof seed>>;
		const admin = () => ({
			...ctx.session,
			permissions: ["documents.review", "redirects.manage", "link-in-bio.manage"],
		});
		const application = async (id: string) =>
			(await db.select().from(schema.applications).where(eq(schema.applications.id, id)))[0];
		// Upload goes through the real route; FormData bodies need a Request of their own.
		const upload = async (type: string, file: File) => {
			const route = config.api.find((r) => r.method === "POST" && r.path === "/documents/[type]");
			return route!.handler(
				new Request("http://localhost:3000/api/documents/x", {
					method: "POST",
					body: multipart(file),
				}),
				{ params: { type }, session: async () => ctx.session },
			);
		};

		beforeAll(async () => {
			ctx = await seed(t, {
				documents: { types: ["id-card"] },
				contract: { policy: "contract-v" },
			});
			await db.delete(documentTypes);
			await db.insert(documentTypes).values([
				{ key: "id-card", name: "ID card", format: "pdf" },
				{ key: "health-report", name: "Health report", format: "pdf" },
			]);
			await db
				.insert(schema.policies)
				.values({ key: "contract-v", name: "Contract", version: "1", content: "Terms…" })
				.onConflictDoNothing();
		});

		it("collects the course's documents, then the contract, then enrols", async () => {
			const id = await apply(t, { userId: ctx.user.id, courseId: ctx.course.id });
			expect(await application(id)).toMatchObject({ currentStage: "documents" });
			expect(sent.at(-1)?.subject).toContain("Evrak");

			// Not requested for this course, wrong type, then a valid PDF.
			const pdf = new File(["%PDF-1.4"], "id.pdf", { type: "application/pdf" });
			expect((await upload("health-report", pdf)).headers.get("location")).toContain(
				"error=not_requested",
			);
			const png = new File(["x"], "id.png", { type: "image/png" });
			expect((await upload("id-card", png)).headers.get("location")).toContain("error=wrong_type");
			expect((await upload("id-card", pdf)).headers.get("location")).toBe("/documents");

			const [document] = await db
				.select()
				.from(userDocuments)
				.where(eq(userDocuments.userId, ctx.user.id));
			expect(document?.status).toBe("uploaded");
			const file = await callApi(config, "GET", `/documents/files/${document!.id}`, {
				session: ctx.session,
			});
			expect(await file.text()).toBe("%PDF-1.4");

			await callApi(config, "POST", `/admin/documents/${document!.id}/reject`, {
				form: { note: "Blurry" },
				session: admin(),
			});
			expect(await application(id)).toMatchObject({ currentStage: "documents" });
			const inbox = await db
				.select()
				.from(schema.notifications)
				.where(eq(schema.notifications.userId, ctx.user.id));
			expect(inbox.map((n) => n.body)).toContain("Lütfen yeniden yükleyin. Blurry");

			await callApi(config, "POST", `/admin/documents/${document!.id}/approve`, {
				session: admin(),
			});
			expect(await application(id)).toMatchObject({ currentStage: "contract" });

			const accepted = await callApi(config, "POST", `/contract/${id}/accept`, {
				session: ctx.session,
			});
			expect(accepted.status).toBe(303);
			expect(await application(id)).toMatchObject({ status: "enrolled" });
			const [acceptance] = await db
				.select()
				.from(schema.policyAcceptances)
				.where(eq(schema.policyAcceptances.userId, ctx.user.id));
			expect(acceptance).toMatchObject({ policyKey: "contract-v", policyVersion: "1" });
		});

		it("passes a returning applicant's approved documents and accepted contract straight through", async () => {
			const id = await apply(t, { userId: ctx.user.id, courseId: ctx.course.id });
			expect(await application(id)).toMatchObject({ status: "enrolled" });
		});

		it("does not serve one applicant's document to another", async () => {
			const [document] = await db.select().from(userDocuments);
			const stranger = { ...ctx.session, user: { ...ctx.session.user, id: "someone-else" } };
			const response = await callApi(config, "GET", `/documents/files/${document!.id}`, {
				session: stranger,
			});
			expect(response.status).toBe(404);
		});

		it("follows short links, counts clicks and refuses unsafe targets", async () => {
			await db.delete(redirects);
			await callApi(config, "POST", "/admin/redirects", {
				form: { name: "Apply", slug: "apply", targetUrl: "https://example.com/apply" },
				session: admin(),
			});
			const bad = await callApi(config, "POST", "/admin/redirects", {
				form: { name: "X", slug: "x", targetUrl: "javascript:alert(1)" },
				session: admin(),
			});
			expect(bad.headers.get("location")).toContain("error=invalid");

			const resolved = await callApi(config, "GET", "/redirects/apply");
			expect(await resolved.json()).toMatchObject({ targetUrl: "https://example.com/apply" });
			const [row] = await db.select().from(redirects).where(eq(redirects.slug, "apply"));
			expect(row?.clicks).toBe(1);
			expect((await callApi(config, "GET", "/redirects/x")).status).toBe(404);
		});

		it("saves the link-in-bio profile", async () => {
			await callApi(config, "POST", "/admin/link-in-bio", {
				form: {
					title: "Zaydemy",
					description: "Apply now",
					avatarUrl: "",
					links: "Apply | https://example.com/apply\nBroken line\nBad | javascript:alert(1)",
				},
				session: admin(),
			});
			expect(await getProfile(db)).toBeNull();
			await callApi(config, "POST", "/admin/link-in-bio", {
				form: { title: "Zaydemy", links: "Apply | https://example.com/apply\nBroken line" },
				session: admin(),
			});
			expect(await getProfile(db)).toMatchObject({
				title: "Zaydemy",
				links: [{ title: "Apply", url: "https://example.com/apply" }],
			});
		});
	},
);
