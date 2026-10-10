import type { Zaydemy } from "@zaydemy/core";
import { escapeHtml } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { and, desc, eq, isNull } from "drizzle-orm";

type Db = Zaydemy["db"];

export interface NotificationInput {
	userId: string;
	title: string;
	body?: string;
	/** Path inside the app, e.g. `/payments/PAY123`. */
	targetUrl?: string;
}

export interface Channels {
	/** Also e-mail the notification through the mail plugin. Default: true. */
	email?: boolean;
	/** Also text it to the user's phone number through the SMS plugin. Default: false. */
	sms?: boolean;
}

/** Stores an in-app notification and sends it on the enabled channels. */
export async function notify(app: Zaydemy, input: NotificationInput, channels: Channels = {}) {
	const { db, config, baseUrl } = app;
	await db.insert(schema.notifications).values(input);
	const { email = true, sms = false } = channels;
	if (!email && !sms) return;

	const [user] = await db
		.select({ email: schema.users.email, phoneNumber: schema.users.phoneNumber })
		.from(schema.users)
		.where(eq(schema.users.id, input.userId));
	if (!user) return;
	const link = input.targetUrl ? new URL(input.targetUrl, baseUrl).toString() : undefined;

	if (email) {
		const html = [
			`<p><strong>${escapeHtml(input.title)}</strong></p>`,
			input.body ? `<p>${escapeHtml(input.body)}</p>` : "",
			link ? `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` : "",
		].join("");
		await config.mailer.send({
			to: user.email,
			subject: `${config.brand.name}: ${input.title}`,
			html,
			text: [input.title, input.body, link].filter(Boolean).join("\n\n"),
		});
	}
	if (sms && user.phoneNumber) {
		await config.sms.send({
			to: user.phoneNumber,
			text: [input.title, link].filter(Boolean).join(" "),
		});
	}
}

export function listNotifications(db: Db, userId: string, limit = 50) {
	return db
		.select()
		.from(schema.notifications)
		.where(eq(schema.notifications.userId, userId))
		.orderBy(desc(schema.notifications.createdAt))
		.limit(limit);
}

/** Marks one notification, or all of the user's unread ones, as read. */
export async function markRead(db: Db, userId: string, notificationId?: string) {
	await db
		.update(schema.notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(schema.notifications.userId, userId),
				isNull(schema.notifications.readAt),
				notificationId ? eq(schema.notifications.id, notificationId) : undefined,
			),
		);
}
