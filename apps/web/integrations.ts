import type { PluginDefinition } from "@zaydemy/core";
import { discordFeedback } from "@zaydemy/plugin-feedback-discord";
import { linkInBioPlugin } from "@zaydemy/plugin-link-in-bio";
import { postmarkMail } from "@zaydemy/plugin-mail-postmark";
import { sentryMonitoring } from "@zaydemy/plugin-monitoring-sentry";
import { cardPayments } from "@zaydemy/plugin-payment-card";
import { redirectsPlugin } from "@zaydemy/plugin-redirects";
import { ekomesajSms } from "@zaydemy/plugin-sms-ekomesaj";
import { bunnyStorage } from "@zaydemy/plugin-storage-bunny";
import { betterPayment, iyzico } from "better-payment";

const env = (name: string) => process.env[name] || undefined;

/**
 * Optional plugins that need credentials. Each is enabled when its
 * environment variables are present, so a fresh checkout runs without any.
 */
export function integrations(): PluginDefinition[] {
	const plugins: PluginDefinition[] = [redirectsPlugin, linkInBioPlugin];

	// Any better-payment provider works here: iyzico, PayTR, Parampos, Akbank, Kuveyt Türk.
	const iyzicoKey = env("IYZICO_API_KEY");
	const iyzicoSecret = env("IYZICO_SECRET_KEY");
	if (iyzicoKey && iyzicoSecret) {
		plugins.push(
			cardPayments({
				gateway: betterPayment({
					mode: env("PAYMENT_MODE") === "production" ? "production" : "sandbox",
					providers: { iyzico: iyzico({ apiKey: iyzicoKey, secretKey: iyzicoSecret }) },
				}),
				provider: "iyzico",
				installments: [1, 2, 3, 6, 9],
			}),
		);
	}

	const postmarkToken = env("POSTMARK_SERVER_TOKEN");
	const mailFrom = env("MAIL_FROM");
	if (postmarkToken && mailFrom) {
		plugins.push(postmarkMail({ serverToken: postmarkToken, from: mailFrom }));
	}

	const smsUser = env("EKOMESAJ_USERNAME");
	const smsPassword = env("EKOMESAJ_PASSWORD");
	const smsSender = env("SMS_SENDER_NAME");
	if (smsUser && smsPassword && smsSender) {
		plugins.push(ekomesajSms({ username: smsUser, password: smsPassword, sender: smsSender }));
	}

	const bunnyZone = env("BUNNY_STORAGE_ZONE");
	const bunnyKey = env("BUNNY_STORAGE_ACCESS_KEY");
	if (bunnyZone && bunnyKey) {
		plugins.push(
			bunnyStorage({ zone: bunnyZone, accessKey: bunnyKey, host: env("BUNNY_STORAGE_HOST") }),
		);
	}

	const sentryDsn = env("SENTRY_DSN");
	if (sentryDsn) {
		plugins.push(sentryMonitoring({ dsn: sentryDsn, environment: env("SENTRY_ENVIRONMENT") }));
	}

	const discordWebhook = env("DISCORD_FEEDBACK_WEBHOOK_URL");
	if (discordWebhook) plugins.push(discordFeedback({ webhookUrl: discordWebhook }));

	return plugins;
}
