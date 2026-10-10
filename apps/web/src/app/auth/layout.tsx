import type { ReactNode } from "react";
import { PoweredBy } from "@/components/powered-by";
import { Brand } from "@/components/shell/brand";
import { LocaleSwitch } from "@/components/shell/locale-switch";
import { getTranslator } from "@/server/i18n";
import { resolvedConfig } from "@/server/zaydemy";

/** Two-column frame for sign-in and sign-up: brand panel on wide screens, form on the right. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
	const t = await getTranslator();
	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
				<div
					aria-hidden
					className="absolute -top-32 -right-32 size-96 rounded-full bg-white/10 blur-2xl"
				/>
				<div
					aria-hidden
					className="absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-black/10 blur-2xl"
				/>
				<p className="relative font-semibold text-lg">{resolvedConfig.brand.name}</p>
				<div className="relative grid max-w-md gap-3">
					<h2 className="font-semibold text-3xl leading-tight tracking-tight">
						{t("auth.tagline")}
					</h2>
					<p className="text-primary-foreground/80">{t("auth.taglineHint")}</p>
				</div>
				<p className="relative text-primary-foreground/70 text-sm">
					© {new Date().getFullYear()} {resolvedConfig.brand.name}
				</p>
			</aside>
			<div className="flex flex-col">
				<div className="flex h-16 items-center justify-between px-6 lg:justify-end">
					<Brand className="lg:hidden" />
					<LocaleSwitch />
				</div>
				<main className="flex flex-1 items-center justify-center px-6 py-10">
					<div className="w-full max-w-sm">{children}</div>
				</main>
				<div className="flex justify-center pb-6">
					<PoweredBy />
				</div>
			</div>
		</div>
	);
}
