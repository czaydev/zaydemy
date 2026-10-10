import { defineStage } from "@zaydemy/core";
import { z } from "zod";
import { createReference } from "./reference";
import { payments } from "./schema";

const options = z.object({
	/** In minor units. Zero (the default) skips the stage, so free courses need no extra pipeline. */
	amount: z.number().int().nonnegative().default(0).meta({
		label: "payments.options.amount",
		hint: "payments.options.amountHint",
		format: "money",
	}),
	currency: z.string().length(3).default("TRY").meta({ label: "payments.options.currency" }),
});

/**
 * A pipeline stage that asks the applicant to pay. Use one per payment in the
 * flow, e.g. `paymentStage({ id: "prepayment" })` and `paymentStage({ id: "tuition" })`;
 * each course sets its amount in `stageOptions`.
 */
export function paymentStage({
	id,
	label = `payments.stages.${id}`,
}: {
	id: string;
	label?: string;
}) {
	return defineStage({
		id,
		label,
		options,
		applicantHref: "/payments",
		async onEnter({ db, emit, applicationId, userId, options }) {
			if (options.amount === 0) return "skip" as const;
			const reference = createReference();
			const [created] = await db
				.insert(payments)
				.values({
					reference,
					applicationId,
					userId,
					stage: id,
					amount: options.amount,
					currency: options.currency,
				})
				.onConflictDoNothing()
				.returning({ id: payments.id });
			if (created) {
				emit("payment.created", { paymentId: created.id, reference, userId, applicationId });
			}
			return "wait" as const;
		},
	});
}
