import { definePlugin, type Mailer } from "@zaydemy/core";

export interface PostmarkOptions {
	/** Server API token. */
	serverToken: string;
	/** Verified sender, e.g. `"Zaydemy <noreply@example.com>"`. */
	from: string;
	/** Default: `outbound` (transactional). */
	messageStream?: string;
}

export function postmarkMailer({
	serverToken,
	from,
	messageStream = "outbound",
}: PostmarkOptions): Mailer {
	return {
		async send({ to, subject, html, text }) {
			const response = await fetch("https://api.postmarkapp.com/email", {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"X-Postmark-Server-Token": serverToken,
				},
				body: JSON.stringify({
					From: from,
					To: to,
					Subject: subject,
					HtmlBody: html,
					TextBody: text,
					MessageStream: messageStream,
				}),
			});
			if (!response.ok) {
				throw new Error(`Postmark responded ${response.status}: ${await response.text()}`);
			}
		},
	};
}

/** Sends all system e-mail through Postmark. */
export function postmarkMail(options: PostmarkOptions) {
	return definePlugin({
		id: "mail-postmark",
		name: "Postmark e-mail",
		version: "0.1.0",
		mailer: postmarkMailer(options),
	});
}
