import type { PluginPageProps } from "@zaydemy/core";
import { Alert, Button, Card, CardContent, Field, Input, PageHeader } from "@zaydemy/ui";
import { firstParam } from "../http";

/** Form for an ad-hoc payment, such as a remaining instalment. */
export default function AdminNewPaymentPage({ searchParams, t }: PluginPageProps) {
	const error = firstParam(searchParams.error);
	return (
		<main>
			<PageHeader
				back={{ href: "/admin/payments", label: t("payments.admin.title") }}
				title={t("payments.admin.create")}
			/>
			<Card className="max-w-xl">
				<CardContent>
					<form method="post" action="/api/admin/payments" className="grid gap-4">
						{error ? <Alert variant="destructive">{error}</Alert> : null}
						<Field label={t("payments.admin.applicationReference")} htmlFor="applicationReference">
							<Input id="applicationReference" name="applicationReference" required />
						</Field>
						<Field label={t("payments.amount")} htmlFor="amount">
							<Input id="amount" name="amount" inputMode="decimal" required />
						</Field>
						<Field label={t("payments.admin.description")} htmlFor="description">
							<Input id="description" name="description" />
						</Field>
						<div>
							<Button type="submit">{t("payments.admin.save")}</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
