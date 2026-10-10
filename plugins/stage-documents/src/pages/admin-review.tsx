import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { asc, eq } from "drizzle-orm";
import { documentTypes, userDocuments } from "../schema";

/** Uploaded documents waiting for a decision, oldest first. */
export default async function AdminDocumentReviewPage({ t }: PluginPageProps) {
	const rows = await runtime()
		.db.select({
			id: userDocuments.id,
			fileName: userDocuments.fileName,
			createdAt: userDocuments.updatedAt,
			type: documentTypes.name,
			applicant: schema.users.name,
			email: schema.users.email,
		})
		.from(userDocuments)
		.innerJoin(documentTypes, eq(documentTypes.id, userDocuments.documentTypeId))
		.innerJoin(schema.users, eq(schema.users.id, userDocuments.userId))
		.where(eq(userDocuments.status, "uploaded"))
		.orderBy(asc(userDocuments.updatedAt))
		.limit(200);

	return (
		<main>
			<h1>{t("documents.review.title")}</h1>
			<p>
				<a href="/admin/document-types">{t("documents.typesNav")}</a>
			</p>
			{rows.length === 0 ? <p>{t("documents.review.empty")}</p> : null}
			<table>
				<thead>
					<tr>
						<th>{t("documents.review.applicant")}</th>
						<th>{t("documents.review.document")}</th>
						<th />
						<th />
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.id}>
							<td>
								{row.applicant} ({row.email})
							</td>
							<td>
								<a href={`/api/documents/files/${row.id}`}>{row.type}</a>
							</td>
							<td>
								<form method="post" action={`/api/admin/documents/${row.id}/approve`}>
									<button type="submit">{t("documents.review.approve")}</button>
								</form>
							</td>
							<td>
								<form method="post" action={`/api/admin/documents/${row.id}/reject`}>
									<input name="note" placeholder={t("documents.review.note")} required />
									<button type="submit">{t("documents.review.reject")}</button>
								</form>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</main>
	);
}
