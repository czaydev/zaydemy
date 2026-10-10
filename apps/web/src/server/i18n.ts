import "server-only";
import { createTranslator, negotiateLocale } from "@zaydemy/i18n";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { resolvedConfig } from "./zaydemy";

export const LOCALE_COOKIE = "locale";

/** Locale from the cookie, then Accept-Language, then the configured default. */
export const getLocale = cache(async () => {
	const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
	return negotiateLocale(
		resolvedConfig,
		cookieStore.get(LOCALE_COOKIE)?.value,
		headerList.get("accept-language"),
	);
});

export const getTranslator = cache(async () => createTranslator(resolvedConfig, await getLocale()));
