import { type PluginPageProps, runtime } from "@zaydemy/core";
import { listNotifications } from "../service";

/** The signed-in user's notifications, newest first. */
export default async function NotificationsPage({ session, locale, t }: PluginPageProps) {
	if (!session) return null;
	const rows = await listNotifications(runtime().db, session.user.id);
	return (
		<main>
			<h1>{t("notifications.title")}</h1>
			{rows.length === 0 ? (
				<p>{t("notifications.empty")}</p>
			) : (
				<form method="post" action="/api/notifications/read">
					<button type="submit">{t("notifications.markAllRead")}</button>
				</form>
			)}
			<ul>
				{rows.map((n) => (
					<li key={n.id} style={{ fontWeight: n.readAt ? "normal" : "bold" }}>
						{n.title}
						{n.body ? ` · ${n.body}` : null} · {n.createdAt.toLocaleString(locale)}
						{n.targetUrl ? (
							<>
								{" · "}
								<a href={n.targetUrl}>{t("notifications.open")}</a>
							</>
						) : null}
					</li>
				))}
			</ul>
		</main>
	);
}
