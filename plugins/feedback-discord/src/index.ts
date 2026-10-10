import { definePlugin, runtime } from "@zaydemy/core";
import messages from "./messages";

export interface DiscordFeedbackOptions {
	/** Discord channel webhook URL. */
	webhookUrl: string;
	/** Name shown on the messages. Default: the brand name. */
	username?: string;
	avatarUrl?: string;
}

/** A feedback form for signed-in users that posts messages to a Discord channel. */
export function discordFeedback({ webhookUrl, username, avatarUrl }: DiscordFeedbackOptions) {
	return definePlugin({
		id: "feedback-discord",
		name: "Feedback to Discord",
		version: "0.1.0",
		appNav: [{ label: "feedback.title", href: "/feedback", icon: "message" }],
		messages,
		pages: [
			{ area: "app", path: "/feedback", signedIn: true, load: () => import("./pages/feedback") },
		],
		api: [
			{
				method: "POST",
				path: "/feedback",
				signedIn: true,
				async handler(request, { session }) {
					const user = await session();
					const message = String((await request.formData()).get("message") ?? "")
						.trim()
						.slice(0, 2000);
					if (!user || !message) return Response.json({ error: "invalid" }, { status: 400 });
					const { config } = runtime();
					const response = await fetch(webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: username ?? config.brand.name,
							avatar_url: avatarUrl,
							// Never let user text ping @everyone or roles.
							allowed_mentions: { parse: [] },
							embeds: [
								{
									title: `${user.user.name} <${user.user.email}>`,
									description: message,
									footer: { text: request.headers.get("referer") ?? "" },
								},
							],
						}),
					});
					if (!response.ok) throw new Error(`Discord webhook responded ${response.status}`);
					return new Response(null, { status: 303, headers: { Location: "/feedback?sent=1" } });
				},
			},
		],
	});
}
