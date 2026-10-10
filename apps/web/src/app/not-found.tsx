import { ButtonLink, EmptyState } from "@zaydemy/ui";
import { SearchX } from "lucide-react";
import { SiteShell } from "@/components/shell/site-shell";
import { getTranslator } from "@/server/i18n";

export default async function NotFound() {
	const t = await getTranslator();
	return (
		<SiteShell width="narrow">
			<main className="py-10">
				<EmptyState
					icon={<SearchX />}
					title={t("common.notFound")}
					description={t("common.notFoundHint")}
					action={<ButtonLink href="/">{t("common.home")}</ButtonLink>}
				/>
			</main>
		</SiteShell>
	);
}
