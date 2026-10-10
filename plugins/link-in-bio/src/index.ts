import { definePlugin, runtime } from "@zaydemy/core";
import messages from "./messages";
import { parseLinks, profileSchema, saveProfile } from "./profile";

const MANAGE = "link-in-bio.manage";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });

/** A public `/links` page for social media bios, edited from the admin panel. */
export const linkInBioPlugin = definePlugin({
	id: "link-in-bio",
	name: "Link in bio",
	version: "0.1.0",
	permissions: [{ key: MANAGE, name: "Edit the link-in-bio page" }],
	adminNav: [
		{ label: "linkInBio.nav", href: "/admin/link-in-bio", icon: "list", permission: MANAGE },
	],
	messages,
	pages: [
		{ area: "app", path: "/links", layout: "bare", load: () => import("./pages/links") },
		{
			area: "admin",
			path: "/link-in-bio",
			permission: MANAGE,
			load: () => import("./pages/admin"),
		},
	],
	api: [
		{
			method: "POST",
			path: "/admin/link-in-bio",
			permission: MANAGE,
			async handler(request) {
				const form = await request.formData();
				const field = (name: string) => String(form.get(name) ?? "");
				const parsed = profileSchema.safeParse({
					title: field("title"),
					description: field("description"),
					avatarUrl: field("avatarUrl").trim(),
					links: parseLinks(field("links")),
				});
				if (!parsed.success) return seeOther("/admin/link-in-bio?error=invalid");
				await saveProfile(runtime().db, parsed.data);
				return seeOther("/admin/link-in-bio");
			},
		},
	],
});

export { getProfile, type Profile } from "./profile";
