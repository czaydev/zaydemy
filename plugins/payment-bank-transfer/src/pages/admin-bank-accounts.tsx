import { type PluginPageProps, runtime } from "@zaydemy/core";
import { asc } from "drizzle-orm";
import { formatIban } from "../iban";
import { bankAccounts } from "../schema";

/** Bank accounts with a form to add one and a switch to hide one from payers. */
export default async function AdminBankAccountsPage({ searchParams, t }: PluginPageProps) {
	const rows = await runtime()
		.db.select()
		.from(bankAccounts)
		.orderBy(asc(bankAccounts.sortOrder), asc(bankAccounts.bankName));

	return (
		<main>
			<h1>{t("bankTransfer.nav")}</h1>
			<table>
				<thead>
					<tr>
						<th>{t("bankTransfer.bank")}</th>
						<th>{t("bankTransfer.holder")}</th>
						<th>{t("bankTransfer.iban")}</th>
						<th>{t("bankTransfer.currency")}</th>
						<th>{t("bankTransfer.active")}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((account) => (
						<tr key={account.id}>
							<td>{account.bankName}</td>
							<td>{account.accountHolder}</td>
							<td>{formatIban(account.iban)}</td>
							<td>{account.currency}</td>
							<td>
								<form method="post" action={`/api/admin/bank-accounts/${account.id}/toggle`}>
									<button type="submit">
										{t(account.isActive ? "bankTransfer.deactivate" : "bankTransfer.activate")}
									</button>
								</form>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<h2>{t("bankTransfer.add")}</h2>
			{searchParams.error ? <p role="alert">{t("bankTransfer.invalidIban")}</p> : null}
			<form method="post" action="/api/admin/bank-accounts">
				<label>
					{t("bankTransfer.bank")}
					<input name="bankName" required />
				</label>
				<label>
					{t("bankTransfer.branch")}
					<input name="branch" />
				</label>
				<label>
					{t("bankTransfer.holder")}
					<input name="accountHolder" required />
				</label>
				<label>
					{t("bankTransfer.iban")}
					<input name="iban" required />
				</label>
				<label>
					{t("bankTransfer.currency")}
					<input name="currency" defaultValue="TRY" maxLength={3} required />
				</label>
				<label>
					{t("bankTransfer.swift")}
					<input name="swiftCode" />
				</label>
				<button type="submit">{t("bankTransfer.add")}</button>
			</form>
		</main>
	);
}
