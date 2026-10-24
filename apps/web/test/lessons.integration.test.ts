import { definePlugin, type PluginPageProps } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { createTranslator } from "@zaydemy/i18n";
import { lessonsPlugin } from "@zaydemy/plugin-lessons";
import { lessonAttachments, lessons, sections } from "@zaydemy/plugin-lessons/schema";
import { interviewPlugin } from "@zaydemy/plugin-stage-interview";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apply, callApi, seed, setup, testUrl } from "./helpers";

const files = new Map<string, Uint8Array>();
const getFile = vi.fn(async (key: string) => {
	const body = files.get(key);
	return body ? { body } : null;
});
const storage = definePlugin({
	id: "test-storage",
	name: "Test storage",
	version: "0.0.0",
	storage: {
		async put(key, body) {
			files.set(key, body);
		},
		get: getFile,
		async delete(key) {
			files.delete(key);
		},
	},
});

describe.skipIf(!testUrl)("course content", () => {
	const t = setup({
		plugins: [storage, interviewPlugin, lessonsPlugin],
		pipelines: { default: ["interview"], free: [] },
	});
	let ctx: Awaited<ReturnType<typeof seed>>;
	beforeEach(async () => {
		ctx = await seed(t);
		files.clear();
		getFile.mockClear();
	});
	const staff = () => ({ ...ctx.session, permissions: ["lessons.manage"] });
	const post = (path: string, form: Record<string, string>) =>
		callApi(t.config, "POST", path, { form, session: staff() });
	const fields = { title: "Getting started", order: "0", isPublished: "on" };

	async function content(
		options: Partial<typeof lessons.$inferInsert> = {},
		sectionOptions: Partial<typeof sections.$inferInsert> = {},
	) {
		const [section] = await t.db
			.insert(sections)
			.values({ courseId: ctx.course.id, title: "Basics", ...sectionOptions })
			.returning();
		const [lesson] = await t.db
			.insert(lessons)
			.values({
				sectionId: section!.id,
				title: "First lesson",
				body: "Private lesson body",
				isPublished: true,
				...options,
			})
			.returning();
		return { section: section!, lesson: lesson! };
	}
	async function render(
		area: "app" | "admin",
		searchParams: PluginPageProps["searchParams"],
		session: PluginPageProps["session"] = ctx.session,
		locale: "tr" | "en" = "en",
	) {
		const page = lessonsPlugin.pages.find((row) => row.area === area)!;
		const { default: Page } = await page.load();
		return renderToStaticMarkup(
			(await Page({
				params: {},
				searchParams,
				session,
				locale,
				t: createTranslator(t.config, locale),
			})) as ReactNode,
		);
	}
	async function enroll(courseId = ctx.course.id) {
		await apply(t, { userId: ctx.user.id, courseId, pipeline: "free" });
	}

	it("creates sections and lessons, updates their order, publishes and schedules them", async () => {
		const created = await post("/lessons/sections", {
			...fields,
			courseId: ctx.course.id,
			title: "Second section",
			order: "2",
		});
		expect(created.status).toBe(303);
		const [section] = await t.db.select().from(sections);
		expect(section).toMatchObject({ title: "Second section", order: 2, isPublished: true });
		const result = await post(`/lessons/sections/${section!.id}/lessons`, {
			...fields,
			title: "Second lesson",
			order: "2",
		});
		expect(result.headers.get("location")).toContain("editLessonId=");
		const [lesson] = await t.db.select().from(lessons);
		expect(lesson).toMatchObject({ sectionId: section!.id, isPublished: true });
		await post(`/lessons/sections/${section!.id}/lessons`, {
			...fields,
			title: "First lesson",
			order: "1",
		});
		await post(`/lessons/sections/${section!.id}/update`, {
			title: "Renamed section",
			order: "0",
			openAt: "2030-01-01T10:00",
		});
		await post(`/lessons/${lesson!.id}/update`, {
			...fields,
			title: "Updated lesson",
			order: "3",
			body: "Updated content",
			openAt: "2020-01-01T10:00",
		});
		expect((await t.db.select().from(sections))[0]).toMatchObject({
			title: "Renamed section",
			order: 0,
			isPublished: false,
			openAt: new Date("2030-01-01T10:00Z"),
		});
		expect((await t.db.select().from(lessons).where(eq(lessons.id, lesson!.id)))[0]).toMatchObject({
			title: "Updated lesson",
			order: 3,
			body: "Updated content",
			isPublished: true,
		});
		const admin = await render("admin", { courseId: ctx.course.id }, staff());
		expect(admin.indexOf("First lesson")).toBeLessThan(admin.indexOf("Updated lesson"));
	});

	it("checks real enrolment when a pending applicant opens a direct lesson or attachment URL", async () => {
		const { lesson } = await content();
		await apply(t, { userId: ctx.user.id, courseId: ctx.course.id });
		const [attachment] = await t.db
			.insert(lessonAttachments)
			.values({
				lessonId: lesson.id,
				fileKey: "secret",
				name: "private.pdf",
				size: 3,
				type: "application/pdf",
			})
			.returning();
		files.set("secret", new Uint8Array([1, 2, 3]));
		const html = await render("app", { courseId: ctx.course.id, lessonId: lesson.id });
		expect(html).not.toContain(lesson.body);
		expect(html).not.toContain(lesson.title);
		expect(html).not.toContain("private.pdf");
		const download = await callApi(
			t.config,
			"GET",
			`/lessons/attachments/${attachment!.id}/download`,
			{ session: ctx.session },
		);
		expect(download.status).toBe(404);
		expect(getFile).not.toHaveBeenCalled();
	});

	it("only lists and opens published lessons in published sections whose opening dates have passed", async () => {
		await enroll();
		const visible = await content({
			title: "Available now",
			order: 2,
			openAt: new Date("2020-01-01"),
		});
		await t.db.insert(lessons).values({
			sectionId: visible.section.id,
			title: "Earlier lesson",
			order: 1,
			isPublished: true,
		});
		const hidden = [
			await content({ title: "Draft lesson", isPublished: false }),
			await content({ title: "Scheduled lesson", openAt: new Date("2100-01-01") }),
			await content(
				{ title: "Draft section lesson" },
				{ title: "Hidden section", isPublished: false },
			),
			await content(
				{ title: "Scheduled section lesson" },
				{ title: "Future section", openAt: new Date("2100-01-01") },
			),
		];
		const html = await render("app", { courseId: ctx.course.id });
		expect(html.indexOf("Earlier lesson")).toBeLessThan(html.indexOf("Available now"));
		for (const { lesson } of hidden) {
			expect(html).not.toContain(lesson.title);
			const direct = await render("app", { lessonId: lesson.id });
			expect(direct).not.toContain("Private lesson body");
			const [attachment] = await t.db
				.insert(lessonAttachments)
				.values({
					lessonId: lesson.id,
					fileKey: lesson.id,
					name: "hidden.pdf",
					size: 1,
					type: "application/pdf",
				})
				.returning();
			expect(
				(
					await callApi(t.config, "GET", `/lessons/attachments/${attachment!.id}/download`, {
						session: ctx.session,
					})
				).status,
			).toBe(404);
		}
		const opened = await render("app", { lessonId: visible.lesson.id });
		expect(opened).toContain("Private lesson body");
	});

	it("does not expose another course through a forged course or lesson id", async () => {
		await enroll();
		const [other] = await t.db
			.insert(schema.courses)
			.values({ name: "Other course", slug: "other", categoryId: ctx.course.categoryId })
			.returning();
		const { lesson } = await content({}, { courseId: other!.id });
		for (const searchParams of [
			{ lessonId: lesson.id },
			{ courseId: other!.id, lessonId: lesson.id },
			{ courseId: ctx.course.id, lessonId: lesson.id },
		]) {
			const html = await render("app", searchParams);
			expect(html).not.toContain("Other course");
			expect(html).not.toContain("Private lesson body");
		}
	});

	it("downloads an available lesson file and removes access after enrolment is revoked", async () => {
		await enroll();
		const { lesson } = await content();
		const [attachment] = await t.db
			.insert(lessonAttachments)
			.values({
				lessonId: lesson.id,
				fileKey: "file",
				name: "notes.pdf",
				size: 3,
				type: "application/pdf",
			})
			.returning();
		files.set("file", new Uint8Array([1, 2, 3]));
		const path = `/lessons/attachments/${attachment!.id}/download`;
		const response = await callApi(t.config, "GET", path, { session: ctx.session });
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
		expect(await render("app", { lessonId: lesson.id })).toContain(path);
		await t.db
			.update(schema.applications)
			.set({ status: "withdrawn" })
			.where(eq(schema.applications.userId, ctx.user.id));
		expect((await callApi(t.config, "GET", path, { session: ctx.session })).status).toBe(404);
	});

	it("requires lessons.manage for every write and does not render admin content to a learner", async () => {
		for (const route of lessonsPlugin.api.filter((route) => route.method === "POST")) {
			expect(route.permission).toBe("lessons.manage");
			for (const [session, status] of [
				[null, 401],
				[ctx.session, 403],
			] as const) {
				const response = await route.handler(
					new Request("http://localhost/api/test", { method: "POST" }),
					{ params: {}, session: async () => session },
				);
				expect(response.status).toBe(status);
			}
		}
		expect(await render("admin", {}, ctx.session)).toBe("");
		expect(await render("app", {}, null)).toBe("");
		expect((await callApi(t.config, "GET", "/lessons/attachments/unknown/download")).status).toBe(
			401,
		);
	});

	it("rejects invalid fields without changing stored content or moving it across courses", async () => {
		const { lesson } = await content();
		const invalidFields: Record<string, string>[] = [
			{ title: " " },
			{ order: "-1" },
			{ order: "1.5" },
			{ order: "2147483648" },
			{ openAt: "2026-02-31T12:00" },
			{ openAt: "not-a-date" },
		];
		for (const invalid of invalidFields) {
			const response = await post(`/lessons/${lesson.id}/update`, { ...fields, ...invalid });
			expect(response.headers.get("location")).toContain("error=invalid");
		}
		const [other] = await t.db
			.insert(schema.courses)
			.values({ name: "Other", slug: "other", categoryId: ctx.course.categoryId })
			.returning();
		const { section: otherSection } = await content({}, { courseId: other!.id });
		expect(
			(
				await post(`/lessons/${lesson.id}/update`, { ...fields, sectionId: otherSection.id })
			).headers.get("location"),
		).toContain("error=invalid");
		expect((await t.db.select().from(lessons).where(eq(lessons.id, lesson.id)))[0]).toEqual(lesson);
		expect((await post("/lessons/sections", { ...fields, courseId: "missing" })).status).toBe(404);
	});

	it("renders translated management screens and sanitizes learner HTML", async () => {
		await enroll();
		const { lesson } = await content({
			body: '<p>Safe text</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">Click</a>',
		});
		const learner = await render("app", { lessonId: lesson.id });
		expect(learner).toContain("Safe text");
		expect(learner).not.toMatch(/<script|javascript:|onclick=/);
		expect(await render("admin", {}, staff(), "tr")).toContain("Bölüm ekle");
		expect(await render("admin", {}, staff(), "en")).toContain("Add section");
		expect(
			await render("admin", { courseId: ctx.course.id, editLessonId: lesson.id }, staff(), "tr"),
		).toContain("Dersi düzenle");
	});
});
