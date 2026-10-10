import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Alert,
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	EmptyState,
	Icon,
} from "@zaydemy/ui";
import type { ComponentType } from "react";
import { firstParam } from "../http";
import type { CheckoutProps } from "../method";
import { formatMoney } from "../money";
import { getPayment, paymentMethods } from "../service";
import { paymentStatusVariant } from "../status";

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
		return <EmptyState icon={<Icon name="wallet" />} title={t("common.notFound")} />;
	}

	const result = firstParam(searchParams.result);
	const error = payment.status === "pending" ? payment.failureCode : null;
	const methods = paymentMethods(app);

	return (
		<main className="grid gap-6">
			<div>
				<a href="/payments" className="text-muted-foreground text-sm hover:text-foreground">
					← {t("payments.myPayments")}
				</a>
			</div>
			<Card>
				<CardContent className="flex flex-wrap items-center justify-between gap-4">
					<div className="grid gap-1">
						<p className="text-muted-foreground text-sm">
							{payment.description ?? t(`payments.stages.${payment.stage}`)}
						</p>
						<p className="font-semibold text-3xl tabular-nums tracking-tight">
							{formatMoney(payment.amount, payment.currency, locale)}
						</p>
						<p className="text-muted-foreground text-xs">
							{t("payments.reference")}: <span className="font-mono">{payment.reference}</span>
						</p>
					</div>
					<Badge variant={paymentStatusVariant[payment.status]} className="px-3 py-1 text-sm">
						{t(`payments.status.${payment.status}`)}
					</Badge>
				</CardContent>
			</Card>
			{result === "paid" || result === "reported" ? (
				<Alert variant="success">{t(`payments.result.${result}`)}</Alert>
			) : null}
			{error ? <Alert variant="destructive">{t(`payments.errors.${error}`)}</Alert> : null}
			{payment.status === "pending" ? (
				methods.length === 0 ? (
					<Alert variant="warning">{t("payments.noMethods")}</Alert>
				) : (
					<section className="grid gap-4">
						<h2 className="font-semibold text-lg">{t("payments.payWith")}</h2>
						{methods.map((method) => {
							const Checkout = method.Checkout as ComponentType<CheckoutProps>;
							return (
								<Card key={method.id}>
									<CardHeader>
										<CardTitle>{t(method.label)}</CardTitle>
									</CardHeader>
									<CardContent>
										<Checkout
											payment={payment}
											session={session}
											searchParams={searchParams}
											locale={locale}
											t={t}
										/>
									</CardContent>
								</Card>
							);
						})}
					</section>
				)
			) : null}
		</main>
	);
}
