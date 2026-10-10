import type { ReactNode } from "react";
import { cn } from "../cn";

export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center",
				className,
			)}
		>
			{icon ? (
				<div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
					{icon}
				</div>
			) : null}
			<p className="font-medium">{title}</p>
			{description ? <p className="max-w-sm text-muted-foreground text-sm">{description}</p> : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
