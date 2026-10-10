import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Field,
	Input,
	PageHeader,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { asc } from "drizzle-orm";
import { documentFormat, documentTypes } from "../schema";

/** Document types with a form to add one. Courses pick types by key in their stage options. */
export default async function AdminDocumentTypesPage({ t }: PluginPageProps) {
	const rows = await runtime()
		.db.select()
		.from(documentTypes)
		.orderBy(asc(documentTypes.sortOrder), asc(documentTypes.name));

	return (
		<main className="grid gap-8">
			<PageHeader
				back={{ href: "/admin/documents", label: t("documents.review.title") }}
				title={t("documents.typesNav")}
				className="mb-0"
			/>
			{rows.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("documents.types.name")}</TableHead>
							<TableHead>{t("documents.types.key")}</TableHead>
							<TableHead>{t("documents.types.format")}</TableHead>
							<TableHead className="text-right">{t("documents.types.active")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((type) => (
							<TableRow key={type.id}>
								<TableCell>
									<p className="font-medium">{type.name}</p>
									{type.description ? (
										<p className="text-muted-foreground text-xs">{type.description}</p>
									) : null}
								</TableCell>
								<TableCell className="font-mono text-xs">{type.key}</TableCell>
								<TableCell>
									<Badge variant="secondary">{t(`documents.formats.${type.format}`)}</Badge>
								</TableCell>
								<TableCell>
									<form
										method="post"
										action={`/api/admin/document-types/${type.id}/toggle`}
										className="flex items-center justify-end gap-3"
									>
										<Badge variant={type.isActive ? "success" : "secondary"}>
											{type.isActive ? "●" : "○"}
										</Badge>
										<Button type="submit" variant="outline" size="sm">
											{t("documents.types.toggle")}
										</Button>
									</form>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : null}
			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle>{t("documents.types.add")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="/api/admin/document-types"
						className="grid gap-4 sm:grid-cols-2"
					>
						<Field label={t("documents.types.name")} htmlFor="name">
							<Input id="name" name="name" required />
						</Field>
						<Field label={t("documents.types.key")} htmlFor="key">
							<Input id="key" name="key" pattern="[a-z0-9-]+" className="font-mono" required />
						</Field>
						<Field
							label={t("documents.types.description")}
							htmlFor="description"
							className="sm:col-span-2"
						>
							<Input id="description" name="description" />
						</Field>
						<Field label={t("documents.types.format")} htmlFor="format">
							<Select id="format" name="format">
								{documentFormat.enumValues.map((format) => (
									<option key={format} value={format}>
										{t(`documents.formats.${format}`)}
									</option>
								))}
							</Select>
						</Field>
						<div className="sm:col-span-2">
							<Button type="submit">{t("documents.types.add")}</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
