import { definePlugin, defineStage, runtime } from "@zaydemy/core";
import { eq, not } from "drizzle-orm";
import messages from "./messages";
import { documentFormat, documentStatus, documentTypes, userDocuments } from "./schema";
import {
	allApproved,
	documentsOf,
	reviewDocument,
	STAGE,
	stageOptions,
	typesFor,
	uploadDocument,
} from "./service";

const REVIEW = "documents.review";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });

export const documentsStage = defineStage({
	id: STAGE,
	label: "documents.stage",
	options: stageOptions,
	applicantHref: "/documents",
	async onEnter({ db, userId, options }) {
		const types = await typesFor(db, options);
		if (types.length === 0) return "skip" as const;
		// Documents are kept per user, so a returning applicant may already be done.
		return allApproved(types, await documentsOf(db, userId)) ? "complete" : "wait";
	},
});

export interface DocumentsOptions {
	/** Largest accepted upload. Default: 5 MB. */
	maxSizeMb?: number;
}

/**
 * Document collection stage: staff define document types, each course picks
 * the ones it needs, applicants upload files and staff approve or reject them.
 * Needs a storage plugin.
 */
export function documentsPlugin({ maxSizeMb = 5 }: DocumentsOptions = {}) {
	return definePlugin({
		id: "stage-documents",
		name: "Documents stage",
		version: "0.1.0",
		requires: ["storage"],
		stages: [documentsStage],
		schema: { documentTypes, userDocuments, documentFormat, documentStatus },
		permissions: [{ key: REVIEW, name: "Review documents and manage document types" }],
		adminNav: [
			{ label: "documents.nav", href: "/admin/documents", icon: "file-check", permission: REVIEW },
		],
		appNav: [{ label: "documents.title", href: "/documents", icon: "file-text" }],
		messages,
		pages: [
			{
				area: "app",
				path: "/documents",
				signedIn: true,
				load: () => import("./pages/my-documents"),
			},
			{
				area: "admin",
				path: "/documents",
				permission: REVIEW,
				load: () => import("./pages/admin-review"),
			},
			{
				area: "admin",
				path: "/document-types",
				permission: REVIEW,
				load: () => import("./pages/admin-types"),
			},
		],
		api: [
			{
				method: "POST",
				path: "/documents/[type]",
				signedIn: true,
				async handler(request, { params, session }) {
					const user = await session();
					if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
					const file = (await request.formData()).get("file");
					const result = await uploadDocument(runtime(), {
						userId: user.user.id,
						typeKey: params.type ?? "",
						file: file instanceof File ? file : null,
						maxBytes: maxSizeMb * 1024 * 1024,
					});
					return seeOther(
						"error" in result ? `/documents?error=${result.error}&max=${maxSizeMb}` : "/documents",
					);
				},
			},
			{
				method: "GET",
				path: "/documents/files/[id]",
				signedIn: true,
				async handler(_request, { params, session }) {
					const app = runtime();
					const user = await session();
					const [document] = await app.db
						.select()
						.from(userDocuments)
						.where(eq(userDocuments.id, params.id ?? ""));
					const allowed =
						document &&
						user &&
						(document.userId === user.user.id || user.permissions.includes(REVIEW));
					if (!allowed) return Response.json({ error: "not_found" }, { status: 404 });
					const file = await app.config.storage.get(document.storageKey);
					if (!file) return Response.json({ error: "not_found" }, { status: 404 });
					return new Response(file.body as Uint8Array<ArrayBuffer>, {
						headers: {
							"Content-Type": document.contentType,
							"Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
							"Cache-Control": "private, no-store",
							"X-Content-Type-Options": "nosniff",
						},
					});
				},
			},
			{
				method: "POST",
				path: "/admin/documents/[id]/[decision]",
				permission: REVIEW,
				async handler(request, { params, session }) {
					const decision = params.decision;
					if (decision !== "approve" && decision !== "reject") {
						return Response.json({ error: "not_found" }, { status: 404 });
					}
					const note = String((await request.formData()).get("note") ?? "").trim();
					const actor = await session();
					await reviewDocument(runtime(), {
						documentId: params.id ?? "",
						approve: decision === "approve",
						note: note || undefined,
						actorId: actor?.user.id,
					});
					return seeOther("/admin/documents");
				},
			},
			{
				method: "POST",
				path: "/admin/document-types",
				permission: REVIEW,
				async handler(request) {
					const form = await request.formData();
					const field = (name: string) => String(form.get(name) ?? "").trim();
					const format = documentFormat.enumValues.find((f) => f === field("format")) ?? "pdf";
					if (/^[a-z0-9-]+$/.test(field("key")) && field("name")) {
						await runtime()
							.db.insert(documentTypes)
							.values({
								key: field("key"),
								name: field("name"),
								description: field("description") || null,
								format,
							})
							.onConflictDoNothing();
					}
					return seeOther("/admin/document-types");
				},
			},
			{
				method: "POST",
				path: "/admin/document-types/[id]/toggle",
				permission: REVIEW,
				async handler(_request, { params }) {
					await runtime()
						.db.update(documentTypes)
						.set({ isActive: not(documentTypes.isActive) })
						.where(eq(documentTypes.id, params.id ?? ""));
					return seeOther("/admin/document-types");
				},
			},
		],
	});
}

export * from "./schema";
export { requestedTypes, reviewDocument, syncDocumentStage, uploadDocument } from "./service";
