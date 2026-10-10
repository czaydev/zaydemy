import { getTranslator } from "@/server/i18n";
import { resolvedConfig } from "@/server/zaydemy";

/** Required attribution for the free edition; hidden only with a white-label licence. */
export async function PoweredBy() {
	if (!resolvedConfig.brand.poweredBy) return null;
	const t = await getTranslator();
	return (
		<a
			href="https://czay.dev"
			target="_blank"
			rel="noopener"
			className="text-muted-foreground text-xs hover:text-foreground"
		>
			{t("common.poweredBy", { name: "czay.dev" })}
		</a>
	);
}
