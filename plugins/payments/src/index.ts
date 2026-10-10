import { definePlugin, type PluginApiRoute, runtime } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { eq } from "drizzle-orm";
import { seeOther } from "./http";
import messages from "./messages";
import { parseAmount } from "./money";
import { paymentStatus, payments } from "./schema";
import {
	cancelPayment,
	closeApplicationPayments,
	createPayment,
	declineReport,
	getPayment,
	markPaid,
	PaymentError,
	refundPayment,
} from "./service";
import { paymentStage } from "./stage";

const MANAGE = "payments.manage";

export interface PaymentsOptions {
	/** Payment stages to offer to pipelines. Default: `prepayment` and `tuition`. */
	stages?: string[];
	/** Currency for payments created by staff. Default: TRY. */
	currency?: string;
}

const adminActions: Record<
	string,
	(
		app: ReturnType<typeof runtime>,
		payment: NonNullable<Awaited<ReturnType<typeof getPayment>>>,
		actorId: string,
	) => Promise<unknown>
> = {
	approve: (app, payment, actorId) =>
		markPaid(app, payment, { method: payment.method ?? "manual", actorId }),
	decline: (app, payment) => declineReport(app, payment),
	refund: (app, payment) => refundPayment(app, payment),
	cancel: (app, payment) => cancelPayment(app, payment),
};

const api = (currency: string): PluginApiRoute[] => [
	{
		method: "POST",
		path: "/admin/payments/[reference]/[action]",
		permission: MANAGE,
		async handler(_request, { params, session }) {
			const app = runtime();
			const action = adminActions[params.action ?? ""];
			const payment = await getPayment(app.db, params.reference ?? "");
			if (!action || !payment) return Response.json({ error: "not_found" }, { status: 404 });
			const actor = await session();
			try {
				await action(app, payment, actor?.user.id ?? "");
			} catch (error) {
				if (error instanceof PaymentError) {
					return Response.json({ error: error.code }, { status: 409 });
				}
				throw error;
			}
			return seeOther(`/admin/payments/${payment.reference}`);
		},
	},
	{
		method: "POST",
		path: "/admin/payments",
		permission: MANAGE,
		async handler(request) {
			const app = runtime();
			const form = await request.formData();
			const amount = parseAmount(String(form.get("amount") ?? ""));
			const [application] = await app.db
				.select({ id: schema.applications.id, userId: schema.applications.userId })
				.from(schema.applications)
				.where(eq(schema.applications.reference, String(form.get("applicationReference") ?? "")));
			if (!application || !amount) return seeOther("/admin/payments/new?error=invalid");
			const description = String(form.get("description") ?? "").trim() || undefined;
			const payment = await createPayment(app, {
				userId: application.userId,
				applicationId: application.id,
				amount,
				currency,
				description,
			});
			return seeOther(`/admin/payments/${payment.reference}`);
		},
	},
];

/**
 * Payments shared by every payment stage and method: the payments table,
 * payment stages, the applicant's checkout page and the admin screens.
 * Methods (card, bank transfer…) come from their own plugins.
 */
export function paymentsPlugin({
	stages = ["prepayment", "tuition"],
	currency = "TRY",
}: PaymentsOptions = {}) {
	return definePlugin({
		id: "payments",
		name: "Payments",
		version: "0.1.0",
		stages: stages.map((id) => paymentStage({ id })),
		schema: { payments, paymentStatus },
		permissions: [{ key: MANAGE, name: "Manage payments" }],
		adminNav: [
			{ label: "payments.nav", href: "/admin/payments", icon: "wallet", permission: MANAGE },
		],
		messages,
		pages: [
			{ area: "app", path: "/payments", signedIn: true, load: () => import("./pages/my-payments") },
			{
				area: "app",
				path: "/payments/[reference]",
				signedIn: true,
				load: () => import("./pages/checkout"),
			},
			{
				area: "admin",
				path: "/payments",
				permission: MANAGE,
				load: () => import("./pages/admin-payments"),
			},
			{
				area: "admin",
				path: "/payments/new",
				permission: MANAGE,
				load: () => import("./pages/admin-new-payment"),
			},
			{
				area: "admin",
				path: "/payments/[reference]",
				permission: MANAGE,
				load: () => import("./pages/admin-payment"),
			},
		],
		api: api(currency),
		setup({ hooks }) {
			const close = async ({ applicationId }: { applicationId: string }, db: unknown) =>
				closeApplicationPayments(
					db as Parameters<typeof closeApplicationPayments>[0],
					applicationId,
				);
			hooks.on("application.rejected", close);
			hooks.on("application.withdrawn", close);
		},
	});
}

export { seeOther } from "./http";
export * from "./method";
export * from "./money";
export * from "./schema";
export {
	createPayment,
	getPayment,
	markPaid,
	PaymentError,
	type PaymentEvent,
	paymentMethods,
	recordFailure,
	refundPayment,
	reportPayment,
} from "./service";
export { paymentStage } from "./stage";
