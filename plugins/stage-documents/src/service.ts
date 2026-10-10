import type { Zaydemy } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { type DocumentType, documentTypes, type UserDocument, userDocuments } from "./schema";

declare module "@zaydemy/core" {
	interface CoreEvents {
		"document.uploaded": { documentId: string; userId: string };
		"document.approved": { documentId: string; userId: string };
		"document.rejected": { documentId: string; userId: string; note?: string };
	}
}

export const STAGE = "documents";

export const stageOptions = z.object({
	/** Document type keys this course asks for. Default: every active document type. */
	types: z
		.array(z.string())
		.optional()
		.meta({ label: "documents.options.types", hint: "documents.options.typesHint" }),
});
export type DocumentStageOptions = z.infer<typeof stageOptions>;

type Db = Zaydemy["db"];

export const FORMATS: Record<DocumentType["format"], string[]> = {
	pdf: ["application/pdf"],
	image: ["image/jpeg", "image/png"],
};

/** Active document types a course asks for, in display order. */
export async function typesFor(db: Db, options: DocumentStageOptions): Promise<DocumentType[]> {
	const filters = [eq(documentTypes.isActive, true)];
	if (options.types) {
		if (options.types.length === 0) return [];
		filters.push(inArray(documentTypes.key, options.types));
	}
	return db
		.select()
		.from(documentTypes)
		.where(and(...filters))
		.orderBy(asc(documentTypes.sortOrder), asc(documentTypes.name));
}

export async function documentsOf(db: Db, userId: string): Promise<UserDocument[]> {
	return db.select().from(userDocuments).where(eq(userDocuments.userId, userId));
}

export function allApproved(types: DocumentType[], documents: UserDocument[]): boolean {
	return types.every((type) =>
		documents.some((d) => d.documentTypeId === type.id && d.status === "approved"),
	);
}

/** The user's applications waiting at the documents stage, with the types each asks for. */
export async function waitingApplications(db: Db, userId: string) {
	const rows = await db
		.select({ id: schema.applications.id, stageOptions: schema.courses.stageOptions })
		.from(schema.applications)
		.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
		.where(
			and(
				eq(schema.applications.userId, userId),
				eq(schema.applications.status, "in_progress"),
				eq(schema.applications.currentStage, STAGE),
			),
		);
	return Promise.all(
		rows.map(async (row) => ({
			id: row.id,
			types: await typesFor(db, stageOptions.parse(row.stageOptions[STAGE] ?? {})),
		})),
	);
}

/** Every document type the user is currently asked for, without duplicates. */
export async function requestedTypes(db: Db, userId: string): Promise<DocumentType[]> {
	const byId = new Map<string, DocumentType>();
	for (const app of await waitingApplications(db, userId)) {
		for (const type of app.types) byId.set(type.id, type);
	}
	return [...byId.values()].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
	);
}

/** Completes the documents stage of every waiting application whose documents are all approved. */
export async function syncDocumentStage(app: Zaydemy, userId: string) {
	const documents = await documentsOf(app.db, userId);
	for (const waiting of await waitingApplications(app.db, userId)) {
		if (allApproved(waiting.types, documents)) {
			await app.engine.complete(waiting.id, STAGE, { ifCurrent: true });
		}
	}
}

export type UploadError = "missing_file" | "too_large" | "wrong_type" | "not_requested";

/** Stores a new file for a requested document type, replacing the previous one. */
export async function uploadDocument(
	app: Zaydemy,
	input: { userId: string; typeKey: string; file: File | null; maxBytes: number },
): Promise<{ error: UploadError } | { document: UserDocument }> {
	const { userId, file } = input;
	const type = (await requestedTypes(app.db, userId)).find((t) => t.key === input.typeKey);
	if (!type) return { error: "not_requested" };
	if (!file || file.size === 0) return { error: "missing_file" };
	if (file.size > input.maxBytes) return { error: "too_large" };
	const contentType = file.type.toLowerCase();
	if (!FORMATS[type.format].includes(contentType)) return { error: "wrong_type" };

	const extension = contentType === "application/pdf" ? "pdf" : contentType.split("/")[1];
	const storageKey = `documents/${userId}/${type.key}-${Date.now()}.${extension}`;
	const storage = app.config.storage;
	await storage.put(storageKey, new Uint8Array(await file.arrayBuffer()), contentType);

	const [previous] = await app.db
		.select({ storageKey: userDocuments.storageKey })
		.from(userDocuments)
		.where(and(eq(userDocuments.userId, userId), eq(userDocuments.documentTypeId, type.id)));
	const values = {
		storageKey,
		fileName: file.name.slice(0, 200),
		contentType,
		size: file.size,
		status: "uploaded" as const,
		reviewNote: null,
		reviewedBy: null,
		reviewedAt: null,
	};
	const document = await app.engine.transaction(async ({ db, emit }) => {
		const [row] = await db
			.insert(userDocuments)
			.values({ userId, documentTypeId: type.id, ...values })
			.onConflictDoUpdate({
				target: [userDocuments.userId, userDocuments.documentTypeId],
				set: values,
			})
			.returning();
		const saved = row as UserDocument;
		emit("document.uploaded", { documentId: saved.id, userId });
		return saved;
	});
	if (previous) {
		await storage.delete(previous.storageKey).catch((error) => {
			app.config.errorReporter.capture(error, { storageKey: previous.storageKey });
		});
	}
	return { document };
}

/** Records staff's decision; approving the last missing document completes the stage. */
export async function reviewDocument(
	app: Zaydemy,
	input: { documentId: string; approve: boolean; note?: string; actorId?: string },
) {
	const document = await app.engine.transaction(async ({ db, emit }) => {
		const [row] = await db
			.update(userDocuments)
			.set({
				status: input.approve ? "approved" : "rejected",
				reviewNote: input.approve ? null : (input.note ?? null),
				reviewedBy: input.actorId ?? null,
				reviewedAt: new Date(),
			})
			.where(eq(userDocuments.id, input.documentId))
			.returning();
		if (!row) return null;
		emit(input.approve ? "document.approved" : "document.rejected", {
			documentId: row.id,
			userId: row.userId,
			note: input.note,
		});
		return row;
	});
	if (document && input.approve) await syncDocumentStage(app, document.userId);
	return document;
}
