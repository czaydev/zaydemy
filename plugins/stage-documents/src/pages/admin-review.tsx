import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Button,
	ButtonLink,
	EmptyState,
	Icon,
	Input,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { asc, eq } from "drizzle-orm";
import { documentTypes, userDocuments } from "../schema";

/** Uploaded documents waiting for a decision, oldest first. */
export default async function AdminDocumentReviewPage({ locale, t }: PluginPageProps) {
	const rows = await runtime()
		.db.select({
			id: userDocuments.id,
			fileName: userDocuments.fileName,
			updatedAt: userDocuments.updatedAt,
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
	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

	return (
		<main>
			<PageHeader
				title={t("documents.review.title")}
				actions={
					<ButtonLink href="/admin/document-types" variant="outline">
						<Icon name="settings" />
						{t("documents.typesNav")}
					</ButtonLink>
				}
			/>
			{rows.length === 0 ? (
				<EmptyState icon={<Icon name="file-check" />} title={t("documents.review.empty")} />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("documents.review.applicant")}</TableHead>
							<TableHead>{t("documents.review.document")}</TableHead>
							<TableHead className="text-right" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.id}>
								<TableCell>
									<p className="font-medium">{row.applicant}</p>
									<p className="text-muted-foreground text-xs">{row.email}</p>
								</TableCell>
								<TableCell>
									<a
										href={`/api/documents/files/${row.id}`}
										target="_blank"
										rel="noopener"
										className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
									>
										<Icon name="file-text" className="size-4" />
										{row.type}
									</a>
									<p className="text-muted-foreground text-xs">{date.format(row.updatedAt)}</p>
								</TableCell>
								<TableCell>
									<div className="flex flex-wrap items-center justify-end gap-2">
										<form method="post" action={`/api/admin/documents/${row.id}/approve`}>
											<Button type="submit" size="sm">
												{t("documents.review.approve")}
											</Button>
										</form>
										<form
											method="post"
											action={`/api/admin/documents/${row.id}/reject`}
											className="flex items-center gap-2"
										>
											<Input
												name="note"
												placeholder={t("documents.review.note")}
												className="h-8 w-48"
												required
											/>
											<Button type="submit" size="sm" variant="outline">
												{t("documents.review.reject")}
											</Button>
										</form>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
