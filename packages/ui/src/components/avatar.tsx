import { cn } from "../cn";

/** Initials in a circle; enough until users have profile pictures. */
export function Avatar({ name, className }: { name: string; className?: string }) {
	const initials = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase())
		.join("");
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground text-xs",
				className,
			)}
		>
			{initials || "?"}
		</span>
	);
}
