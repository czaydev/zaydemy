import "server-only";
import { matchPage, type PageArea, type PluginPageProps } from "@zaydemy/core";
import { notFound, redirect } from "next/navigation";
import type { ComponentType } from "react";
import { getLocale, getTranslator } from "./i18n";
import { getPluginSession } from "./session";
import { getZaydemy, resolvedConfig } from "./zaydemy";

interface CatchAllProps {
	params: Promise<{ path: string[] }>;
	searchParams: Promise<PluginPageProps["searchParams"]>;
}

/** Renders the plugin page registered for this URL, enforcing its permission. */
export async function renderPluginPage(area: PageArea, { params, searchParams }: CatchAllProps) {
	const { path } = await params;
	const match = matchPage(resolvedConfig.pages, area, path);
	if (!match) notFound();

	const session = await getPluginSession();
	if (area === "admin" || match.page.permission || match.page.signedIn) {
		if (!session) redirect("/auth/sign-in");
		const allowed = match.page.permission
			? session.permissions.includes(match.page.permission)
			: area === "app" || session.roles.length > 0;
		if (!allowed) notFound();
	}

	getZaydemy(); // plugin pages read the runtime via `runtime()`
	const { default: Page } = await match.page.load();
	const Component = Page as ComponentType<PluginPageProps>;
	const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
	return (
		<Component
			params={match.params}
			searchParams={await searchParams}
			session={session}
			locale={locale}
			t={t}
		/>
	);
}
