import { ButtonLink, cn } from "@zaydemy/ui";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { getTranslator } from "@/server/i18n";
import { getPluginSession } from "@/server/session";
import { resolvedConfig } from "@/server/zaydemy";
import { Brand } from "./brand";
import { SiteFooter } from "./footer";
import { HeaderNav } from "./nav-links";
import { type MenuLink, UserMenu } from "./user-menu";

/** Header, content column and footer around every applicant-facing page. */
export async function SiteShell({
	children,
	width = "default",
}: {
	children: ReactNode;
	width?: "default" | "narrow";
}) {
	const [t, session] = await Promise.all([getTranslator(), getPluginSession()]);
	const hasNotifications = resolvedConfig.plugins.some((p) => p.id === "notifications");

	const links: MenuLink[] = session
		? [
				{ label: t("nav.applications"), href: "/", icon: "clipboard-list" },
				...resolvedConfig.appNav.map((item) => ({ ...item, label: t(item.label) })),
			]
		: [];
	const menuLinks: MenuLink[] = [
		...links,
		...(session && session.roles.length > 0
			? [{ label: t("common.admin"), href: "/admin", icon: "settings" }]
			: []),
	];

	return (
		<div className="flex min-h-dvh flex-col">
			<header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
					<Brand />
					<HeaderNav links={links} />
					<div className="ml-auto flex items-center gap-2">
						{session ? (
							<>
								{session.roles.length > 0 ? (
									<ButtonLink
										href="/admin"
										variant="outline"
										size="sm"
										className="hidden sm:inline-flex"
									>
										{t("common.admin")}
									</ButtonLink>
								) : null}
								{hasNotifications ? (
									<ButtonLink
										href="/notifications"
										variant="ghost"
										size="icon"
										aria-label={t("nav.notifications")}
										title={t("nav.notifications")}
									>
										<Bell />
									</ButtonLink>
								) : null}
								<UserMenu
									name={session.user.name}
									email={session.user.email}
									links={menuLinks}
									signOutLabel={t("common.signOut")}
								/>
							</>
						) : (
							<>
								<ButtonLink href="/auth/sign-in" variant="ghost" size="sm">
									{t("common.signIn")}
								</ButtonLink>
								<ButtonLink href="/auth/sign-in?mode=sign-up" size="sm">
									{t("common.signUp")}
								</ButtonLink>
							</>
						)}
					</div>
				</div>
			</header>
			{/* Pages render their own <main>; plugin pages are written that way. */}
			<div
				className={cn(
					"zd-content mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10",
					width === "narrow" ? "max-w-3xl" : "max-w-6xl",
				)}
			>
				{children}
			</div>
			<SiteFooter />
		</div>
	);
}
