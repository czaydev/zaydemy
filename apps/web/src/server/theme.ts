import type { CSSProperties } from "react";
import { resolvedConfig } from "./zaydemy";

/** CSS variables for the brand colours in zaydemy.config.ts, set on <html>. */
export function brandStyle(): CSSProperties {
	const theme = resolvedConfig.brand.theme;
	const style: Record<string, string> = {};
	if (theme?.primary) style["--brand"] = theme.primary;
	if (theme?.primaryForeground) style["--brand-foreground"] = theme.primaryForeground;
	return style as CSSProperties;
}
