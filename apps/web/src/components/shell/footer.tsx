import { PoweredBy } from "@/components/powered-by";
import { resolvedConfig } from "@/server/zaydemy";
import { LocaleSwitch } from "./locale-switch";

export function SiteFooter() {
	const { name, supportEmail } = resolvedConfig.brand;
	return (
		<footer className="border-t">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-muted-foreground text-sm sm:px-6">
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
					<span>
						© {new Date().getFullYear()} {name}
					</span>
					{supportEmail ? (
						<a href={`mailto:${supportEmail}`} className="hover:text-foreground">
							{supportEmail}
						</a>
					) : null}
				</div>
				<div className="flex items-center gap-4">
					<PoweredBy />
					<LocaleSwitch />
				</div>
			</div>
		</footer>
	);
}
