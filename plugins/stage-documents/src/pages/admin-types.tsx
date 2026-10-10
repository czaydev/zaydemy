import { type PluginPageProps, runtime } from "@zaydemy/core";
import { asc } from "drizzle-orm";
import { documentFormat, documentTypes } from "../schema";

/** Document types with a form to add one. Courses pick types by key in their stage options. */
export default async function AdminDocumentTypesPage({ t }: PluginPageProps) {
	const rows = await runtime()
		.db.select()
		.from(documentTypes)
		.orderBy(asc(documentTypes.sortOrder), asc(documentTypes.name));

	return (
		<main>
			<h1>{t("documents.typesNav")}</h1>
			<table>
				<thead>
					<tr>
						<th>{t("documents.types.key")}</th>
						<th>{t("documents.types.name")}</th>
						<th>{t("documents.types.format")}</th>
						<th>{t("documents.types.active")}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((type) => (
						<tr key={type.id}>
							<td>{type.key}</td>
							<td>{type.name}</td>
							<td>{t(`documents.formats.${type.format}`)}</td>
							<td>
								<form method="post" action={`/api/admin/document-types/${type.id}/toggle`}>
									<button type="submit">
										{type.isActive ? "✓" : "✗"} {t("documents.types.toggle")}
									</button>
								</form>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<h2>{t("documents.types.add")}</h2>
			<form method="post" action="/api/admin/document-types">
				<label>
					{t("documents.types.key")}
					<input name="key" pattern="[a-z0-9-]+" required />
				</label>
				<label>
					{t("documents.types.name")}
					<input name="name" required />
				</label>
				<label>
					{t("documents.types.description")}
					<input name="description" />
				</label>
				<label>
					{t("documents.types.format")}
					<select name="format">
						{documentFormat.enumValues.map((format) => (
							<option key={format} value={format}>
								{t(`documents.formats.${format}`)}
							</option>
						))}
					</select>
				</label>
				<button type="submit">{t("documents.types.add")}</button>
			</form>
		</main>
	);
}
