import type { ReactNode } from "react";
import { cn } from "../cn";

/** Page title with an optional description and actions on the right. */
export function PageHeader({
	title,
	description,
	actions,
	back,
	className,
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	/** Small link above the title, e.g. back to a list. */
	back?: { href: string; label: ReactNode };
	className?: string;
}) {
	return (
		<div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
			<div className="grid gap-1">
				{back ? (
					<a href={back.href} className="mb-1 text-muted-foreground text-sm hover:text-foreground">
						← {back.label}
					</a>
				) : null}
				<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
				{description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
			</div>
			{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
		</div>
	);
}
