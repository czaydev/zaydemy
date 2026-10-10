import { type PluginPageProps, runtime } from "@zaydemy/core";
import { documentsOf, requestedTypes } from "../service";

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
			<h1>{t("documents.title")}</h1>
			{error ? <p role="alert">{t(`documents.errors.${error}`, { max, formats: "" })}</p> : null}
			{types.length === 0 ? <p>{t("documents.none")}</p> : <p>{t("documents.intro")}</p>}
			<ul>
				{types.map((type) => {
					const document = documents.find((d) => d.documentTypeId === type.id);
					const status = document?.status ?? "missing";
					return (
						<li key={type.id}>
							<h2>{type.name}</h2>
							{type.description ? <p>{type.description}</p> : null}
							<p>
								{t(`documents.status.${status}`)}
								{document?.status === "rejected" && document.reviewNote
									? `: ${document.reviewNote}`
									: null}
								{document ? (
									<>
										{" · "}
										<a href={`/api/documents/files/${document.id}`}>{t("documents.view")}</a>
									</>
								) : null}
							</p>
							{status !== "approved" ? (
								<form
									method="post"
									action={`/api/documents/${type.key}`}
									encType="multipart/form-data"
								>
									<input
										type="file"
										name="file"
										accept={type.format === "pdf" ? "application/pdf" : "image/jpeg,image/png"}
										required
									/>{" "}
									({t(`documents.formats.${type.format}`)}){" "}
									<button type="submit">
										{t(document ? "documents.replace" : "documents.upload")}
									</button>
								</form>
							) : null}
						</li>
					);
				})}
			</ul>
		</main>
	);
}
