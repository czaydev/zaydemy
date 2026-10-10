import { id, timestamps } from "@zaydemy/db";
import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const redirectCategories = pgTable("redirect_categories", {
	id: id(),
	name: text("name").notNull().unique(),
	...timestamps,
});

/** A short link: `/r/<slug>` sends visitors to `targetUrl` and counts the visit. */
export const redirects = pgTable(
	"redirects",
	{
		id: id(),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		description: text("description"),
		targetUrl: text("target_url").notNull(),
		/** Seconds to show the interstitial page before redirecting; 0 redirects at once. */
		countdownSeconds: integer("countdown_seconds").notNull().default(0),
		categoryId: text("category_id").references(() => redirectCategories.id, {
			onDelete: "set null",
		}),
		isActive: boolean("is_active").notNull().default(true),
		clicks: integer("clicks").notNull().default(0),
		...timestamps,
	},
	(t) => [index("redirects_category_idx").on(t.categoryId)],
);

export type Redirect = typeof redirects.$inferSelect;
