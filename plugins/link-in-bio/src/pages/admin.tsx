import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Alert,
	Button,
	ButtonLink,
	Card,
	CardContent,
	Field,
	Icon,
	Input,
	PageHeader,
	Textarea,
} from "@zaydemy/ui";
import { getProfile } from "../profile";

export default async function AdminLinkInBioPage({ searchParams, t }: PluginPageProps) {
	const profile = await getProfile(runtime().db);
	return (
		<main>
			<PageHeader
				title={t("linkInBio.nav")}
				actions={
					<ButtonLink href="/links" target="_blank" variant="outline">
						<Icon name="link" />
						{t("linkInBio.view")}
					</ButtonLink>
				}
			/>
			<Card className="max-w-2xl">
				<CardContent>
					<form method="post" action="/api/admin/link-in-bio" className="grid gap-4">
						{searchParams.error ? (
							<Alert variant="destructive">{t("linkInBio.invalid")}</Alert>
						) : null}
						<Field label={t("linkInBio.title")} htmlFor="title">
							<Input id="title" name="title" defaultValue={profile?.title} required />
						</Field>
						<Field label={t("linkInBio.description")} htmlFor="description">
							<Textarea
								id="description"
								name="description"
								defaultValue={profile?.description}
								rows={3}
							/>
						</Field>
						<Field label={t("linkInBio.avatar")} htmlFor="avatarUrl">
							<Input id="avatarUrl" name="avatarUrl" type="url" defaultValue={profile?.avatarUrl} />
						</Field>
						<Field label={t("linkInBio.links")} htmlFor="links">
							<Textarea
								id="links"
								name="links"
								rows={10}
								className="font-mono"
								defaultValue={profile?.links.map((l) => `${l.title} | ${l.url}`).join("\n")}
							/>
						</Field>
						<div>
							<Button type="submit">{t("linkInBio.save")}</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
