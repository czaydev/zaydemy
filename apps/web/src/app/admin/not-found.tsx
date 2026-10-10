import { ButtonLink, EmptyState } from "@zaydemy/ui";
import { SearchX } from "lucide-react";
import { getTranslator } from "@/server/i18n";

export default async function AdminNotFound() {
	const t = await getTranslator();
	return (
		<main className="py-10">
			<EmptyState
				icon={<SearchX />}
				title={t("common.notFound")}
				description={t("common.notFoundHint")}
				action={<ButtonLink href="/admin">{t("admin.overview")}</ButtonLink>}
			/>
		</main>
	);
}
