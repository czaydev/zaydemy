import { type PluginPageProps, runtime } from "@zaydemy/core";
import { ButtonLink, EmptyState } from "@zaydemy/ui";
import { follow } from "../service";

/** Public short-link page: redirects at once, or after the link's countdown. */
export default async function RedirectPage({ params, t }: PluginPageProps) {
	const redirect = await follow(runtime().db, params.slug ?? "");
	if (!redirect) {
		return (
			<main className="mx-auto max-w-md px-4 py-16">
				<EmptyState title={t("redirects.notFound")} />
			</main>
		);
	}
	return (
		<main className="flex min-h-dvh items-center justify-center px-4">
			<meta
				httpEquiv="refresh"
				content={`${redirect.countdownSeconds};url=${redirect.targetUrl}`}
			/>
			<meta name="robots" content="noindex" />
			<div className="grid max-w-md justify-items-center gap-3 text-center">
				<span
					aria-hidden
					className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary"
				/>
				<h1 className="font-semibold text-xl">{redirect.name}</h1>
				{redirect.description ? (
					<p className="text-muted-foreground">{redirect.description}</p>
				) : null}
				<p className="text-muted-foreground text-sm">{t("redirects.redirecting")}</p>
				<ButtonLink href={redirect.targetUrl} rel="noopener" variant="outline" size="sm">
					{t("redirects.continue")}
				</ButtonLink>
			</div>
		</main>
	);
}
