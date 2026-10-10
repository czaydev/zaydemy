import { type PluginPageProps, runtime } from "@zaydemy/core";
import { eq } from "drizzle-orm";
import { formatMoney } from "../money";
import { payments } from "../schema";
import { paymentsWithPayer } from "../service";

/** One payment with the actions its status allows. */
export default async function AdminPaymentPage({ params, locale, t }: PluginPageProps) {
	const [row] = await paymentsWithPayer(runtime().db).where(
		eq(payments.reference, params.reference ?? ""),
	);
	if (!row) return <p>{t("common.notFound")}</p>;
	const { payment, payer, applicationReference } = row;

	const actions: string[] = [];
	if (payment.status === "pending" || payment.status === "review") actions.push("approve");
	if (payment.status === "review") actions.push("decline");
	if (payment.status === "paid" || payment.status === "refund_pending") actions.push("refund");
	if (payment.status === "pending" || payment.status === "review") actions.push("cancel");

	return (
		<main>
			<h1>{payment.reference}</h1>
			<dl>
				<dt>{t("payments.payer")}</dt>
				<dd>
					{payer.name} ({payer.email})
				</dd>
				<dt>{t("payments.application")}</dt>
				<dd>{applicationReference ?? "-"}</dd>
				<dt>{t("payments.amount")}</dt>
				<dd>{formatMoney(payment.amount, payment.currency, locale)}</dd>
				<dt>{t("payments.title")}</dt>
				<dd>{t(`payments.status.${payment.status}`)}</dd>
				<dt>{t("payments.method")}</dt>
				<dd>{payment.method ?? "-"}</dd>
				<dt>{t("payments.date")}</dt>
				<dd>{(payment.paidAt ?? payment.createdAt).toLocaleString(locale)}</dd>
			</dl>
			{actions.map((action) => (
				<form
					key={action}
					method="post"
					action={`/api/admin/payments/${payment.reference}/${action}`}
				>
					<button type="submit">{t(`payments.admin.${action}`)}</button>
				</form>
			))}
		</main>
	);
}
