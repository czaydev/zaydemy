import { type PluginPageProps, runtime } from "@zaydemy/core";
import type { ComponentType } from "react";
import { firstParam } from "../http";
import type { CheckoutProps } from "../method";
import { formatMoney } from "../money";
import { getPayment, paymentMethods } from "../service";

/** The applicant's page for one payment: amount, status and the enabled ways to pay. */
export default async function CheckoutPage({
	params,
	searchParams,
	session,
	locale,
	t,
}: PluginPageProps) {
	const app = runtime();
	const payment = await getPayment(app.db, params.reference ?? "");
	if (!session || !payment || payment.userId !== session.user.id) {
		return <p>{t("common.notFound")}</p>;
	}

	const result = firstParam(searchParams.result);
	const error = payment.status === "pending" ? payment.failureCode : null;
	const methods = paymentMethods(app);

	return (
		<main>
			<h1>{payment.description ?? t(`payments.stages.${payment.stage}`)}</h1>
			<dl>
				<dt>{t("payments.reference")}</dt>
				<dd>{payment.reference}</dd>
				<dt>{t("payments.amount")}</dt>
				<dd>{formatMoney(payment.amount, payment.currency, locale)}</dd>
				<dt>{t("payments.title")}</dt>
				<dd>{t(`payments.status.${payment.status}`)}</dd>
			</dl>
			{result === "paid" || result === "reported" ? (
				<p role="status">{t(`payments.result.${result}`)}</p>
			) : null}
			{error ? <p role="alert">{t(`payments.errors.${error}`)}</p> : null}
			{payment.status === "pending" ? (
				methods.length === 0 ? (
					<p>{t("payments.noMethods")}</p>
				) : (
					<section>
						<h2>{t("payments.payWith")}</h2>
						{methods.map((method) => {
							const Checkout = method.Checkout as ComponentType<CheckoutProps>;
							return (
								<section key={method.id}>
									<h3>{t(method.label)}</h3>
									<Checkout
										payment={payment}
										session={session}
										searchParams={searchParams}
										locale={locale}
										t={t}
									/>
								</section>
							);
						})}
					</section>
				)
			) : null}
		</main>
	);
}
