import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const buttonVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
				secondary: "bg-muted text-foreground hover:bg-muted/70",
				outline: "border border-input bg-card shadow-xs hover:bg-muted",
				ghost: "text-foreground hover:bg-muted",
				destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				sm: "h-8 px-3 text-xs",
				md: "h-9 px-4",
				lg: "h-11 px-6 text-base",
				icon: "size-9",
			},
		},
		defaultVariants: { variant: "default", size: "md" },
	},
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({
	className,
	variant,
	size,
	type = "button",
	...props
}: ComponentProps<"button"> & ButtonVariants) {
	return (
		<button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
	);
}

/** A link that looks like a button. */
export function ButtonLink({
	className,
	variant,
	size,
	...props
}: ComponentProps<"a"> & ButtonVariants) {
	return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
