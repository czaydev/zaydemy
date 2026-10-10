import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

const control =
	"w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
	return (
		<input
			type={type}
			className={cn(
				control,
				"h-9 py-1 file:mr-3 file:border-0 file:bg-transparent file:font-medium file:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
	return <textarea className={cn(control, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
	return <select className={cn(control, "h-9 py-1 pr-8", className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
	return (
		<input
			type="checkbox"
			className={cn("size-4 rounded border-input accent-primary", className)}
			{...props}
		/>
	);
}

export function Label({ className, ...props }: ComponentProps<"label">) {
	// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed by the caller
	return <label className={cn("font-medium text-sm leading-none", className)} {...props} />;
}

/** A labelled form control with an optional hint or error underneath. */
export function Field({
	label,
	hint,
	error,
	htmlFor,
	className,
	children,
}: {
	label: ReactNode;
	hint?: ReactNode;
	error?: ReactNode;
	htmlFor?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn("grid gap-2", className)}>
			<Label htmlFor={htmlFor}>{label}</Label>
			{children}
			{error ? (
				<p className="text-destructive text-xs">{error}</p>
			) : hint ? (
				<p className="text-muted-foreground text-xs">{hint}</p>
			) : null}
		</div>
	);
}
