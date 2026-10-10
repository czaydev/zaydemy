import type { ComponentProps } from "react";
import { cn } from "../cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"rounded-xl border bg-card text-card-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
	return <h3 className={cn("font-semibold text-base leading-snug", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
	return <p className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex items-center gap-2 border-t bg-muted/40 px-5 py-3", className)}
			{...props}
		/>
	);
}
