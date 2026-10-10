import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/server/i18n";
import { brandStyle } from "@/server/theme";
import { resolvedConfig } from "@/server/zaydemy";
import "./globals.css";

export const metadata: Metadata = {
	title: { template: `%s | ${resolvedConfig.brand.name}`, default: resolvedConfig.brand.name },
	icons: resolvedConfig.brand.logo ? { icon: resolvedConfig.brand.logo.icon } : undefined,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
	const locale = await getLocale();
	return (
		<html lang={locale} style={brandStyle()}>
			<body>{children}</body>
		</html>
	);
}
