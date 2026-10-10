import type { ReactNode } from "react";
import { cn } from "../cn";

/** Label/value pairs, e.g. the details of a payment. */
export function DetailList({
	items,
	className,
}: {
	items: { label: ReactNode; value: ReactNode }[];
	className?: string;
}) {
	return (
		<dl className={cn("grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]", className)}>
			{items.map((item, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static list
				<div key={index} className="contents">
					<dt className="text-muted-foreground">{item.label}</dt>
					<dd className="-mt-2 font-medium sm:mt-0">{item.value}</dd>
				</div>
			))}
		</dl>
	);
}
