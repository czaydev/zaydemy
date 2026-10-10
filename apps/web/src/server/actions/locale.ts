"use server";

import type { Locale } from "@zaydemy/core";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "../i18n";
import { resolvedConfig } from "../zaydemy";

/** Stores the chosen interface language for a year. */
export async function setLocale(form: FormData) {
	const locale = String(form.get("locale")) as Locale;
	if (!resolvedConfig.locales.supported.includes(locale)) return;
	(await cookies()).set(LOCALE_COOKIE, locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
	});
}
