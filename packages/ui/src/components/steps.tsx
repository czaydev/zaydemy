import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../cn";

export type StepState = "done" | "current" | "upcoming" | "skipped" | "failed";

export interface Step {
	id: string;
	label: ReactNode;
	state: StepState;
}

const dot: Record<StepState, string> = {
	done: "border-primary bg-primary text-primary-foreground",
	current: "border-primary bg-card text-primary ring-4 ring-primary/15",
	upcoming: "border-border bg-card text-muted-foreground",
	skipped: "border-border bg-muted text-muted-foreground",
	failed: "border-destructive bg-destructive text-white",
};

/** Horizontal progress through an application's stages. */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
	return (
		<ol className={cn("flex w-full items-start", className)}>
			{steps.map((step, index) => (
				<li key={step.id} className="relative flex flex-1 flex-col items-center gap-2 text-center">
					{index > 0 ? (
						<span
							aria-hidden
							className={cn(
								"absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2",
								step.state === "upcoming" ? "bg-border" : "bg-primary",
							)}
						/>
					) : null}
					<span
						className={cn(
							"relative z-10 flex size-7 items-center justify-center rounded-full border-2 font-semibold text-xs [&_svg]:size-3.5",
							dot[step.state],
						)}
					>
						{step.state === "done" ? (
							<Check strokeWidth={3} />
						) : step.state === "skipped" ? (
							<Minus />
						) : step.state === "failed" ? (
							<X strokeWidth={3} />
						) : (
							index + 1
						)}
					</span>
					<span
						className={cn(
							"px-1 text-xs leading-tight",
							step.state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
							step.state === "skipped" && "line-through",
						)}
					>
						{step.label}
					</span>
				</li>
			))}
		</ol>
	);
}
