import { boolean, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { id, timestamps } from "./columns";

// Table shapes follow better-auth's core schema plus its admin plugin fields.

export const profileVisibility = pgEnum("profile_visibility", ["public", "private"]);

export const users = pgTable("users", {
	id: id(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	name: text("name").notNull(),
	image: text("image"),
	phoneNumber: text("phone_number"),
	phoneNumberVerified: boolean("phone_number_verified").notNull().default(false),
	birthDate: timestamp("birth_date", { mode: "date" }),
	country: text("country"),
	city: text("city"),
	bio: text("bio"),
	profileVisibility: profileVisibility("profile_visibility").notNull().default("private"),
	applicationLimit: integer("application_limit").notNull().default(1),
	role: text("role"),
	banned: boolean("banned").notNull().default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { withTimezone: true }),
	...timestamps,
});

export const sessions = pgTable("sessions", {
	id: id(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	impersonatedBy: text("impersonated_by"),
	...timestamps,
});

export const accounts = pgTable("accounts", {
	id: id(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
	scope: text("scope"),
	idToken: text("id_token"),
	password: text("password"),
	...timestamps,
});

export const verifications = pgTable("verifications", {
	id: id(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	...timestamps,
});
