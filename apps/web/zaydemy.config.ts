import { defineConfig, type PluginDefinition } from "@zaydemy/core";
import { notificationsPlugin } from "@zaydemy/plugin-notifications";
import { bankTransferPlugin } from "@zaydemy/plugin-payment-bank-transfer";
import { paymentsPlugin } from "@zaydemy/plugin-payments";
import { contractPlugin } from "@zaydemy/plugin-stage-contract";
import { documentsPlugin } from "@zaydemy/plugin-stage-documents";
import { interviewPlugin } from "@zaydemy/plugin-stage-interview";
import { localFileStorage } from "@zaydemy/plugin-storage-local";
import { integrations } from "./integrations";

/**
 * Everything an institution changes lives here: branding, enabled plugins and
 * application pipelines. Remove a plugin from `plugins` to turn it off.
 */
export default defineConfig({
	brand: {
		name: "Zaydemy",
		slug: "zaydemy",
		supportEmail: "support@example.com",
		// logo: { full: "/logo.svg", icon: "/icon.svg" },
		theme: { primary: "#2b59d9" },
	},
	locales: { default: "tr", supported: ["tr", "en"] },
	plugins: [
		// Application stages. Each course sets its own options (amounts, documents…).
		paymentsPlugin(), // "prepayment" and "tuition"; an amount of 0 skips the stage
		interviewPlugin,
		documentsPlugin({ maxSizeMb: 5 }),
		contractPlugin,

		// Ways to pay. Card payments (better-payment) are in integrations.ts.
		bankTransferPlugin,

		notificationsPlugin({ email: true, sms: false }),

		// Card payments, mail, SMS, storage, monitoring and other extras switch on when their
		// environment variables are set; see integrations.ts.
		...integrations(),
		...(process.env.BUNNY_STORAGE_ZONE ? [] : [localFileStorage({ root: "./storage" })]),
	] satisfies PluginDefinition[],
	pipelines: {
		default: ["prepayment", "interview", "documents", "contract", "tuition"],
		// A free course with no stages: applicants are enrolled right away.
		free: [],
	},
	license: process.env.ZAYDEMY_LICENSE,
});
