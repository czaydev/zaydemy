import { schema } from "@zaydemy/db";
import { bankAccounts, bankTransferPlugin } from "@zaydemy/plugin-payment-bank-transfer";
import { cardPayments } from "@zaydemy/plugin-payment-card";
import { markPaid, payments, paymentsPlugin } from "@zaydemy/plugin-payments";
import { decideInterview, interviewPlugin, interviews } from "@zaydemy/plugin-stage-interview";
import { betterPayment } from "better-payment";
import { MOCK_CARDS, MockProvider } from "better-payment/testing";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apply, callApi, seed, setup, testUrl } from "./helpers";

describe.skipIf(!testUrl)("payments on Postgres", () => {
	const mock = new MockProvider();
	const t = setup({
		plugins: [
			interviewPlugin,
			paymentsPlugin(),
			bankTransferPlugin,
			cardPayments({ gateway: betterPayment({ providers: { mock } }), provider: "mock" }),
		],
		pipelines: { default: ["prepayment", "interview"] },
	});
	const { app, db, config } = t;
	let ctx: Awaited<ReturnType<typeof seed>>;
	const events: string[] = [];
	config.events.on("payment.paid", () => void events.push("payment.paid"));

	beforeAll(async () => {
		ctx = await seed(t, { prepayment: { amount: 150000 } });
	});
	beforeEach(() => {
		events.length = 0;
	});

	const start = () => apply(t, { userId: ctx.user.id, courseId: ctx.course.id });
	const application = async (id: string) =>
		(await db.select().from(schema.applications).where(eq(schema.applications.id, id)))[0];
	const paymentFor = async (applicationId: string) =>
		(await db.select().from(payments).where(eq(payments.applicationId, applicationId)))[0]!;
	const card = (cardNumber: string) => ({
		cardHolderName: "Ada Lovelace",
		cardNumber,
		expireMonth: "12",
		expireYear: "2030",
		cvc: "123",
	});

	it("asks for the prepayment, and a 3D Secure card payment moves on to the interview", async () => {
		const id = await start();
		expect(await application(id)).toMatchObject({ currentStage: "prepayment" });
		const payment = await paymentFor(id);
		expect(payment).toMatchObject({ status: "pending", amount: 150000, stage: "prepayment" });

		const init = await callApi(config, "POST", `/payments/${payment.reference}/card`, {
			form: card(MOCK_CARDS.THREEDS_REQUIRED),
			session: ctx.session,
		});
		expect(init.headers.get("content-type")).toContain("text/html");

		const record = mock.payments.find((p) => p.conversationId === payment.reference);
		const callback = await mock.threeDSCallback(record!.paymentId);
		const done = await callApi(config, "POST", `/payments/${payment.reference}/card/callback`, {
			form: callback,
		});
		expect(done.status).toBe(303);
		expect(done.headers.get("location")).toBe(`/payments/${payment.reference}?result=paid`);

		expect(await paymentFor(id)).toMatchObject({ status: "paid", method: "card" });
		expect(await application(id)).toMatchObject({ currentStage: "interview" });
		const [interview] = await db.select().from(interviews).where(eq(interviews.applicationId, id));
		expect(interview?.status).toBe("pending");
		expect(events).toEqual(["payment.paid"]);

		// The bank may post the same result twice; nothing changes the second time.
		await callApi(config, "POST", `/payments/${payment.reference}/card/callback`, {
			form: callback,
		});
		expect(await application(id)).toMatchObject({ currentStage: "interview" });
		expect(events).toEqual(["payment.paid"]);
	});

	it("keeps the payment open with the reason when the card is declined", async () => {
		const id = await start();
		const payment = await paymentFor(id);
		await callApi(config, "POST", `/payments/${payment.reference}/card`, {
			form: card(MOCK_CARDS.INSUFFICIENT_FUNDS),
			session: ctx.session,
		});
		const record = mock.payments.find((p) => p.conversationId === payment.reference);
		const response = await callApi(config, "POST", `/payments/${payment.reference}/card/callback`, {
			form: await mock.threeDSCallback(record!.paymentId),
		});
		expect(response.headers.get("location")).toBe(`/payments/${payment.reference}`);
		expect(await paymentFor(id)).toMatchObject({
			status: "pending",
			failureCode: "INSUFFICIENT_FUNDS",
		});
		expect(await application(id)).toMatchObject({ currentStage: "prepayment" });
	});

	it("ignores a forged callback", async () => {
		const id = await start();
		const payment = await paymentFor(id);
		await callApi(config, "POST", `/payments/${payment.reference}/card/callback`, {
			form: { paymentId: "fake", status: "success", signature: "nope" },
		});
		expect(await paymentFor(id)).toMatchObject({ status: "pending", failureCode: null });
	});

	it("does not let another user pay or report someone else's payment", async () => {
		const id = await start();
		const payment = await paymentFor(id);
		const stranger = { ...ctx.session, user: { ...ctx.session.user, id: "someone-else" } };
		const response = await callApi(config, "POST", `/payments/${payment.reference}/bank-transfer`, {
			session: stranger,
		});
		expect(response.status).toBe(404);
	});

	it("takes a reported bank transfer to review, and staff approval completes the stage", async () => {
		await db
			.insert(bankAccounts)
			.values({
				bankName: "Test Bank",
				accountHolder: "Zaydemy",
				iban: "TR330006100519786457841326",
			})
			.onConflictDoNothing();
		const id = await start();
		const payment = await paymentFor(id);
		const response = await callApi(config, "POST", `/payments/${payment.reference}/bank-transfer`, {
			session: ctx.session,
		});
		expect(response.headers.get("location")).toBe(`/payments/${payment.reference}?result=reported`);
		expect(await paymentFor(id)).toMatchObject({ status: "review", method: "bank_transfer" });
		expect(await application(id)).toMatchObject({ currentStage: "prepayment" });

		await markPaid(app, await paymentFor(id), { method: "bank_transfer" });
		expect(await paymentFor(id)).toMatchObject({ status: "paid" });
		expect(await application(id)).toMatchObject({ currentStage: "interview" });
	});

	it("flags the prepayment for refund when the interview fails, in the same transaction", async () => {
		const id = await start();
		await markPaid(app, await paymentFor(id), { method: "bank_transfer" });
		await decideInterview(app, { applicationId: id, passed: false });
		expect(await application(id)).toMatchObject({ status: "rejected" });
		expect(await paymentFor(id)).toMatchObject({ status: "refund_pending" });
	});

	it("skips the prepayment for a course without an amount", async () => {
		const [free] = await db
			.insert(schema.courses)
			.values({ name: "Free", slug: "free", categoryId: ctx.course.categoryId })
			.returning();
		const id = await apply(t, { userId: ctx.user.id, courseId: free!.id });
		expect(await application(id)).toMatchObject({ currentStage: "interview" });
		expect(await db.select().from(payments).where(eq(payments.applicationId, id))).toEqual([]);
	});
});
