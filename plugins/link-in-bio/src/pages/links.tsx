import { type PluginPageProps, runtime } from "@zaydemy/core";
import { Avatar, EmptyState } from "@zaydemy/ui";
import { getProfile } from "../profile";

/** Public link list for social media bios. */
export default async function LinksPage({ t }: PluginPageProps) {
	const profile = await getProfile(runtime().db);
	if (!profile) {
		return (
			<main className="mx-auto max-w-md px-4 py-16">
				<EmptyState title={t("linkInBio.empty")} />
			</main>
		);
	}
	return (
		<main className="min-h-dvh bg-gradient-to-b from-accent to-background px-4 py-14">
			<div className="mx-auto grid max-w-md justify-items-center gap-3 text-center">
				{profile.avatarUrl ? (
					<img
						src={profile.avatarUrl}
						alt=""
						width={96}
						height={96}
						className="size-24 rounded-full border-4 border-card object-cover shadow-md"
					/>
				) : (
					<Avatar name={profile.title} className="size-24 text-2xl" />
				)}
				<h1 className="mt-2 font-semibold text-2xl tracking-tight">{profile.title}</h1>
				{profile.description ? (
					<p className="text-muted-foreground">{profile.description}</p>
				) : null}
				<ul className="mt-4 grid w-full gap-3">
					{profile.links.map((link) => (
						<li key={link.url}>
							<a
								href={link.url}
								rel="noopener"
								className="block rounded-xl border bg-card px-5 py-3.5 font-medium shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
							>
								{link.title}
							</a>
						</li>
					))}
				</ul>
			</div>
		</main>
	);
}
