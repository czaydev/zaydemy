import { type PluginPageProps, runtime } from "@zaydemy/core";
import { Badge, EmptyState, Icon, PageHeader } from "@zaydemy/ui";
import { desc, eq } from "drizzle-orm";
import { formatMoney } from "../money";
import { payments } from "../schema";
import { paymentStatusVariant } from "../status";

/** The signed-in user's payments, newest first. */
export default async function MyPaymentsPage({ session, locale, t }: PluginPageProps) {
	if (!session) return null;
	const rows = await runtime()
		.db.select()
		.from(payments)
		.where(eq(payments.userId, session.user.id))
		.orderBy(desc(payments.createdAt));
	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

	return (
		<main>
			<PageHeader title={t("payments.myPayments")} />
			{rows.length === 0 ? (
				<EmptyState icon={<Icon name="wallet" />} title={t("payments.empty")} />
			) : (
				<ul className="grid gap-3">
					{rows.map((p) => (
						<li key={p.id}>
							<a
								href={`/payments/${p.reference}`}
								className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
							>
								<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
									<Icon name="wallet" className="size-5" />
								</span>
								<span className="grid min-w-0 flex-1 gap-0.5">
									<span className="truncate font-medium">
										{p.description ?? t(`payments.stages.${p.stage}`)}
									</span>
									<span className="text-muted-foreground text-xs">
										{p.reference} · {date.format(p.createdAt)}
									</span>
								</span>
								<span className="grid justify-items-end gap-1">
									<span className="font-semibold tabular-nums">
										{formatMoney(p.amount, p.currency, locale)}
									</span>
									<Badge variant={paymentStatusVariant[p.status]}>
										{t(`payments.status.${p.status}`)}
									</Badge>
								</span>
							</a>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
