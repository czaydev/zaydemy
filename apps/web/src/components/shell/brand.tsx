import { cn } from "@zaydemy/ui";
import { resolvedConfig } from "@/server/zaydemy";

/** The institution's logo, or its initial and name when no logo is configured. */
export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
	const { name, logo } = resolvedConfig.brand;
	return (
		<a href="/" className={cn("flex items-center gap-2.5 font-semibold", className)}>
			{logo ? (
				// biome-ignore lint/performance/noImgElement: logos are configured URLs of any size and format
				<img src={compact ? logo.icon : logo.full} alt={name} className="h-8 w-auto" />
			) : (
				<>
					<span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
						{name.slice(0, 1).toLocaleUpperCase()}
					</span>
					{compact ? null : <span className="tracking-tight">{name}</span>}
				</>
			)}
		</a>
	);
}
