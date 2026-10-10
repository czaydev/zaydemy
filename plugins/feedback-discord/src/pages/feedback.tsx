import type { PluginPageProps } from "@zaydemy/core";

export default function FeedbackPage({ searchParams, t }: PluginPageProps) {
	return (
		<main>
			<h1>{t("feedback.title")}</h1>
			{searchParams.sent ? (
				<p role="status">{t("feedback.thanks")}</p>
			) : (
				<form method="post" action="/api/feedback">
					<p>{t("feedback.intro")}</p>
					<label>
						{t("feedback.message")}
						<textarea name="message" required maxLength={2000} rows={6} />
					</label>
					<button type="submit">{t("feedback.send")}</button>
				</form>
			)}
		</main>
	);
}
