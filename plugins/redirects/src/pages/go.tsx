import { type PluginPageProps, runtime } from "@zaydemy/core";
import { follow } from "../service";

/** Public short-link page: redirects at once, or after the link's countdown. */
export default async function RedirectPage({ params, t }: PluginPageProps) {
	const redirect = await follow(runtime().db, params.slug ?? "");
	if (!redirect) return <p>{t("redirects.notFound")}</p>;
	return (
		<main>
			<meta
				httpEquiv="refresh"
				content={`${redirect.countdownSeconds};url=${redirect.targetUrl}`}
			/>
			<meta name="robots" content="noindex" />
			<h1>{redirect.name}</h1>
			{redirect.description ? <p>{redirect.description}</p> : null}
			<p>{t("redirects.redirecting")}</p>
			<a href={redirect.targetUrl} rel="noopener">
				{t("redirects.continue")}
			</a>
		</main>
	);
}
