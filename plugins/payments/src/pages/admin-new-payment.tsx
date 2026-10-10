import type { PluginPageProps } from "@zaydemy/core";
import { firstParam } from "../http";

/** Form for an ad-hoc payment, such as a remaining instalment. */
export default function AdminNewPaymentPage({ searchParams, t }: PluginPageProps) {
	const error = firstParam(searchParams.error);
	return (
		<main>
			<h1>{t("payments.admin.create")}</h1>
			{error ? <p role="alert">{error}</p> : null}
			<form method="post" action="/api/admin/payments">
				<label>
					{t("payments.admin.applicationReference")}
					<input name="applicationReference" required />
				</label>
				<label>
					{t("payments.amount")}
					<input name="amount" inputMode="decimal" required />
				</label>
				<label>
					{t("payments.admin.description")}
					<input name="description" />
				</label>
				<button type="submit">{t("payments.admin.save")}</button>
			</form>
		</main>
	);
}
