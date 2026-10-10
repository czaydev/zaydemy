import { type PluginPageProps, runtime } from "@zaydemy/core";
import { getProfile } from "../profile";

/** Public link list for social media bios. */
export default async function LinksPage({ t }: PluginPageProps) {
	const profile = await getProfile(runtime().db);
	if (!profile) return <p>{t("linkInBio.empty")}</p>;
	return (
		<main style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
			{profile.avatarUrl ? (
				<img
					src={profile.avatarUrl}
					alt=""
					width={96}
					height={96}
					style={{ borderRadius: "50%" }}
				/>
			) : null}
			<h1>{profile.title}</h1>
			{profile.description ? <p>{profile.description}</p> : null}
			<ul style={{ listStyle: "none", padding: 0 }}>
				{profile.links.map((link) => (
					<li key={link.url}>
						<a href={link.url} rel="noopener">
							{link.title}
						</a>
					</li>
				))}
			</ul>
		</main>
	);
}
