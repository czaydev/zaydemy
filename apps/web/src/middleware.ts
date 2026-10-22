import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	if (
		process.env.DEMO_MODE === "true" &&
		request.method !== "GET" &&
		request.method !== "OPTIONS"
	) {
		if (
			request.nextUrl.pathname.startsWith("/api/auth") ||
			request.nextUrl.pathname.startsWith("/auth")
		) {
			return NextResponse.next();
		}
		return new NextResponse(
			JSON.stringify({
				success: false,
				message: "This is a read-only demo. Write operations are disabled.",
			}),
			{ status: 403, headers: { "content-type": "application/json" } },
		);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
