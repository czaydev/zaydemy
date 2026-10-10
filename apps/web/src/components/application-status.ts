import type { BadgeVariant } from "@zaydemy/ui";

/** Badge colour for each application status. */
export const applicationStatusVariant: Record<string, BadgeVariant> = {
	in_progress: "default",
	enrolled: "success",
	rejected: "destructive",
	withdrawn: "secondary",
};
