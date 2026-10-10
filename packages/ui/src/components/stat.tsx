import type { ReactNode } from "react";
import { cn } from "../cn";
import { Card } from "./card";

/** A single number on a dashboard. */
export function Stat({
	label,
	value,
	hint,
	icon,
	className,
}: {
	label: ReactNode;
	value: ReactNode;
	hint?: ReactNode;
	icon?: ReactNode;
	className?: string;
}) {
	return (
		<Card className={cn("flex items-start justify-between gap-4 p-5", className)}>
			<div className="grid gap-1">
				<p className="text-muted-foreground text-sm">{label}</p>
				<p className="font-semibold text-2xl tabular-nums tracking-tight">{value}</p>
				{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			</div>
			{icon ? (
				<div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4.5">
					{icon}
				</div>
			) : null}
		</Card>
	);
}
