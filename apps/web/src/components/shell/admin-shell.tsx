import { CORE_PERMISSIONS, type PluginSession } from "@zaydemy/core";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { PoweredBy } from "@/components/powered-by";
import { getTranslator } from "@/server/i18n";
import { resolvedConfig } from "@/server/zaydemy";
import { Brand } from "./brand";
import { LocaleSwitch } from "./locale-switch";
import { SidebarNav } from "./nav-links";
import { type MenuLink, UserMenu } from "./user-menu";

/** Sidebar layout for /admin; the menu lists what the user's permissions allow. */
export async function AdminShell({
	session,
	children,
}: {
	session: PluginSession;
	children: ReactNode;
}) {
	const t = await getTranslator();
	const core = [
		{
			label: "applications.title",
			href: "/admin/applications",
			icon: "clipboard-list",
			permission: CORE_PERMISSIONS.viewApplications,
		},
		{
			label: "courses.title",
			href: "/admin/courses",
			icon: "graduation-cap",
			permission: CORE_PERMISSIONS.manageCourses,
		},
		{
			label: "users.title",
			href: "/admin/users",
			icon: "users",
			permission: CORE_PERMISSIONS.manageUsers,
		},
	];
	const links: MenuLink[] = [
		{ label: t("admin.overview"), href: "/admin", icon: "chart" },
		...[...core, ...resolvedConfig.adminNav]
			.filter((item) => !item.permission || session.permissions.includes(item.permission))
			.map((item) => ({ ...item, label: t(item.label) })),
	];
	const user = (side: "top" | "bottom") => (
		<UserMenu
			side={side}
			name={session.user.name}
			email={session.user.email}
			links={[{ label: t("admin.backToSite"), href: "/", icon: "home" }]}
			signOutLabel={t("common.signOut")}
			align={side === "top" ? "left" : "right"}
		/>
	);

	return (
		<div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
			<aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card lg:flex">
				<div className="flex h-16 items-center px-5">
					<Brand />
				</div>
				<div className="flex-1 overflow-y-auto px-3 py-2">
					<p className="px-2.5 pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
						{t("common.admin")}
					</p>
					<SidebarNav links={links} />
				</div>
				<div className="grid gap-3 border-t p-3">
					{user("top")}
					<div className="flex items-center justify-between px-1">
						<PoweredBy />
						<LocaleSwitch />
					</div>
				</div>
			</aside>

			<div className="flex min-w-0 flex-col">
				<header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:hidden">
					<details className="group relative">
						<summary
							aria-label={t("common.menu")}
							className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted [&::-webkit-details-marker]:hidden"
						>
							<Menu className="size-5" />
						</summary>
						<div className="absolute top-11 left-0 z-50 w-64 rounded-xl border bg-card p-2 shadow-lg">
							<SidebarNav links={links} />
						</div>
					</details>
					<Brand />
					<div className="ml-auto">{user("bottom")}</div>
				</header>
				{/* Pages render their own <main>. */}
				<div className="zd-content mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
					{children}
				</div>
			</div>
		</div>
	);
}
