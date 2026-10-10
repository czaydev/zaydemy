import { type PluginPageProps, runtime } from "@zaydemy/core";
import { desc, eq } from "drizzle-orm";
import { formatMoney } from "../money";
import { payments } from "../schema";

/** The signed-in user's payments, newest first. */
export default async function MyPaymentsPage({ session, locale, t }: PluginPageProps) {
	if (!session) return null;
	const rows = await runtime()
		.db.select()
		.from(payments)
		.where(eq(payments.userId, session.user.id))
		.orderBy(desc(payments.createdAt));

	return (
		<main>
			<h1>{t("payments.myPayments")}</h1>
			{rows.length === 0 ? <p>{t("payments.empty")}</p> : null}
			<ul>
				{rows.map((p) => (
					<li key={p.id}>
						<a href={`/payments/${p.reference}`}>
							{p.description ?? t(`payments.stages.${p.stage}`)}
						</a>{" "}
						{formatMoney(p.amount, p.currency, locale)} · {t(`payments.status.${p.status}`)}
					</li>
				))}
			</ul>
		</main>
	);
}
