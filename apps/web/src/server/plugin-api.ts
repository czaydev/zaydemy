import "server-only";
import { matchApiRoute } from "@zaydemy/core";
import { headers } from "next/headers";
import { toPluginSession } from "./session";
import { getZaydemy, resolvedConfig } from "./zaydemy";

interface CatchAllContext {
	params: Promise<{ path: string[] }>;
}

/** Dispatches `/api/…` requests to the plugin route registered for them. */
export async function handlePluginApi(request: Request, { params }: CatchAllContext) {
	const { path } = await params;
	const match = matchApiRoute(resolvedConfig.api, request.method, path);
	if (!match) return Response.json({ error: "not_found" }, { status: 404 });

	const app = getZaydemy();
	let cached: ReturnType<typeof toPluginSession> | undefined;
	const session = async () => {
		if (cached === undefined) {
			cached = toPluginSession(await app.auth.api.getSession({ headers: await headers() }));
		}
		return cached;
	};

	const route = match.page;
	if (route.permission || route.signedIn) {
		const current = await session();
		if (!current) return Response.json({ error: "unauthorized" }, { status: 401 });
		if (route.permission && !current.permissions.includes(route.permission)) {
			return Response.json({ error: "forbidden" }, { status: 403 });
		}
	}

	try {
		return await route.handler(request, { params: match.params, session });
	} catch (error) {
		resolvedConfig.errorReporter.capture(error, { route: `${route.method} ${route.path}` });
		return Response.json({ error: "internal_error" }, { status: 500 });
	}
}
