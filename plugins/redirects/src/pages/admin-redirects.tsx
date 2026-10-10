import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Alert,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	EmptyState,
	Field,
	Icon,
	Input,
	LinkTabs,
	PageHeader,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { redirectCategories, redirects } from "../schema";

/** Redirects with click counts, filterable by category, plus forms to add links and categories. */
export default async function AdminRedirectsPage({ searchParams, locale, t }: PluginPageProps) {
	const { db, baseUrl } = runtime();
	const category = typeof searchParams.category === "string" ? searchParams.category : undefined;
	const categories = await db
		.select()
		.from(redirectCategories)
		.orderBy(asc(redirectCategories.name));
	const query = db.select().from(redirects).$dynamic();
	if (category === "none") query.where(isNull(redirects.categoryId));
	else if (category) query.where(eq(redirects.categoryId, category));
	const rows = await query.orderBy(desc(redirects.clicks));
	const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;
	const number = new Intl.NumberFormat(locale);

	return (
		<main className="grid gap-8">
			<div>
				<PageHeader title={t("redirects.nav")} className="mb-4" />
				<LinkTabs
					className="mb-4"
					items={[
						{ href: "/admin/redirects", label: t("redirects.all"), active: !category },
						{
							href: "/admin/redirects?category=none",
							label: t("redirects.none"),
							active: category === "none",
						},
						...categories.map((c) => ({
							href: `/admin/redirects?category=${c.id}`,
							label: c.name,
							active: category === c.id,
						})),
					]}
				/>
				{rows.length === 0 ? (
					<EmptyState icon={<Icon name="link" />} title={t("redirects.empty")} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("redirects.name")}</TableHead>
								<TableHead>{t("redirects.target")}</TableHead>
								<TableHead>{t("redirects.category")}</TableHead>
								<TableHead className="text-right">{t("redirects.clicks")}</TableHead>
								<TableHead className="text-right">{t("redirects.active")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={r.id}>
									<TableCell>
										<p className="font-medium">{r.name}</p>
										<a
											href={`${baseUrl}/r/${r.slug}`}
											className="font-mono text-primary text-xs hover:underline"
										>
											/r/{r.slug}
										</a>
									</TableCell>
									<TableCell className="max-w-64 truncate text-muted-foreground">
										{r.targetUrl}
									</TableCell>
									<TableCell>
										{categoryName(r.categoryId) ? (
											<Badge variant="secondary">{categoryName(r.categoryId)}</Badge>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell className="text-right font-medium tabular-nums">
										{number.format(r.clicks)}
									</TableCell>
									<TableCell>
										<form
											method="post"
											action={`/api/admin/redirects/${r.id}/toggle`}
											className="flex justify-end"
										>
											<Button
												type="submit"
												size="sm"
												variant={r.isActive ? "secondary" : "outline"}
												aria-pressed={r.isActive}
											>
												<span
													className={r.isActive ? "text-success-strong" : "text-muted-foreground"}
												>
													{r.isActive ? "●" : "○"}
												</span>
												{t(r.isActive ? "redirects.deactivate" : "redirects.activate")}
											</Button>
										</form>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>{t("redirects.add")}</CardTitle>
					</CardHeader>
					<CardContent>
						<form method="post" action="/api/admin/redirects" className="grid gap-4 sm:grid-cols-2">
							{searchParams.error ? (
								<Alert variant="destructive" className="sm:col-span-2">
									{t("redirects.invalid")}
								</Alert>
							) : null}
							<Field label={t("redirects.name")} htmlFor="name">
								<Input id="name" name="name" required />
							</Field>
							<Field label={t("redirects.slug")} htmlFor="slug">
								<Input
									id="slug"
									name="slug"
									pattern="[a-z0-9]+(-[a-z0-9]+)*"
									className="font-mono"
									required
								/>
							</Field>
							<Field label={t("redirects.target")} htmlFor="targetUrl" className="sm:col-span-2">
								<Input id="targetUrl" name="targetUrl" type="url" placeholder="https://" required />
							</Field>
							<Field
								label={t("redirects.description")}
								htmlFor="description"
								className="sm:col-span-2"
							>
								<Input id="description" name="description" />
							</Field>
							<Field label={t("redirects.countdown")} htmlFor="countdownSeconds">
								<Input
									id="countdownSeconds"
									name="countdownSeconds"
									type="number"
									min={0}
									max={60}
									defaultValue={0}
								/>
							</Field>
							<Field label={t("redirects.category")} htmlFor="categoryId">
								<Select id="categoryId" name="categoryId" defaultValue="">
									<option value="">{t("redirects.none")}</option>
									{categories.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</Select>
							</Field>
							<div className="sm:col-span-2">
								<Button type="submit">{t("redirects.add")}</Button>
							</div>
						</form>
					</CardContent>
				</Card>
				<Card className="self-start">
					<CardHeader>
						<CardTitle>{t("redirects.addCategory")}</CardTitle>
					</CardHeader>
					<CardContent>
						<form method="post" action="/api/admin/redirect-categories" className="grid gap-3">
							<Input name="name" aria-label={t("redirects.category")} required />
							<div>
								<Button type="submit" variant="outline">
									{t("redirects.addCategory")}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
