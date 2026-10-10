import { runtime } from "@zaydemy/core";
import type { CheckoutProps } from "@zaydemy/plugin-payments";
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
	if (accounts.length === 0) return <p>{t("bankTransfer.none")}</p>;

	return (
		<div>
			<p>{t("bankTransfer.instructions", { reference: payment.reference })}</p>
			{accounts.map((account) => (
				<dl key={account.id}>
					<dt>{t("bankTransfer.bank")}</dt>
					<dd>
						{account.bankName}
						{account.branch ? ` / ${account.branch}` : ""}
					</dd>
					<dt>{t("bankTransfer.holder")}</dt>
					<dd>{account.accountHolder}</dd>
					<dt>{t("bankTransfer.iban")}</dt>
					<dd>{formatIban(account.iban)}</dd>
					{account.swiftCode ? (
						<>
							<dt>{t("bankTransfer.swift")}</dt>
							<dd>{account.swiftCode}</dd>
						</>
					) : null}
				</dl>
			))}
			<form method="post" action={`/api/payments/${payment.reference}/bank-transfer`}>
				<button type="submit">{t("bankTransfer.report")}</button>
			</form>
		</div>
	);
}
