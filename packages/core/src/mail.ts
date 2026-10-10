export interface MailMessage {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

/** Sends e-mail. Provided by a mail plugin (e.g. mail-postmark). */
export interface Mailer {
	send(message: MailMessage): Promise<void>;
}

/** Used when no mail plugin is enabled: prints messages so local development still works. */
export const consoleMailer: Mailer = {
	async send(message) {
		console.info(
			`[zaydemy] mail to ${message.to}: ${message.subject}\n${message.text ?? message.html}`,
		);
	},
};

/** Escapes text for safe use inside e-mail HTML. */
export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
