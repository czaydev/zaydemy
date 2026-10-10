import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PoweredBy } from "@/components/powered-by";
import { SignOutButton } from "@/components/sign-out-button";
import { getLocale, getTranslator } from "@/server/i18n";
import { getPluginSession } from "@/server/session";
import { resolvedConfig } from "@/server/zaydemy";

export const metadata: Metadata = {
	title: { template: `%s | ${resolvedConfig.brand.name}`, default: resolvedConfig.brand.name },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
	const [locale, t, session] = await Promise.all([
		getLocale(),
		getTranslator(),
		getPluginSession(),
	]);
	const hasNotifications = resolvedConfig.plugins.some((p) => p.id === "notifications");
	return (
		<html lang={locale}>
			<body>
				<header>
					<nav>
						<a href="/">{t("common.home")}</a>
						{session && hasNotifications ? (
							<>
								{" · "}
								<a href="/notifications">{t("notifications.title")}</a>
							</>
						) : null}
						{session && session.roles.length > 0 ? (
							<>
								{" · "}
								<a href="/admin">{t("common.admin")}</a>
							</>
						) : null}{" "}
						{session ? (
							<SignOutButton label={t("common.signOut")} />
						) : (
							<a href="/auth/sign-in">{t("common.signIn")}</a>
						)}
					</nav>
				</header>
				{children}
				<footer>
					<PoweredBy />
				</footer>
			</body>
		</html>
	);
}
