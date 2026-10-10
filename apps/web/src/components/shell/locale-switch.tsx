import { cn } from "@zaydemy/ui";
import { setLocale } from "@/server/actions/locale";
import { getLocale } from "@/server/i18n";
import { resolvedConfig } from "@/server/zaydemy";

/** Language buttons; hidden when only one language is enabled. */
export async function LocaleSwitch() {
	const supported = resolvedConfig.locales.supported;
	if (supported.length < 2) return null;
	const current = await getLocale();
	return (
		<form action={setLocale} className="flex items-center gap-1">
			{supported.map((locale) => (
				<button
					key={locale}
					type="submit"
					name="locale"
					value={locale}
					aria-pressed={locale === current}
					className={cn(
						"cursor-pointer rounded px-1.5 py-0.5 font-medium text-xs uppercase",
						locale === current
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{locale}
				</button>
			))}
		</form>
	);
}
