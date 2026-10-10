import { escapeHtml, type ResolvedConfig } from "@zaydemy/core";
import { type Database, schema } from "@zaydemy/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, customSession, emailOTP } from "better-auth/plugins";
import { getUserAccess } from "./access";

export interface AuthOptions {
	db: Database;
	config: ResolvedConfig;
	baseURL: string;
	secret: string;
	/** Google sign-in is offered only when both values are set. */
	google?: { clientId?: string; clientSecret?: string };
}

export function createAuth({ db, config, baseURL, secret, google }: AuthOptions) {
	const { mailer, brand } = config;
	return betterAuth({
		appName: brand.name,
		baseURL,
		secret,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				user: schema.users,
				session: schema.sessions,
				account: schema.accounts,
				verification: schema.verifications,
			},
		}),
		emailAndPassword: { enabled: true },
		socialProviders:
			google?.clientId && google.clientSecret
				? { google: { clientId: google.clientId, clientSecret: google.clientSecret } }
				: {},
		user: {
			changeEmail: {
				enabled: true,
				// Sent to the current address so the owner approves the change.
				sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
					await mailer.send({
						to: user.email,
						subject: `${brand.name}: confirm e-mail change`,
						html: `<p>Change your e-mail address to ${escapeHtml(newEmail)}: <a href="${escapeHtml(url)}">confirm</a></p>`,
						text: url,
					});
				},
			},
		},
		session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
		rateLimit: { enabled: true, window: 10, max: 100 },
		plugins: [
			emailOTP({
				expiresIn: 300,
				disableSignUp: true,
				async sendVerificationOTP({ email, otp }) {
					await mailer.send({
						to: email,
						subject: `${brand.name}: ${otp}`,
						html: `<p><strong>${otp}</strong></p>`,
						text: otp,
					});
				},
			}),
			admin(),
			customSession(async ({ user, session }) => ({
				user,
				session,
				...(await getUserAccess(db, user.id)),
			})),
			nextCookies(),
		],
		onAPIError: { errorURL: "/auth/error" },
	});
}

export type Auth = ReturnType<typeof createAuth>;
export { can, getUserAccess, type UserAccess } from "./access";
