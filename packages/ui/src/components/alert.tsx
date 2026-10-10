import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

const alertVariants = cva(
	"flex gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				info: "border-primary/20 bg-info-soft text-info-strong",
				success: "border-success/30 bg-success-soft text-success-strong",
				warning: "border-warning/40 bg-warning-soft text-warning-strong",
				destructive: "border-destructive/30 bg-destructive-soft text-destructive-strong",
			},
		},
		defaultVariants: { variant: "info" },
	},
);

const icons = {
	info: Info,
	success: CircleCheck,
	warning: TriangleAlert,
	destructive: CircleAlert,
};

export function Alert({
	className,
	variant,
	title,
	children,
	...props
}: Omit<ComponentProps<"div">, "title"> &
	VariantProps<typeof alertVariants> & { title?: ReactNode }) {
	const Icon = icons[variant ?? "info"];
	return (
		<div
			role={variant === "destructive" ? "alert" : "status"}
			className={cn(alertVariants({ variant }), className)}
			{...props}
		>
			<Icon />
			<div className="grid gap-0.5">
				{title ? <p className="font-medium">{title}</p> : null}
				{children ? <div className="opacity-90">{children}</div> : null}
			</div>
		</div>
	);
}
