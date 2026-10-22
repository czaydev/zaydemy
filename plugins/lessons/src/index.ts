import { definePlugin, runtime } from "@zaydemy/core";
import { eq } from "drizzle-orm";
import { messages } from "./messages";
import { lessonAttachments, lessons, sections } from "./schema";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });
export const lessonsPlugin = definePlugin({
	id: "lessons",
	name: "Lessons",
	version: "0.1.0",
	schema: { lessons, sections, lessonAttachments },
	messages,
	requires: ["storage"],
	adminNav: [
		{
			label: "lessons.manageNav",
			href: "/admin/lessons",
			icon: "book-open",
			permission: "lessons.manage",
		},
	],
	appNav: [{ label: "lessons.nav", href: "/lessons" }],
	permissions: [{ key: "lessons.manage", name: "Manage Lessons" }],
	pages: [
		{
			area: "admin",
			path: "/lessons",
			permission: "lessons.manage",
			load: () => import("./pages/admin"),
		},
		{
			area: "app",
			path: "/lessons",
			signedIn: true,
			load: () => import("./pages/my-lessons"),
		},
	],
	api: [
		{
			method: "POST",
			path: "/lessons/[id]/update",
			permission: "lessons.manage",
			handler: async (request, { params }) => {
				const formData = await request.formData();
				const title = formData.get("title") as string;
				const order = Number(formData.get("order"));
				const body = formData.get("body") as string;
				const courseId = formData.get("courseId") as string;
				const id = params.id;
				if (!id) return new Response("Bad Request", { status: 400 });

				await runtime().db.update(lessons).set({ title, order, body }).where(eq(lessons.id, id));

				return seeOther(`/admin/lessons?courseId=${courseId}&editLessonId=${params.id}`);
			},
		},
		{
			method: "POST",
			path: "/lessons/[id]/attachments",
			permission: "lessons.manage",
			handler: async (request, { params }) => {
				const formData = await request.formData();
				const file = formData.get("file") as File | null;
				const courseId = formData.get("courseId") as string;
				const id = params.id;
				if (!id) return new Response("Bad Request", { status: 400 });

				if (!file || file.size === 0) {
					return new Response("Missing file", { status: 400 });
				}

				const key = `lessons/${id}/${crypto.randomUUID()}-${file.name}`;
				await runtime().config.storage.put(
					key,
					new Uint8Array(await file.arrayBuffer()),
					file.type,
				);

				await runtime().db.insert(lessonAttachments).values({
					lessonId: id,
					fileKey: key,
					name: file.name,
					size: file.size,
					type: file.type,
				});

				return seeOther(`/admin/lessons?courseId=${courseId}&editLessonId=${params.id}`);
			},
		},
		{
			method: "POST",
			path: "/lessons/[id]/attachments/[attachmentId]/delete",
			permission: "lessons.manage",
			handler: async (request, { params }) => {
				const formData = await request.formData();
				const courseId = formData.get("courseId") as string;
				const attachmentId = params.attachmentId;
				if (!attachmentId) return new Response("Bad Request", { status: 400 });

				const [attachment] = await runtime()
					.db.select()
					.from(lessonAttachments)
					.where(eq(lessonAttachments.id, attachmentId));

				if (attachment) {
					await runtime().config.storage.delete(attachment.fileKey);
					await runtime()
						.db.delete(lessonAttachments)
						.where(eq(lessonAttachments.id, attachmentId));
				}

				return seeOther(`/admin/lessons?courseId=${courseId}&editLessonId=${params.id}`);
			},
		},
		{
			method: "GET",
			path: "/lessons/attachments/[id]/download",
			signedIn: true,
			handler: async (_request, { params, session }) => {
				const app = runtime();
				const user = await session();
				const id = params.id;
				if (!id) return new Response("Bad Request", { status: 400 });

				const [attachment] = await app.db
					.select()
					.from(lessonAttachments)
					.where(eq(lessonAttachments.id, id));

				if (!attachment || !user) return Response.json({ error: "not_found" }, { status: 404 });

				const file = await app.config.storage.get(attachment.fileKey);
				if (!file) return Response.json({ error: "not_found" }, { status: 404 });

				return new Response(Buffer.from(file.body), {
					headers: {
						"Content-Type": file.contentType || "application/octet-stream",
						"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
						"Cache-Control": "private, no-store",
						"X-Content-Type-Options": "nosniff",
					},
				});
			},
		},
	],
});
