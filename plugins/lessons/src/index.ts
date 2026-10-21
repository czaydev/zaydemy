import { definePlugin } from "@zaydemy/core";
import { messages } from "./messages";
import * as schema from "./schema";

export const lessonsPlugin = definePlugin({
	id: "lessons",
	name: "Lessons",
	version: "0.1.0",
	schema,
	messages,
	adminNav: [
		{
			label: "lessons.manageNav",
			href: "/admin/lessons",
			icon: "book-open",
			permission: "lessons.manage",
		},
	],
	appNav: [{ label: "lessons.nav", href: "/lessons" }],
	permissions: [{ key: "lessons.manage", name: "Manage Lessons" }],
	pages: [
		{
			area: "admin",
			path: "/lessons",
			permission: "lessons.manage",
			load: () => import("./pages/admin"),
		},
		{
			area: "app",
			path: "/lessons",
			signedIn: true,
			load: () => import("./pages/my-lessons"),
		},
	],
});
