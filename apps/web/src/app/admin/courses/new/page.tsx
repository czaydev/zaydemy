import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { Alert, PageHeader } from "@zaydemy/ui";
import { CourseForm } from "@/components/course-form";
import { requirePermission } from "@/server/admin";
import { courseFormLabels, pipelineOptions } from "@/server/course-form-labels";
import { stageSections } from "@/server/courses";
import { getTranslator } from "@/server/i18n";
import { getZaydemy } from "@/server/zaydemy";

export default async function NewCoursePage() {
	await requirePermission(CORE_PERMISSIONS.manageCourses);
	const t = await getTranslator();
	const categories = await getZaydemy()
		.db.select({ id: schema.courseCategories.id, name: schema.courseCategories.name })
		.from(schema.courseCategories)
		.orderBy(schema.courseCategories.name);
	return (
		<main>
			<PageHeader
				back={{ href: "/admin/courses", label: t("courses.title") }}
				title={t("courses.new")}
			/>
			{categories.length === 0 ? (
				<Alert variant="warning">{t("courses.needCategory")}</Alert>
			) : (
				<CourseForm
					initial={{ deliveryModes: "in_person", isOpen: "on", pipeline: "default" }}
					categories={categories}
					pipelines={pipelineOptions(t)}
					sections={stageSections(t)}
					labels={courseFormLabels(t)}
				/>
			)}
		</main>
	);
}
