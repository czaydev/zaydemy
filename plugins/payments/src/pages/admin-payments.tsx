import { type PluginPageProps, runtime } from "@zaydemy/core";
import { desc, eq } from "drizzle-orm";
import { firstParam } from "../http";
import { formatMoney } from "../money";
import { type PaymentStatus, paymentStatus, payments } from "../schema";
import { paymentsWithPayer } from "../service";

/** Admin list of payments, filterable by status, newest first. */
export default async function AdminPaymentsPage({ searchParams, locale, t }: PluginPageProps) {
	const requested = firstParam(searchParams.status);
	const status = paymentStatus.enumValues.find((s) => s === requested) as PaymentStatus | undefined;
	const query = paymentsWithPayer(runtime().db);
	if (status) query.where(eq(payments.status, status));
	const rows = await query.orderBy(desc(payments.createdAt)).limit(200);

	return (
		<main>
			<h1>{t("payments.admin.title")}</h1>
			<nav>
				<a href="/admin/payments">{t("payments.admin.all")}</a>
				{paymentStatus.enumValues.map((s) => (
					<a key={s} href={`/admin/payments?status=${s}`}>
						{" "}
						{t(`payments.status.${s}`)}
					</a>
				))}
				{" · "}
				<a href="/admin/payments/new">{t("payments.admin.create")}</a>
			</nav>
			<table>
				<thead>
					<tr>
						<th>{t("payments.reference")}</th>
						<th>{t("payments.payer")}</th>
						<th>{t("payments.application")}</th>
						<th>{t("payments.amount")}</th>
						<th>{t("payments.title")}</th>
						<th>{t("payments.method")}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ payment, payer, applicationReference }) => (
						<tr key={payment.id}>
							<td>
								<a href={`/admin/payments/${payment.reference}`}>{payment.reference}</a>
							</td>
							<td>{payer.name}</td>
							<td>{applicationReference ?? "-"}</td>
							<td>{formatMoney(payment.amount, payment.currency, locale)}</td>
							<td>{t(`payments.status.${payment.status}`)}</td>
							<td>{payment.method ?? "-"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</main>
	);
}
