import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Alert,
	Badge,
	type BadgeVariant,
	Button,
	Card,
	CardContent,
	EmptyState,
	Icon,
	Input,
	PageHeader,
} from "@zaydemy/ui";
import { documentsOf, requestedTypes } from "../service";

const statusVariant: Record<string, BadgeVariant> = {
	missing: "warning",
	uploaded: "default",
	approved: "success",
	rejected: "destructive",
};

/** Documents the applicant is asked for, with their status and an upload form for each. */
export default async function MyDocumentsPage({ session, searchParams, t }: PluginPageProps) {
	if (!session) return null;
	const { db } = runtime();
	const [types, documents] = await Promise.all([
		requestedTypes(db, session.user.id),
		documentsOf(db, session.user.id),
	]);
	const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
	const max = typeof searchParams.max === "string" ? searchParams.max : "";

	return (
		<main>
			<PageHeader
				title={t("documents.title")}
				description={types.length > 0 ? t("documents.intro") : undefined}
			/>
			{error ? (
				<Alert variant="destructive" className="mb-4">
					{t(`documents.errors.${error}`, { max, formats: "" })}
				</Alert>
			) : null}
			{types.length === 0 ? (
				<EmptyState icon={<Icon name="file-check" />} title={t("documents.none")} />
			) : (
				<div className="grid gap-3">
					{types.map((type) => {
						const document = documents.find((d) => d.documentTypeId === type.id);
						const status = document?.status ?? "missing";
						return (
							<Card key={type.id}>
								<CardContent className="grid gap-4">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="flex gap-3">
											<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
												<Icon name="file-text" className="size-5" />
											</span>
											<div className="grid gap-0.5">
												<h2 className="font-semibold">{type.name}</h2>
												{type.description ? (
													<p className="text-muted-foreground text-sm">{type.description}</p>
												) : null}
												<p className="text-muted-foreground text-xs">
													{t(`documents.formats.${type.format}`)}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3">
											{document ? (
												<a
													href={`/api/documents/files/${document.id}`}
													target="_blank"
													rel="noopener"
													className="font-medium text-primary text-sm hover:underline"
												>
													{t("documents.view")}
												</a>
											) : null}
											<Badge variant={statusVariant[status]}>
												{t(`documents.status.${status}`)}
											</Badge>
										</div>
									</div>
									{document?.status === "rejected" && document.reviewNote ? (
										<Alert variant="destructive">{document.reviewNote}</Alert>
									) : null}
									{status !== "approved" ? (
										<form
											method="post"
											action={`/api/documents/${type.key}`}
											encType="multipart/form-data"
											className="flex flex-wrap items-center gap-3 border-t pt-4"
										>
											<Input
												type="file"
												name="file"
												accept={type.format === "pdf" ? "application/pdf" : "image/jpeg,image/png"}
												className="max-w-sm flex-1"
												required
											/>
											<Button type="submit" variant={document ? "outline" : "default"}>
												{t(document ? "documents.replace" : "documents.upload")}
											</Button>
										</form>
									) : null}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</main>
	);
}
