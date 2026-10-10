"use client";

import { cn, Icon } from "@zaydemy/ui";
import { usePathname } from "next/navigation";
import type { MenuLink } from "./user-menu";

function isActive(pathname: string, href: string, exact: boolean) {
	return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Header links with the current page highlighted. */
export function HeaderNav({ links }: { links: MenuLink[] }) {
	const pathname = usePathname();
	return (
		<nav className="hidden items-center gap-1 md:flex">
			{links.map((link) => (
				<a
					key={link.href}
					href={link.href}
					className={cn(
						"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
						isActive(pathname, link.href, link.href === "/")
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{link.label}
				</a>
			))}
		</nav>
	);
}

/** Sidebar links for the admin area. */
export function SidebarNav({ links }: { links: MenuLink[] }) {
	const pathname = usePathname();
	return (
		<nav className="grid gap-0.5">
			{links.map((link) => {
				const active = isActive(pathname, link.href, link.href === "/admin");
				return (
					<a
						key={link.href}
						href={link.href}
						aria-current={active ? "page" : undefined}
						className={cn(
							"flex items-center gap-2.5 rounded-md px-2.5 py-2 font-medium text-sm transition-colors",
							active
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<Icon name={link.icon} className="size-4 shrink-0" />
						{link.label}
					</a>
				);
			})}
		</nav>
	);
}
