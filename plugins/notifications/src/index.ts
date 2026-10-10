import { definePlugin, runtime, type Zaydemy } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { createTranslator } from "@zaydemy/i18n";
import { eq } from "drizzle-orm";
import messages from "./messages";
import { type Channels, listNotifications, markRead, notify } from "./service";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });

async function applicationInfo(app: Zaydemy, applicationId: string) {
	const [row] = await app.db
		.select({
			userId: schema.applications.userId,
			reference: schema.applications.reference,
			course: schema.courses.name,
		})
		.from(schema.applications)
		.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
		.where(eq(schema.applications.id, applicationId));
	return row ?? null;
}

/**
 * Tells applicants what happened to their application: an in-app inbox, plus
 * e-mail (and optionally SMS) through the enabled mail and SMS plugins.
 * Messages use the default locale.
 */
export function notificationsPlugin(channels: Channels = {}) {
	return definePlugin({
		id: "notifications",
		name: "Notifications",
		version: "0.1.0",
		messages,
		pages: [
			{
				area: "app",
				path: "/notifications",
				signedIn: true,
				load: () => import("./pages/notifications"),
			},
		],
		api: [
			{
				method: "GET",
				path: "/notifications",
				signedIn: true,
				async handler(_request, { session }) {
					const user = await session();
					if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
					const rows = await listNotifications(runtime().db, user.user.id, 20);
					return Response.json({
						unread: rows.filter((n) => !n.readAt).length,
						notifications: rows,
					});
				},
			},
			{
				method: "POST",
				path: "/notifications/read",
				signedIn: true,
				async handler(request, { session }) {
					const user = await session();
					if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
					const id = String((await request.formData()).get("id") ?? "") || undefined;
					await markRead(runtime().db, user.user.id, id);
					return seeOther("/notifications");
				},
			},
		],
		setup({ events, errorReporter }) {
			const send = async (input: Parameters<typeof notify>[1]) => {
				try {
					await notify(runtime(), input, channels);
				} catch (error) {
					errorReporter.capture(error, { notification: input.title });
				}
			};
			const translator = () => {
				const { config } = runtime();
				return createTranslator(config, config.locales.default);
			};

			events.on("stage.entered", async ({ applicationId, stage }) => {
				const app = runtime();
				const info = await applicationInfo(app, applicationId);
				const definition = app.config.stages.get(stage);
				if (!info || !definition) return;
				const t = translator();
				const values = { ...info, stage: t(definition.label) };
				await send({
					userId: info.userId,
					title: t("notifications.stageEntered", values),
					body: t("notifications.stageEnteredBody", values),
					targetUrl: definition.applicantHref,
				});
			});
			for (const [event, key] of [
				["application.enrolled", "enrolled"],
				["application.rejected", "rejected"],
			] as const) {
				events.on(event, async ({ applicationId }) => {
					const info = await applicationInfo(runtime(), applicationId);
					if (!info) return;
					const t = translator();
					await send({
						userId: info.userId,
						title: t(`notifications.${key}`, info),
						body: t(`notifications.${key}Body`, info),
					});
				});
			}
			for (const [event, key] of [
				["payment.created", "paymentCreated"],
				["payment.paid", "paymentPaid"],
			] as const) {
				events.on(event, async (payload) => {
					const reference = String(payload.reference ?? "");
					const t = translator();
					await send({
						userId: String(payload.userId),
						title: t(`notifications.${key}`),
						body: t(`notifications.${key}Body`, { reference }),
						targetUrl: `/payments/${reference}`,
					});
				});
			}
			events.on("document.rejected", async (payload) => {
				const t = translator();
				await send({
					userId: String(payload.userId),
					title: t("notifications.documentRejected"),
					body: t("notifications.documentRejectedBody", { note: String(payload.note ?? "") }),
					targetUrl: "/documents",
				});
			});
		},
	});
}

export { listNotifications, markRead, notify } from "./service";
