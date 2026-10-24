/** Dates entered by staff are explicitly UTC, independent of the server timezone. */
export function contentFields(form: FormData) {
	const title = String(form.get("title") ?? "").trim();
	const orderText = String(form.get("order") ?? "").trim();
	const order = Number(orderText);
	const rawDate = String(form.get("openAt") ?? "").trim();
	let openAt: Date | null = null;
	if (rawDate) {
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawDate)) return null;
		openAt = new Date(`${rawDate}:00.000Z`);
		if (!Number.isFinite(openAt.getTime()) || openAt.toISOString().slice(0, 16) !== rawDate)
			return null;
	}
	if (
		!title ||
		title.length > 200 ||
		!/^\d+$/.test(orderText) ||
		!Number.isSafeInteger(order) ||
		order > 2147483647
	)
		return null;
	return { title, order, isPublished: form.get("isPublished") === "on", openAt };
}
