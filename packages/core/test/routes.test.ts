import { describe, expect, it } from "vitest";
import {
	definePlugin,
	matchApiRoute,
	matchPage,
	type PluginApiRoute,
	type PluginPage,
	resolveConfig,
} from "../src";

const load = async () => ({ default: () => null });
const pages: PluginPage[] = [
	{ area: "admin", path: "/interviews", load },
	{ area: "admin", path: "/interviews/[id]", load },
	{ area: "admin", path: "/interviews/calendar", load },
	{ area: "app", path: "/interview", load },
];

describe("matchPage", () => {
	it("matches static and param segments within the area", () => {
		expect(matchPage(pages, "admin", ["interviews"])?.page.path).toBe("/interviews");
		expect(matchPage(pages, "admin", ["interviews", "42"])?.params).toEqual({ id: "42" });
		expect(matchPage(pages, "app", ["interviews"])).toBeNull();
	});

	it("prefers a static segment over a param", () => {
		expect(matchPage(pages, "admin", ["interviews", "calendar"])?.page.path).toBe(
			"/interviews/calendar",
		);
	});
});

describe("matchApiRoute", () => {
	const handler = () => new Response();
	const routes: PluginApiRoute[] = [
		{ method: "POST", path: "/payments/[reference]/card", handler },
		{ method: "GET", path: "/payments/[reference]/card", handler },
	];

	it("matches by method and path", () => {
		const match = matchApiRoute(routes, "POST", ["payments", "P-1", "card"]);
		expect(match?.page.method).toBe("POST");
		expect(match?.params).toEqual({ reference: "P-1" });
		expect(matchApiRoute(routes, "DELETE", ["payments", "P-1", "card"])).toBeNull();
	});
});

describe("resolveConfig plugins", () => {
	const base = {
		brand: { name: "T", slug: "t" },
		locales: { default: "tr" as const, supported: ["tr" as const] },
		pipelines: { default: [] },
	};
	const mailer = { send: async () => {} };

	it("deep-merges plugin messages that share a top-level key", () => {
		const a = definePlugin({
			id: "a",
			name: "A",
			version: "0",
			messages: { tr: { permissions: { a: { manage: "A yönet" } } } },
		});
		const b = definePlugin({
			id: "b",
			name: "B",
			version: "0",
			messages: { tr: { permissions: { b: { manage: "B yönet" } } } },
		});
		expect(resolveConfig({ ...base, plugins: [a, b] }).messages.tr).toEqual({
			permissions: { a: { manage: "A yönet" }, b: { manage: "B yönet" } },
		});
	});

	it("refuses two mail plugins", () => {
		const a = definePlugin({ id: "a", name: "A", version: "0", mailer });
		const b = definePlugin({ id: "b", name: "B", version: "0", mailer });
		expect(() => resolveConfig({ ...base, plugins: [a, b] })).toThrow(/one mail plugin/);
	});

	it("refuses two plugins claiming the same page", () => {
		const a = definePlugin({
			id: "a",
			name: "A",
			version: "0",
			pages: [{ area: "admin", path: "/x/[id]", load }],
		});
		const b = definePlugin({
			id: "b",
			name: "B",
			version: "0",
			pages: [{ area: "admin", path: "/x/[slug]", load }],
		});
		expect(() => resolveConfig({ ...base, plugins: [a, b] })).toThrow(/Two plugins/);
	});

	it("refuses a plugin whose required service nobody provides", () => {
		const docs = definePlugin({ id: "docs", name: "D", version: "0", requires: ["storage"] });
		expect(() => resolveConfig({ ...base, plugins: [docs] })).toThrow(/needs a storage plugin/);
		const storage = {
			put: async () => {},
			get: async () => null,
			delete: async () => {},
		};
		const local = definePlugin({ id: "local", name: "L", version: "0", storage });
		expect(resolveConfig({ ...base, plugins: [docs, local] }).storage).toBe(storage);
	});

	it("refuses two plugins claiming the same API route", () => {
		const handler = () => new Response();
		const a = definePlugin({
			id: "a",
			name: "A",
			version: "0",
			api: [{ method: "POST", path: "/x/[id]", handler }],
		});
		const b = definePlugin({
			id: "b",
			name: "B",
			version: "0",
			api: [{ method: "POST", path: "/x/[slug]", handler }],
		});
		expect(() => resolveConfig({ ...base, plugins: [a, b] })).toThrow(/API route/);
	});

	it("merges plugin translations per locale", () => {
		const a = definePlugin({
			id: "a",
			name: "A",
			version: "0",
			messages: { tr: { a: { x: "1" } } },
		});
		const b = definePlugin({
			id: "b",
			name: "B",
			version: "0",
			messages: { tr: { b: { y: "2" } }, en: { b: { y: "two" } } },
		});
		const config = resolveConfig({ ...base, plugins: [a, b] });
		expect(config.messages).toEqual({
			tr: { a: { x: "1" }, b: { y: "2" } },
			en: { b: { y: "two" } },
		});
	});
});
