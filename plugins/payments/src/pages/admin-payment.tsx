import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Badge,
	Button,
	Card,
	CardContent,
	DetailList,
	EmptyState,
	Icon,
	PageHeader,
} from "@zaydemy/ui";
import { eq } from "drizzle-orm";
import { formatMoney } from "../money";
import { payments } from "../schema";
import { paymentsWithPayer } from "../service";
import { paymentStatusVariant } from "../status";

const actionVariant = {
	approve: "default",
	decline: "outline",
	refund: "outline",
	cancel: "destructive",
} as const;

/** One payment with the actions its status allows. */
export default async function AdminPaymentPage({ params, locale, t }: PluginPageProps) {
	const [row] = await paymentsWithPayer(runtime().db).where(
		eq(payments.reference, params.reference ?? ""),
	);
	if (!row) return <EmptyState icon={<Icon name="wallet" />} title={t("common.notFound")} />;
	const { payment, payer, applicationReference } = row;

	const actions: (keyof typeof actionVariant)[] = [];
	if (payment.status === "pending" || payment.status === "review") actions.push("approve");
	if (payment.status === "review") actions.push("decline");
	if (payment.status === "paid" || payment.status === "refund_pending") actions.push("refund");
	if (payment.status === "pending" || payment.status === "review") actions.push("cancel");

	return (
		<main>
			<PageHeader
				back={{ href: "/admin/payments", label: t("payments.admin.title") }}
				title={<span className="font-mono">{payment.reference}</span>}
				actions={
					<Badge variant={paymentStatusVariant[payment.status]} className="px-3 py-1 text-sm">
						{t(`payments.status.${payment.status}`)}
					</Badge>
				}
			/>
			<Card className="max-w-2xl">
				<CardContent className="grid gap-6">
					<DetailList
						items={[
							{
								label: t("payments.payer"),
								value: (
									<>
										{payer.name} <span className="text-muted-foreground">({payer.email})</span>
									</>
								),
							},
							{ label: t("payments.application"), value: applicationReference ?? "-" },
							{
								label: t("payments.amount"),
								value: formatMoney(payment.amount, payment.currency, locale),
							},
							{ label: t("payments.method"), value: payment.method ?? "-" },
							{
								label: t("payments.date"),
								value: (payment.paidAt ?? payment.createdAt).toLocaleString(locale),
							},
						]}
					/>
					{actions.length > 0 ? (
						<div className="flex flex-wrap gap-2 border-t pt-5">
							{actions.map((action) => (
								<form
									key={action}
									method="post"
									action={`/api/admin/payments/${payment.reference}/${action}`}
								>
									<Button type="submit" variant={actionVariant[action]}>
										{t(`payments.admin.${action}`)}
									</Button>
								</form>
							))}
						</div>
					) : null}
				</CardContent>
			</Card>
		</main>
	);
}
