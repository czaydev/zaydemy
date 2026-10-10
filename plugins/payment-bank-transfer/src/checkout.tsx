import { runtime } from "@zaydemy/core";
import type { CheckoutProps } from "@zaydemy/plugin-payments";
import { Alert, Button, DetailList } from "@zaydemy/ui";
import { and, asc, eq } from "drizzle-orm";
import { formatIban } from "./iban";
import { bankAccounts } from "./schema";

/** Bank details for the payment's currency and a button to report the transfer. */
export async function BankTransferCheckout({ payment, t }: CheckoutProps) {
	const accounts = await runtime()
		.db.select()
		.from(bankAccounts)
		.where(and(eq(bankAccounts.isActive, true), eq(bankAccounts.currency, payment.currency)))
		.orderBy(asc(bankAccounts.sortOrder), asc(bankAccounts.bankName));
	if (accounts.length === 0) return <Alert variant="warning">{t("bankTransfer.none")}</Alert>;

	return (
		<div className="grid gap-4">
			<Alert>{t("bankTransfer.instructions", { reference: payment.reference })}</Alert>
			{accounts.map((account) => (
				<div key={account.id} className="rounded-lg border bg-muted/40 p-4">
					<DetailList
						items={[
							{
								label: t("bankTransfer.bank"),
								value: `${account.bankName}${account.branch ? ` / ${account.branch}` : ""}`,
							},
							{ label: t("bankTransfer.holder"), value: account.accountHolder },
							{
								label: t("bankTransfer.iban"),
								value: <span className="select-all font-mono">{formatIban(account.iban)}</span>,
							},
							...(account.swiftCode
								? [{ label: t("bankTransfer.swift"), value: account.swiftCode }]
								: []),
						]}
					/>
				</div>
			))}
			<form method="post" action={`/api/payments/${payment.reference}/bank-transfer`}>
				<Button type="submit" variant="outline">
					{t("bankTransfer.report")}
				</Button>
			</form>
		</div>
	);
}
