import { definePlugin, type PluginSession, runtime } from "@zaydemy/core";
import {
	getPayment,
	markPaid,
	PAYMENT_METHODS,
	type Payment,
	type PaymentMethod,
	recordFailure,
	seeOther,
	toDecimal,
} from "@zaydemy/plugin-payments";
import {
	type Address,
	type BetterPayment,
	type Buyer,
	type CheckoutFormRetrieveResponse,
	type Iyzico,
	PaymentErrorCode,
	type PaymentResponse,
	PaymentStatus,
	PayTR,
	type ThreeDSInitResponse,
} from "better-payment";
import { cardCheckout } from "./checkout";
import messages from "./messages";

const METHOD = "card";

export interface CardPaymentsOptions {
	/** A better-payment instance, e.g. `betterPayment({ providers: { iyzico: iyzico({…}) } })`. */
	gateway: BetterPayment;
	/** Key of the provider in `gateway` that takes card payments. */
	provider: string;
	/**
	 * iyzico only: send payers to iyzico's hosted checkout form, so card numbers
	 * never touch this server. Default: true for iyzico.
	 */
	hostedCheckout?: boolean;
	/** Instalment counts offered to payers. Default: single payment only. */
	installments?: number[];
	/**
	 * Billing details providers require but the system does not collect.
	 * Set your institution's address; `identityNumber` is the placeholder
	 * iyzico accepts when no national id is collected.
	 */
	billing?: Partial<Address> & { identityNumber?: string };
}

type Gateway = ReturnType<BetterPayment["use"]>;

function isIyzico(provider: Gateway): provider is Gateway & Iyzico {
	return typeof (provider as Partial<Iyzico>).initCheckoutForm === "function";
}

function clientIp(request: Request): string {
	return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

/** Card payments through better-payment (iyzico, PayTR, Parampos, Akbank, Kuveyt Türk). */
export function cardPayments(options: CardPaymentsOptions) {
	const { gateway, provider: providerId, installments = [1] } = options;
	const provider = () => gateway.use(providerId);
	const hosted = options.hostedCheckout ?? isIyzico(gateway.use(providerId));
	// PayTR reports results only to the notification URL set in its panel.
	const notificationOnly = gateway.rawProvider(providerId) instanceof PayTR;

	function buyerAndAddresses(session: PluginSession, ip: string) {
		const billing = options.billing ?? {};
		const [first, ...rest] = session.user.name.trim().split(/\s+/);
		const address: Address = {
			contactName: session.user.name,
			address: billing.address ?? "N/A",
			city: billing.city ?? "Istanbul",
			country: billing.country ?? "Turkey",
			zipCode: billing.zipCode,
		};
		const buyer: Buyer = {
			id: session.user.id,
			name: first ?? session.user.name,
			surname: rest.join(" ") || (first ?? session.user.name),
			email: session.user.email,
			identityNumber: billing.identityNumber ?? "11111111111",
			gsmNumber: session.user.phoneNumber ?? "+905000000000",
			registrationAddress: address.address,
			city: address.city,
			country: address.country,
			zipCode: address.zipCode,
			ip,
		};
		return { buyer, shippingAddress: address, billingAddress: address };
	}

	function order(payment: Payment, session: PluginSession, ip: string) {
		const price = toDecimal(payment.amount);
		return {
			price,
			paidPrice: price,
			currency: payment.currency,
			basketId: payment.reference,
			conversationId: payment.reference,
			...buyerAndAddresses(session, ip),
			basketItems: [
				{
					id: payment.reference,
					name: payment.description ?? payment.stage ?? "payment",
					category1: "education",
					itemType: "VIRTUAL",
					price,
				},
			],
		};
	}

	/** Applies a verified provider result to the payment and says where the payer goes next. */
	async function settle(
		payment: Payment,
		result: PaymentResponse | CheckoutFormRetrieveResponse,
	): Promise<"paid" | "failed"> {
		const app = runtime();
		const matches =
			result.conversationId === payment.reference || result.paymentId === payment.reference;
		if (result.status === PaymentStatus.SUCCESS && matches) {
			await markPaid(app, payment, { method: METHOD, providerPaymentId: result.paymentId });
			return "paid";
		}
		// A forged or mismatched callback must not touch the payment at all.
		if (!matches || result.code === PaymentErrorCode.INVALID_HASH) return "failed";
		const code =
			result.status === PaymentStatus.PENDING ? "NETWORK_ERROR" : (result.code ?? "UNKNOWN");
		await recordFailure(app, payment, code);
		return "failed";
	}

	// Nothing is charged when starting a payment fails, so an unknown outcome is just a failure.
	const initFailure = (code: string | undefined) =>
		!code || code === PaymentErrorCode.NETWORK_ERROR ? "UNKNOWN" : code;

	const backTo = (payment: Payment, outcome: "paid" | "failed") =>
		seeOther(`/payments/${payment.reference}${outcome === "paid" ? "?result=paid" : ""}`);

	const method: PaymentMethod = {
		id: METHOD,
		label: "paymentCard.label",
		Checkout: cardCheckout({ hosted, installments }),
		async refund(payment) {
			if (!payment.providerPaymentId) throw new Error("Payment has no provider id to refund.");
			const result = await provider().refund({
				paymentId: payment.providerPaymentId,
				price: toDecimal(payment.amount),
				currency: payment.currency,
				ip: "127.0.0.1",
			});
			if (result.status !== PaymentStatus.SUCCESS) {
				throw new Error(`Refund failed: ${result.errorCode ?? result.code ?? result.status}`);
			}
		},
	};

	return definePlugin({
		id: "payment-card",
		name: "Card payments",
		version: "0.1.0",
		dependsOn: ["payments"],
		messages,
		contributes: { [PAYMENT_METHODS]: [method] },
		api: [
			{
				method: "POST",
				path: "/payments/[reference]/card",
				signedIn: true,
				async handler(request, { params, session }) {
					const app = runtime();
					const user = await session();
					const payment = await getPayment(app.db, params.reference ?? "");
					if (!user || !payment || payment.userId !== user.user.id) {
						return Response.json({ error: "not_found" }, { status: 404 });
					}
					if (payment.status !== "pending") return seeOther(`/payments/${payment.reference}`);

					const base = order(payment, user, clientIp(request));
					const callbackUrl = notificationOnly
						? `${app.baseUrl}/payments/${payment.reference}`
						: `${app.baseUrl}/api/payments/${payment.reference}/card/callback`;
					const gatewayProvider = provider();

					if (hosted && isIyzico(gatewayProvider)) {
						const init = await gatewayProvider.initCheckoutForm({
							...base,
							callbackUrl,
							enabledInstallments: installments,
						});
						if (init.status === PaymentStatus.PENDING && init.paymentPageUrl) {
							return seeOther(init.paymentPageUrl);
						}
						await recordFailure(app, payment, initFailure(init.code));
						return backTo(payment, "failed");
					}

					const form = await request.formData();
					const field = (name: string) => String(form.get(name) ?? "").trim();
					const installment = Number(field("installment") || 1);
					const init: ThreeDSInitResponse = await gatewayProvider.initThreeDSPayment({
						...base,
						callbackUrl,
						installment: installments.includes(installment) ? installment : 1,
						paymentCard: {
							cardHolderName: field("cardHolderName"),
							cardNumber: field("cardNumber").replace(/\s/g, ""),
							expireMonth: field("expireMonth").padStart(2, "0"),
							expireYear: field("expireYear"),
							cvc: field("cvc"),
						},
					});
					if (init.status === PaymentStatus.SUCCESS) {
						return backTo(
							payment,
							await settle(payment, { ...init, conversationId: payment.reference }),
						);
					}
					if (init.status === PaymentStatus.PENDING && init.threeDSHtmlContent) {
						return new Response(init.threeDSHtmlContent, {
							headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
						});
					}
					if (init.status === PaymentStatus.PENDING && init.redirectUrl) {
						return seeOther(init.redirectUrl);
					}
					await recordFailure(app, payment, initFailure(init.code));
					return backTo(payment, "failed");
				},
			},
			{
				// The bank posts the 3D Secure result here; better-payment verifies it.
				method: "POST",
				path: "/payments/[reference]/card/callback",
				async handler(request, { params }) {
					const app = runtime();
					const payment = await getPayment(app.db, params.reference ?? "");
					if (!payment) return Response.json({ error: "not_found" }, { status: 404 });
					const body = Object.fromEntries(
						[...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]),
					);
					const gatewayProvider = provider();
					const result =
						hosted && isIyzico(gatewayProvider)
							? await gatewayProvider.retrieveCheckoutForm(body.token ?? "", payment.reference)
							: await gatewayProvider.completeThreeDSPayment(body);
					return backTo(payment, await settle(payment, result));
				},
			},
			{
				// PayTR's server-to-server notification; set this URL in the PayTR panel.
				method: "POST",
				path: "/payments/card/notify",
				async handler(request) {
					const app = runtime();
					const body = Object.fromEntries(
						[...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]),
					);
					const result = await provider().completeThreeDSPayment(body);
					const payment = result.paymentId ? await getPayment(app.db, result.paymentId) : null;
					if (payment) await settle(payment, result);
					return new Response("OK", { headers: { "Content-Type": "text/plain" } });
				},
			},
		],
	});
}
