import { definePlugin, runtime } from "@zaydemy/core";
import {
	getPayment,
	PAYMENT_METHODS,
	type PaymentMethod,
	reportPayment,
	seeOther,
} from "@zaydemy/plugin-payments";
import { eq, not } from "drizzle-orm";
import { BankTransferCheckout } from "./checkout";
import { isValidIban, normalizeIban } from "./iban";
import messages from "./messages";
import { bankAccounts } from "./schema";

const METHOD = "bank_transfer";
const MANAGE = "bank-accounts.manage";

const method: PaymentMethod = {
	id: METHOD,
	label: "bankTransfer.label",
	Checkout: BankTransferCheckout,
};

/** Bank transfer: payers see the institution's accounts and report their transfer for staff to confirm. */
export const bankTransferPlugin = definePlugin({
	id: "payment-bank-transfer",
	name: "Bank transfer",
	version: "0.1.0",
	dependsOn: ["payments"],
	schema: { bankAccounts },
	permissions: [{ key: MANAGE, name: "Manage bank accounts" }],
	adminNav: [
		{
			label: "bankTransfer.nav",
			href: "/admin/bank-accounts",
			icon: "landmark",
			permission: MANAGE,
		},
	],
	messages,
	contributes: { [PAYMENT_METHODS]: [method] },
	pages: [
		{
			area: "admin",
			path: "/bank-accounts",
			permission: MANAGE,
			load: () => import("./pages/admin-bank-accounts"),
		},
	],
	api: [
		{
			method: "POST",
			path: "/payments/[reference]/bank-transfer",
			signedIn: true,
			async handler(_request, { params, session }) {
				const app = runtime();
				const user = await session();
				const payment = await getPayment(app.db, params.reference ?? "");
				if (!user || !payment || payment.userId !== user.user.id) {
					return Response.json({ error: "not_found" }, { status: 404 });
				}
				if (payment.status !== "pending") return seeOther(`/payments/${payment.reference}`);
				await reportPayment(app, payment, METHOD);
				return seeOther(`/payments/${payment.reference}?result=reported`);
			},
		},
		{
			method: "POST",
			path: "/admin/bank-accounts",
			permission: MANAGE,
			async handler(request) {
				const form = await request.formData();
				const field = (name: string) => String(form.get(name) ?? "").trim();
				const iban = normalizeIban(field("iban"));
				if (!isValidIban(iban) || !field("bankName") || !field("accountHolder")) {
					return seeOther("/admin/bank-accounts?error=invalid");
				}
				await runtime()
					.db.insert(bankAccounts)
					.values({
						bankName: field("bankName"),
						branch: field("branch") || null,
						accountHolder: field("accountHolder"),
						iban,
						currency: field("currency").toUpperCase() || "TRY",
						swiftCode: field("swiftCode") || null,
					})
					.onConflictDoNothing();
				return seeOther("/admin/bank-accounts");
			},
		},
		{
			method: "POST",
			path: "/admin/bank-accounts/[id]/toggle",
			permission: MANAGE,
			async handler(_request, { params }) {
				await runtime()
					.db.update(bankAccounts)
					.set({ isActive: not(bankAccounts.isActive) })
					.where(eq(bankAccounts.id, params.id ?? ""));
				return seeOther("/admin/bank-accounts");
			},
		},
	],
});

export { formatIban, isValidIban } from "./iban";
export { type BankAccount, bankAccounts } from "./schema";
