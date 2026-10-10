import { id, schema, timestamps } from "@zaydemy/db";
import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

export const paymentStatus = pgEnum("payment_status", [
	/** Waiting for the payer. A failed card attempt stays pending with `failureCode`. */
	"pending",
	/** The payer reported an offline payment (bank transfer); staff must confirm it. */
	"review",
	"paid",
	/** Paid, but the application closed; the money should go back. */
	"refund_pending",
	"refunded",
	"canceled",
]);

export const payments = pgTable(
	"payments",
	{
		id: id(),
		/** Public, alphanumeric reference; also the order id sent to payment providers. */
		reference: text("reference").notNull().unique(),
		applicationId: text("application_id").references(() => schema.applications.id, {
			onDelete: "cascade",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => schema.users.id, { onDelete: "cascade" }),
		/** Pipeline stage that asked for the payment; paying completes it. Null for ad-hoc payments. */
		stage: text("stage"),
		/** In minor units (kuruş, cents). */
		amount: integer("amount").notNull(),
		currency: text("currency").notNull().default("TRY"),
		description: text("description"),
		status: paymentStatus("status").notNull().default("pending"),
		/** Id of the payment method used, e.g. `card` or `bank_transfer`. */
		method: text("method"),
		/** The provider's own id for the payment, needed for refunds. */
		providerPaymentId: text("provider_payment_id"),
		/** Last provider error code, shown to the payer. */
		failureCode: text("failure_code"),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
		...timestamps,
	},
	(t) => [
		unique("payments_application_stage_unique").on(t.applicationId, t.stage),
		index("payments_user_idx").on(t.userId),
		index("payments_status_idx").on(t.status),
	],
);

export type Payment = typeof payments.$inferSelect;
export type PaymentStatus = Payment["status"];
