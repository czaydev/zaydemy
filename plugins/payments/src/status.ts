import type { BadgeVariant } from "@zaydemy/ui";
import type { PaymentStatus } from "./schema";

/** Badge colour for each payment status. */
export const paymentStatusVariant: Record<PaymentStatus, BadgeVariant> = {
	pending: "warning",
	review: "default",
	paid: "success",
	refund_pending: "warning",
	refunded: "secondary",
	canceled: "secondary",
};
