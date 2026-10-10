import type { PluginPageProps } from "@zaydemy/core";
import { Alert, Button, Card, CardContent, Field, PageHeader, Textarea } from "@zaydemy/ui";

export default function FeedbackPage({ searchParams, t }: PluginPageProps) {
	return (
		<main>
			<PageHeader title={t("feedback.title")} description={t("feedback.intro")} />
			{searchParams.sent ? (
				<Alert variant="success">{t("feedback.thanks")}</Alert>
			) : (
				<Card>
					<CardContent>
						<form method="post" action="/api/feedback" className="grid gap-4">
							<Field label={t("feedback.message")} htmlFor="message">
								<Textarea id="message" name="message" required maxLength={2000} rows={6} />
							</Field>
							<div>
								<Button type="submit">{t("feedback.send")}</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
