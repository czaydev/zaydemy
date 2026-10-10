import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Badge,
	ButtonLink,
	EmptyState,
	Icon,
	LinkTabs,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { desc, eq } from "drizzle-orm";
import { firstParam } from "../http";
import { formatMoney } from "../money";
import { type PaymentStatus, paymentStatus, payments } from "../schema";
import { paymentsWithPayer } from "../service";
import { paymentStatusVariant } from "../status";

/** Admin list of payments, filterable by status, newest first. */
export default async function AdminPaymentsPage({ searchParams, locale, t }: PluginPageProps) {
	const requested = firstParam(searchParams.status);
	const status = paymentStatus.enumValues.find((s) => s === requested) as PaymentStatus | undefined;
	const query = paymentsWithPayer(runtime().db);
	if (status) query.where(eq(payments.status, status));
	const rows = await query.orderBy(desc(payments.createdAt)).limit(200);

	return (
		<main>
			<PageHeader
				title={t("payments.admin.title")}
				actions={
					<ButtonLink href="/admin/payments/new">
						<Icon name="plus" />
						{t("payments.admin.create")}
					</ButtonLink>
				}
			/>
			<LinkTabs
				className="mb-4"
				items={[
					{ href: "/admin/payments", label: t("payments.admin.all"), active: !status },
					...paymentStatus.enumValues.map((s) => ({
						href: `/admin/payments?status=${s}`,
						label: t(`payments.status.${s}`),
						active: s === status,
					})),
				]}
			/>
			{rows.length === 0 ? (
				<EmptyState icon={<Icon name="wallet" />} title={t("payments.empty")} />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("payments.reference")}</TableHead>
							<TableHead>{t("payments.payer")}</TableHead>
							<TableHead>{t("payments.application")}</TableHead>
							<TableHead className="text-right">{t("payments.amount")}</TableHead>
							<TableHead>{t("payments.title")}</TableHead>
							<TableHead>{t("payments.method")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map(({ payment, payer, applicationReference }) => (
							<TableRow key={payment.id}>
								<TableCell>
									<a
										href={`/admin/payments/${payment.reference}`}
										className="font-medium font-mono text-primary hover:underline"
									>
										{payment.reference}
									</a>
								</TableCell>
								<TableCell>
									<p className="font-medium">{payer.name}</p>
									<p className="text-muted-foreground text-xs">{payer.email}</p>
								</TableCell>
								<TableCell className="font-mono text-xs">{applicationReference ?? "-"}</TableCell>
								<TableCell className="text-right font-medium tabular-nums">
									{formatMoney(payment.amount, payment.currency, locale)}
								</TableCell>
								<TableCell>
									<Badge variant={paymentStatusVariant[payment.status]}>
										{t(`payments.status.${payment.status}`)}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">{payment.method ?? "-"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
