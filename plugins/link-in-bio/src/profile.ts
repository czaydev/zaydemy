import type { Zaydemy } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const SETTING_KEY = "link-in-bio.profile";

const httpUrl = z.url({ protocol: /^https?$/ });

export const profileSchema = z.object({
	title: z.string().trim().min(1).max(100),
	description: z.string().trim().max(500).default(""),
	avatarUrl: httpUrl.or(z.literal("")).default(""),
	links: z
		.array(z.object({ title: z.string().trim().min(1).max(100), url: httpUrl }))
		.max(50)
		.default([]),
});

export type Profile = z.infer<typeof profileSchema>;

export async function getProfile(db: Zaydemy["db"]): Promise<Profile | null> {
	const [row] = await db
		.select({ value: schema.settings.value })
		.from(schema.settings)
		.where(eq(schema.settings.key, SETTING_KEY));
	const parsed = profileSchema.safeParse(row?.value);
	return parsed.success ? parsed.data : null;
}

export async function saveProfile(db: Zaydemy["db"], profile: Profile) {
	await db
		.insert(schema.settings)
		.values({ key: SETTING_KEY, value: profile })
		.onConflictDoUpdate({ target: schema.settings.key, set: { value: profile } });
}

/** Parses the admin textarea: one link per line as `Title | https://…`. */
export function parseLinks(text: string): { title: string; url: string }[] {
	return text
		.split("\n")
		.map((line) => line.split("|").map((part) => part.trim()))
		.filter(([title, url]) => title && url)
		.map(([title, url]) => ({ title: title as string, url: url as string }));
}
