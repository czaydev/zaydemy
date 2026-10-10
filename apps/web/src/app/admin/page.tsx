import { notFound, redirect } from "next/navigation";
import { getTranslator } from "@/server/i18n";
import { getPluginSession } from "@/server/session";
import { resolvedConfig } from "@/server/zaydemy";

/** Admin landing page: the menu entries of enabled plugins the user may open. */
export default async function AdminHomePage() {
	const session = await getPluginSession();
	if (!session) redirect("/auth/sign-in");
	if (session.roles.length === 0) notFound();
	const t = await getTranslator();
	const items = resolvedConfig.adminNav.filter(
		(item) => !item.permission || session.permissions.includes(item.permission),
	);
	return (
		<main>
			<h1>{t("adminHome.title")}</h1>
			{items.length === 0 ? <p>{t("adminHome.empty")}</p> : null}
			<ul>
				{items.map((item) => (
					<li key={item.href}>
						<a href={item.href}>{t(item.label)}</a>
					</li>
				))}
			</ul>
		</main>
	);
}
