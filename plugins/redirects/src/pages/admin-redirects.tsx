import { type PluginPageProps, runtime } from "@zaydemy/core";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { redirectCategories, redirects } from "../schema";

/** Redirects with click counts, filterable by category, plus forms to add links and categories. */
export default async function AdminRedirectsPage({ searchParams, t }: PluginPageProps) {
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
	const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "-";

	return (
		<main>
			<h1>{t("redirects.nav")}</h1>
			<nav>
				<a href="/admin/redirects">{t("redirects.all")}</a>{" "}
				<a href="/admin/redirects?category=none">{t("redirects.none")}</a>
				{categories.map((c) => (
					<a key={c.id} href={`/admin/redirects?category=${c.id}`}>
						{" "}
						{c.name}
					</a>
				))}
			</nav>
			<table>
				<thead>
					<tr>
						<th>{t("redirects.name")}</th>
						<th>{t("redirects.slug")}</th>
						<th>{t("redirects.target")}</th>
						<th>{t("redirects.category")}</th>
						<th>{t("redirects.clicks")}</th>
						<th>{t("redirects.active")}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr key={r.id}>
							<td>{r.name}</td>
							<td>
								<a href={`${baseUrl}/r/${r.slug}`}>/r/{r.slug}</a>
							</td>
							<td>{r.targetUrl}</td>
							<td>{categoryName(r.categoryId)}</td>
							<td>{r.clicks}</td>
							<td>
								<form method="post" action={`/api/admin/redirects/${r.id}/toggle`}>
									<button type="submit">{r.isActive ? "✓" : "✗"}</button>
								</form>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<h2>{t("redirects.add")}</h2>
			{searchParams.error ? <p role="alert">{t("redirects.invalid")}</p> : null}
			<form method="post" action="/api/admin/redirects">
				<label>
					{t("redirects.name")}
					<input name="name" required />
				</label>
				<label>
					{t("redirects.slug")}
					<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
				</label>
				<label>
					{t("redirects.target")}
					<input name="targetUrl" type="url" required />
				</label>
				<label>
					{t("redirects.description")}
					<input name="description" />
				</label>
				<label>
					{t("redirects.countdown")}
					<input name="countdownSeconds" type="number" min={0} max={60} defaultValue={0} />
				</label>
				<label>
					{t("redirects.category")}
					<select name="categoryId" defaultValue="">
						<option value="">{t("redirects.none")}</option>
						{categories.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</label>
				<button type="submit">{t("redirects.add")}</button>
			</form>

			<h2>{t("redirects.addCategory")}</h2>
			<form method="post" action="/api/admin/redirect-categories">
				<input name="name" required />
				<button type="submit">{t("redirects.addCategory")}</button>
			</form>
		</main>
	);
}
