import { type PluginPageProps, runtime } from "@zaydemy/core";
import { getProfile } from "../profile";

export default async function AdminLinkInBioPage({ searchParams, t }: PluginPageProps) {
	const profile = await getProfile(runtime().db);
	return (
		<main>
			<h1>{t("linkInBio.nav")}</h1>
			<p>
				<a href="/links">{t("linkInBio.view")}</a>
			</p>
			{searchParams.error ? <p role="alert">{t("linkInBio.invalid")}</p> : null}
			<form method="post" action="/api/admin/link-in-bio">
				<label>
					{t("linkInBio.title")}
					<input name="title" defaultValue={profile?.title} required />
				</label>
				<label>
					{t("linkInBio.description")}
					<textarea name="description" defaultValue={profile?.description} rows={3} />
				</label>
				<label>
					{t("linkInBio.avatar")}
					<input name="avatarUrl" type="url" defaultValue={profile?.avatarUrl} />
				</label>
				<label>
					{t("linkInBio.links")}
					<textarea
						name="links"
						rows={10}
						defaultValue={profile?.links.map((l) => `${l.title} | ${l.url}`).join("\n")}
					/>
				</label>
				<button type="submit">{t("linkInBio.save")}</button>
			</form>
		</main>
	);
}
