import type { TransactionContext, Zaydemy } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { and, eq, inArray } from "drizzle-orm";
import { PAYMENT_METHODS, type PaymentMethod } from "./method";
import { createReference } from "./reference";
import { type Payment, type PaymentStatus, payments } from "./schema";

declare module "@zaydemy/core" {
	interface CoreEvents {
		"payment.created": PaymentEvent;
		"payment.paid": PaymentEvent;
		"payment.reported": PaymentEvent;
		"payment.refunded": PaymentEvent;
	}
}

export type PaymentEvent = {
	paymentId: string;
	reference: string;
	userId: string;
	applicationId: string | null;
};

export class PaymentError extends Error {
	override name = "PaymentError";
	constructor(readonly code: "not_found" | "invalid_status" | "no_refund_method") {
		super(code);
	}
}

type Db = Zaydemy["db"];

const eventPayload = (p: Payment): PaymentEvent => ({
	paymentId: p.id,
	reference: p.reference,
	userId: p.userId,
	applicationId: p.applicationId,
});

export async function getPayment(db: Db, reference: string): Promise<Payment | null> {
	const [row] = await db.select().from(payments).where(eq(payments.reference, reference));
	return row ?? null;
}

/** Locks the payment row for the rest of the transaction and checks its status. */
async function lock(db: Db, paymentId: string, allowed: PaymentStatus[]): Promise<Payment> {
	const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).for("update");
	if (!row) throw new PaymentError("not_found");
	if (!allowed.includes(row.status)) throw new PaymentError("invalid_status");
	return row;
}

export function paymentMethods(app: Zaydemy): PaymentMethod[] {
	return app.config.contributions<PaymentMethod>(PAYMENT_METHODS);
}

/** Creates a payment that is not tied to a stage, e.g. a remaining tuition instalment. */
export async function createPayment(
	app: Zaydemy,
	input: {
		userId: string;
		applicationId?: string;
		amount: number;
		currency?: string;
		description?: string;
	},
): Promise<Payment> {
	return app.engine.transaction(async ({ db, emit }) => {
		const [row] = await db
			.insert(payments)
			.values({ ...input, reference: createReference() })
			.returning();
		const payment = row as Payment;
		emit("payment.created", eventPayload(payment));
		return payment;
	});
}

/**
 * Records a confirmed payment. A payment requested by a stage completes that
 * stage in the same transaction. Repeated calls (duplicate provider callbacks)
 * are ignored. Resolves to false when the payment was already paid.
 */
export async function markPaid(
	app: Zaydemy,
	payment: Payment,
	details: { method: string; providerPaymentId?: string; actorId?: string },
): Promise<boolean> {
	if (payment.status === "paid") return false;
	let changed = false;
	const effect = async ({ db, emit }: TransactionContext) => {
		const row = await lock(db, payment.id, ["pending", "review", "paid"]);
		if (row.status === "paid") return;
		await db
			.update(payments)
			.set({
				status: "paid",
				paidAt: new Date(),
				method: details.method,
				providerPaymentId: details.providerPaymentId ?? row.providerPaymentId,
				failureCode: null,
			})
			.where(eq(payments.id, row.id));
		emit("payment.paid", eventPayload(row));
		changed = true;
	};
	if (payment.stage && payment.applicationId) {
		await app.engine.complete(payment.applicationId, payment.stage, {
			ifCurrent: true,
			actorId: details.actorId,
			effect,
		});
	} else {
		await app.engine.transaction(effect);
	}
	return changed;
}

/** Stores a failed attempt so the payer sees why; the payment stays open for another try. */
export async function recordFailure(app: Zaydemy, payment: Payment, failureCode: string) {
	await app.db
		.update(payments)
		.set({ failureCode })
		.where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
}

/** The payer says they paid offline (bank transfer); staff confirm it later. */
export async function reportPayment(app: Zaydemy, payment: Payment, method: string) {
	await app.engine.transaction(async ({ db, emit }) => {
		const row = await lock(db, payment.id, ["pending"]);
		await db
			.update(payments)
			.set({ status: "review", method, failureCode: null })
			.where(eq(payments.id, row.id));
		emit("payment.reported", eventPayload(row));
	});
}

/** Staff could not find a reported payment; the payer can pay again. */
export async function declineReport(app: Zaydemy, payment: Payment) {
	await app.engine.transaction(async ({ db }) => {
		const row = await lock(db, payment.id, ["review"]);
		await db
			.update(payments)
			.set({ status: "pending", failureCode: "payment_not_received" })
			.where(eq(payments.id, row.id));
	});
}

/** Refunds through the payment method when it can, then records the refund. */
export async function refundPayment(app: Zaydemy, payment: Payment) {
	if (payment.status !== "paid" && payment.status !== "refund_pending") {
		throw new PaymentError("invalid_status");
	}
	const method = paymentMethods(app).find((m) => m.id === payment.method);
	await method?.refund?.(payment);
	await app.engine.transaction(async ({ db, emit }) => {
		const row = await lock(db, payment.id, ["paid", "refund_pending"]);
		await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, row.id));
		emit("payment.refunded", eventPayload(row));
	});
}

export async function cancelPayment(app: Zaydemy, payment: Payment) {
	await app.engine.transaction(async ({ db }) => {
		const row = await lock(db, payment.id, ["pending", "review"]);
		await db.update(payments).set({ status: "canceled" }).where(eq(payments.id, row.id));
	});
}

/**
 * When an application closes, open payments are canceled and paid ones are
 * flagged for refund. Runs inside the rejection's transaction.
 */
export async function closeApplicationPayments(db: Db, applicationId: string) {
	await db
		.update(payments)
		.set({ status: "canceled" })
		.where(
			and(
				eq(payments.applicationId, applicationId),
				inArray(payments.status, ["pending", "review"]),
			),
		);
	await db
		.update(payments)
		.set({ status: "refund_pending" })
		.where(and(eq(payments.applicationId, applicationId), eq(payments.status, "paid")));
}

/** Payments with their payer and application, for admin lists. */
export function paymentsWithPayer(db: Db) {
	return db
		.select({
			payment: payments,
			payer: { name: schema.users.name, email: schema.users.email },
			applicationReference: schema.applications.reference,
		})
		.from(payments)
		.innerJoin(schema.users, eq(schema.users.id, payments.userId))
		.leftJoin(schema.applications, eq(schema.applications.id, payments.applicationId))
		.$dynamic();
}
