/** Redirect after a form post; relative locations keep the app's own origin. */
export function seeOther(location: string): Response {
	return new Response(null, { status: 303, headers: { Location: location } });
}

export function firstParam(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}
