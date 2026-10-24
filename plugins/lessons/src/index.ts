import { definePlugin, type PluginApiRoute, runtime } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { and, eq } from "drizzle-orm";
import { contentFields } from "./forms";
import { messages } from "./messages";
import { lessonAttachments, lessons, sections } from "./schema";
import { readableLesson } from "./service";

const MANAGE = "lessons.manage";
const notFound = () => Response.json({ error: "not_found" }, { status: 404 });
const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });
export const adminHref = (courseId: string, lessonId?: string, error?: string) => {
	const query = new URLSearchParams({ courseId });
	if (lessonId) query.set("editLessonId", lessonId);
	if (error) query.set("error", error);
	return `/admin/lessons?${query}`;
};

/** Keep write authorization at the handler too, including non-Next.js consumers. */
function manage(path: string, handler: PluginApiRoute["handler"]): PluginApiRoute {
	return {
		method: "POST",
		path,
		permission: MANAGE,
		async handler(request, context) {
			const user = await context.session();
			if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
			if (!user.permissions.includes(MANAGE))
				return Response.json({ error: "forbidden" }, { status: 403 });
			return handler(request, context);
		},
	};
}

async function findLesson(id: string) {
	const [row] = await runtime()
		.db.select({ lesson: lessons, courseId: sections.courseId })
		.from(lessons)
		.innerJoin(sections, eq(lessons.sectionId, sections.id))
		.where(eq(lessons.id, id));
	return row;
}

export const lessonsPlugin = definePlugin({
	id: "lessons",
	name: "Lessons",
	version: "0.1.0",
	schema: { lessons, sections, lessonAttachments },
	messages,
	requires: ["storage"],
	adminNav: [
		{ label: "lessons.manageNav", href: "/admin/lessons", icon: "book-open", permission: MANAGE },
	],
	appNav: [{ label: "lessons.nav", href: "/lessons", icon: "book-open" }],
	permissions: [{ key: MANAGE, name: "Manage Lessons" }],
	pages: [
		{ area: "admin", path: "/lessons", permission: MANAGE, load: () => import("./pages/admin") },
		{ area: "app", path: "/lessons", signedIn: true, load: () => import("./pages/my-lessons") },
	],
	api: [
		manage("/lessons/sections", async (request) => {
			const form = await request.formData();
			const courseId = String(form.get("courseId") ?? "");
			const [course] = await runtime()
				.db.select({ id: schema.courses.id })
				.from(schema.courses)
				.where(eq(schema.courses.id, courseId));
			if (!course) return notFound();
			const fields = contentFields(form);
			if (!fields) return seeOther(adminHref(courseId, undefined, "invalid"));
			await runtime()
				.db.insert(sections)
				.values({ courseId, ...fields });
			return seeOther(adminHref(courseId));
		}),
		manage("/lessons/sections/[id]/update", async (request, { params }) => {
			const [section] = await runtime()
				.db.select()
				.from(sections)
				.where(eq(sections.id, params.id ?? ""));
			if (!section) return notFound();
			const fields = contentFields(await request.formData());
			if (!fields) return seeOther(adminHref(section.courseId, undefined, "invalid"));
			await runtime().db.update(sections).set(fields).where(eq(sections.id, section.id));
			return seeOther(adminHref(section.courseId));
		}),
		manage("/lessons/sections/[id]/lessons", async (request, { params }) => {
			const [section] = await runtime()
				.db.select()
				.from(sections)
				.where(eq(sections.id, params.id ?? ""));
			if (!section) return notFound();
			const fields = contentFields(await request.formData());
			if (!fields) return seeOther(adminHref(section.courseId, undefined, "invalid"));
			const [lesson] = await runtime()
				.db.insert(lessons)
				.values({ sectionId: section.id, ...fields })
				.returning();
			return seeOther(adminHref(section.courseId, lesson?.id));
		}),
		manage("/lessons/[id]/update", async (request, { params }) => {
			const row = await findLesson(params.id ?? "");
			if (!row) return notFound();
			const form = await request.formData();
			const fields = contentFields(form);
			const body = String(form.get("body") ?? "");
			const sectionId = String(form.get("sectionId") ?? row.lesson.sectionId);
			const [section] = await runtime()
				.db.select({ id: sections.id })
				.from(sections)
				.where(and(eq(sections.id, sectionId), eq(sections.courseId, row.courseId)));
			if (!fields || !section || body.length > 1_000_000)
				return seeOther(adminHref(row.courseId, row.lesson.id, "invalid"));
			await runtime()
				.db.update(lessons)
				.set({ ...fields, body, sectionId })
				.where(eq(lessons.id, row.lesson.id));
			return seeOther(adminHref(row.courseId, row.lesson.id));
		}),
		manage("/lessons/[id]/attachments", async (request, { params }) => {
			const row = await findLesson(params.id ?? "");
			if (!row) return notFound();
			const file = (await request.formData()).get("file");
			if (!(file instanceof File) || file.size === 0)
				return seeOther(adminHref(row.courseId, row.lesson.id, "file"));
			const app = runtime();
			const key = `lessons/${row.lesson.id}/${crypto.randomUUID()}`;
			await app.config.storage.put(key, new Uint8Array(await file.arrayBuffer()), file.type);
			try {
				await app.db.insert(lessonAttachments).values({
					lessonId: row.lesson.id,
					fileKey: key,
					name: file.name,
					size: file.size,
					type: file.type,
				});
			} catch (error) {
				await app.config.storage.delete(key);
				throw error;
			}
			return seeOther(adminHref(row.courseId, row.lesson.id));
		}),
		manage("/lessons/[id]/attachments/[attachmentId]/delete", async (_request, { params }) => {
			const row = await findLesson(params.id ?? "");
			if (!row) return notFound();
			const app = runtime();
			const [attachment] = await app.db
				.select()
				.from(lessonAttachments)
				.where(
					and(
						eq(lessonAttachments.id, params.attachmentId ?? ""),
						eq(lessonAttachments.lessonId, row.lesson.id),
					),
				);
			if (!attachment) return notFound();
			await app.config.storage.delete(attachment.fileKey);
			await app.db.delete(lessonAttachments).where(eq(lessonAttachments.id, attachment.id));
			return seeOther(adminHref(row.courseId, row.lesson.id));
		}),
		{
			method: "GET",
			path: "/lessons/attachments/[id]/download",
			signedIn: true,
			async handler(_request, { params, session }) {
				const app = runtime();
				const user = await session();
				if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
				const [attachment] = await app.db
					.select()
					.from(lessonAttachments)
					.where(eq(lessonAttachments.id, params.id ?? ""));
				if (!attachment || !(await readableLesson(app.db, user.user.id, attachment.lessonId)))
					return notFound();
				const file = await app.config.storage.get(attachment.fileKey);
				if (!file) return notFound();
				return new Response(Buffer.from(file.body), {
					headers: {
						"Content-Type": "application/octet-stream",
						"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
						"Cache-Control": "private, no-store",
						"X-Content-Type-Options": "nosniff",
					},
				});
			},
		},
	],
});
