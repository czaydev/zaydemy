import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium text-xs [&_svg]:size-3",
	{
		variants: {
			variant: {
				default: "bg-accent text-accent-foreground",
				secondary: "bg-muted text-muted-foreground",
				success: "bg-success-soft text-success-strong",
				warning: "bg-warning-soft text-warning-strong",
				destructive: "bg-destructive-soft text-destructive-strong",
				outline: "border text-foreground",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({
	className,
	variant,
	...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
