import type { ReactNode } from "react";
import { cn } from "../cn";
import { buttonVariants } from "./button";

/** Previous/next links with "21–40 / 134" in between. */
export function Pagination({
	page,
	pageSize,
	total,
	href,
	labels,
	className,
}: {
	page: number;
	pageSize: number;
	total: number;
	href: (page: number) => string;
	labels: { previous: ReactNode; next: ReactNode };
	className?: string;
}) {
	if (total <= pageSize && page === 1) return null;
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(total, page * pageSize);
	const link = (target: number, enabled: boolean, label: ReactNode) =>
		enabled ? (
			<a href={href(target)} className={buttonVariants({ variant: "outline", size: "sm" })}>
				{label}
			</a>
		) : (
			<span
				aria-disabled
				className={cn(
					buttonVariants({ variant: "outline", size: "sm" }),
					"pointer-events-none opacity-50",
				)}
			>
				{label}
			</span>
		);
	return (
		<nav className={cn("mt-4 flex items-center justify-between gap-3 text-sm", className)}>
			<span className="text-muted-foreground tabular-nums">
				{from}–{to} / {total}
			</span>
			<span className="flex gap-2">
				{link(page - 1, page > 1, labels.previous)}
				{link(page + 1, to < total, labels.next)}
			</span>
		</nav>
	);
}
