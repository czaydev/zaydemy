import { definePlugin, runtime } from "@zaydemy/core";
import { eq, not } from "drizzle-orm";
import messages from "./messages";
import { redirectCategories, redirects } from "./schema";
import { follow, isSafeTarget, SLUG } from "./service";

const MANAGE = "redirects.manage";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });

/** Short links with click counts, served at `/r/<slug>`. Independent of applications. */
export const redirectsPlugin = definePlugin({
	id: "redirects",
	name: "Redirects",
	version: "0.1.0",
	schema: { redirects, redirectCategories },
	permissions: [{ key: MANAGE, name: "Manage redirects" }],
	adminNav: [
		{ label: "redirects.nav", href: "/admin/redirects", icon: "link", permission: MANAGE },
	],
	messages,
	pages: [
		{ area: "app", path: "/r/[slug]", load: () => import("./pages/go") },
		{
			area: "admin",
			path: "/redirects",
			permission: MANAGE,
			load: () => import("./pages/admin-redirects"),
		},
	],
	api: [
		{
			// For a separate short-link domain that resolves links through this API.
			method: "GET",
			path: "/redirects/[slug]",
			async handler(_request, { params }) {
				const redirect = await follow(runtime().db, params.slug ?? "");
				if (!redirect) return Response.json({ error: "not_found" }, { status: 404 });
				const { name, description, targetUrl, countdownSeconds } = redirect;
				return Response.json({ name, description, targetUrl, countdownSeconds });
			},
		},
		{
			method: "POST",
			path: "/admin/redirects",
			permission: MANAGE,
			async handler(request) {
				const form = await request.formData();
				const field = (name: string) => String(form.get(name) ?? "").trim();
				const countdown = Math.min(60, Math.max(0, Number(field("countdownSeconds")) || 0));
				if (!SLUG.test(field("slug")) || !isSafeTarget(field("targetUrl")) || !field("name")) {
					return seeOther("/admin/redirects?error=invalid");
				}
				await runtime()
					.db.insert(redirects)
					.values({
						slug: field("slug"),
						name: field("name"),
						targetUrl: field("targetUrl"),
						description: field("description") || null,
						countdownSeconds: countdown,
						categoryId: field("categoryId") || null,
					})
					.onConflictDoNothing();
				return seeOther("/admin/redirects");
			},
		},
		{
			method: "POST",
			path: "/admin/redirects/[id]/toggle",
			permission: MANAGE,
			async handler(_request, { params }) {
				await runtime()
					.db.update(redirects)
					.set({ isActive: not(redirects.isActive) })
					.where(eq(redirects.id, params.id ?? ""));
				return seeOther("/admin/redirects");
			},
		},
		{
			method: "POST",
			path: "/admin/redirect-categories",
			permission: MANAGE,
			async handler(request) {
				const name = String((await request.formData()).get("name") ?? "").trim();
				if (name) {
					await runtime().db.insert(redirectCategories).values({ name }).onConflictDoNothing();
				}
				return seeOther("/admin/redirects");
			},
		},
	],
});

export * from "./schema";
export { follow } from "./service";
