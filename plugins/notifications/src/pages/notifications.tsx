import { type PluginPageProps, runtime } from "@zaydemy/core";
import { Button, ButtonLink, cn, EmptyState, Icon, PageHeader } from "@zaydemy/ui";
import { listNotifications } from "../service";

/** The signed-in user's notifications, newest first. */
export default async function NotificationsPage({ session, locale, t }: PluginPageProps) {
	if (!session) return null;
	const rows = await listNotifications(runtime().db, session.user.id);
	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
	return (
		<main>
			<PageHeader
				title={t("notifications.title")}
				actions={
					rows.some((n) => !n.readAt) ? (
						<form method="post" action="/api/notifications/read">
							<Button type="submit" variant="outline" size="sm">
								{t("notifications.markAllRead")}
							</Button>
						</form>
					) : null
				}
			/>
			{rows.length === 0 ? (
				<EmptyState icon={<Icon name="bell" />} title={t("notifications.empty")} />
			) : (
				<ul className="divide-y overflow-hidden rounded-xl border bg-card">
					{rows.map((n) => (
						<li key={n.id} className={cn("flex gap-4 p-4", !n.readAt && "bg-accent/40")}>
							<span
								aria-hidden
								className={cn(
									"mt-1.5 size-2 shrink-0 rounded-full",
									n.readAt ? "bg-transparent" : "bg-primary",
								)}
							/>
							<div className="grid min-w-0 flex-1 gap-0.5">
								<p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
								{n.body ? <p className="text-muted-foreground text-sm">{n.body}</p> : null}
								<p className="text-muted-foreground text-xs">{date.format(n.createdAt)}</p>
							</div>
							{n.targetUrl ? (
								<ButtonLink href={n.targetUrl} variant="ghost" size="sm" className="self-center">
									{t("notifications.open")}
								</ButtonLink>
							) : null}
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
