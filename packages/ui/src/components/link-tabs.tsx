import type { ReactNode } from "react";
import { cn } from "../cn";

/** A row of links styled as tabs, for filters kept in the URL. */
export function LinkTabs({
	items,
	className,
}: {
	items: { href: string; label: ReactNode; active?: boolean }[];
	className?: string;
}) {
	return (
		<nav className={cn("-mx-1 flex gap-1 overflow-x-auto px-1 pb-1", className)}>
			{items.map((item) => (
				<a
					key={item.href}
					href={item.href}
					aria-current={item.active ? "page" : undefined}
					className={cn(
						"whitespace-nowrap rounded-full border px-3 py-1 font-medium text-xs transition-colors",
						item.active
							? "border-primary bg-primary text-primary-foreground"
							: "bg-card text-muted-foreground hover:text-foreground",
					)}
				>
					{item.label}
				</a>
			))}
		</nav>
	);
}
