import { id, timestamps } from "@zaydemy/db";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

/** Accounts shown to payers who choose bank transfer. */
export const bankAccounts = pgTable("bank_accounts", {
	id: id(),
	bankName: text("bank_name").notNull(),
	branch: text("branch"),
	accountHolder: text("account_holder").notNull(),
	currency: text("currency").notNull().default("TRY"),
	iban: text("iban").notNull().unique(),
	swiftCode: text("swift_code"),
	isActive: boolean("is_active").notNull().default(true),
	sortOrder: integer("sort_order").notNull().default(0),
	...timestamps,
});

export type BankAccount = typeof bankAccounts.$inferSelect;
