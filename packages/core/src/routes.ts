import type { Locale } from "./plugin";

/** The signed-in user as plugins see it. */
export interface PluginSession {
	user: { id: string; email: string; name: string; phoneNumber?: string | null };
	roles: string[];
	permissions: string[];
}

/** Looks up a translated string; `{name}` placeholders are filled from `values`. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Props every plugin page receives. */
export interface PluginPageProps {
	params: Record<string, string>;
	searchParams: Record<string, string | string[] | undefined>;
	session: PluginSession | null;
	locale: Locale;
	t: Translate;
}

export interface PluginPageModule {
	/** A React server component; typed loosely so core stays framework-free. */
	default: (props: PluginPageProps) => unknown;
}

/**
 * Where a plugin page is mounted. `admin` pages live under `/admin`,
 * `app` pages at the site root.
 */
export type PageArea = "admin" | "app";

export interface PluginPage {
	area: PageArea;
	/** Path inside the area, with `[name]` params, e.g. `/interviews/[id]`. */
	path: string;
	load: () => Promise<PluginPageModule>;
	/** Permission needed to open the page; admin pages without one need any admin role. */
	permission?: string;
	/** App pages that need a signed-in user. */
	signedIn?: boolean;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface PluginApiContext {
	params: Record<string, string>;
	/** Resolves the signed-in user, or null. */
	session: () => Promise<PluginSession | null>;
}

/**
 * An HTTP handler mounted under `/api`, e.g. `path: "/payments/[reference]/card"`
 * serves `/api/payments/…/card`. Routes with `permission` or `signedIn` answer
 * 401/403 before the handler runs; anything else is public (payment callbacks).
 */
export interface PluginApiRoute {
	method: HttpMethod;
	path: string;
	permission?: string;
	signedIn?: boolean;
	handler: (request: Request, ctx: PluginApiContext) => Response | Promise<Response>;
}

export interface RouteMatch<T = PluginPage> {
	page: T;
	params: Record<string, string>;
}

/** Finds the page for a URL path inside an area. Static segments beat params. */
export function matchPage(
	pages: PluginPage[],
	area: PageArea,
	segments: string[],
): RouteMatch | null {
	return matchPath(
		pages.filter((p) => p.area === area),
		segments,
	);
}

/** Finds the API route for a method and URL path under `/api`. */
export function matchApiRoute(
	routes: PluginApiRoute[],
	method: string,
	segments: string[],
): RouteMatch<PluginApiRoute> | null {
	return matchPath(
		routes.filter((r) => r.method === method),
		segments,
	);
}

function matchPath<T extends { path: string }>(
	items: T[],
	segments: string[],
): RouteMatch<T> | null {
	let best: { match: RouteMatch<T>; score: number } | null = null;
	for (const page of items) {
		const pattern = splitPath(page.path);
		if (pattern.length !== segments.length) continue;
		const params: Record<string, string> = {};
		let score = 0;
		let ok = true;
		for (let i = 0; i < pattern.length; i++) {
			const part = pattern[i] as string;
			const segment = segments[i] as string;
			const param = /^\[(\w+)\]$/.exec(part);
			if (param) {
				params[param[1] as string] = decodeURIComponent(segment);
			} else if (part === segment) {
				score++;
			} else {
				ok = false;
				break;
			}
		}
		if (ok && (!best || score > best.score)) best = { match: { page, params }, score };
	}
	return best?.match ?? null;
}

export function splitPath(path: string): string[] {
	return path.split("/").filter(Boolean);
}
