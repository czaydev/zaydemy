import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { PageHeader } from "@zaydemy/ui";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/course-form";
import { requirePermission } from "@/server/admin";
import { courseFormLabels, pipelineOptions } from "@/server/course-form-labels";
import { stageOptionValues, stageSections } from "@/server/courses";
import { getTranslator } from "@/server/i18n";
import { getZaydemy } from "@/server/zaydemy";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
	await requirePermission(CORE_PERMISSIONS.manageCourses);
	const [t, { id }] = await Promise.all([getTranslator(), params]);
	const { db } = getZaydemy();
	const [[course], categories] = await Promise.all([
		db.select().from(schema.courses).where(eq(schema.courses.id, id)),
		db
			.select({ id: schema.courseCategories.id, name: schema.courseCategories.name })
			.from(schema.courseCategories)
			.orderBy(schema.courseCategories.name),
	]);
	if (!course) notFound();
	const sections = stageSections(t);
	return (
		<main>
			<PageHeader
				back={{ href: "/admin/courses", label: t("courses.title") }}
				title={course.name}
			/>
			<CourseForm
				initial={{
					id: course.id,
					name: course.name,
					slug: course.slug,
					description: course.description ?? "",
					categoryId: course.categoryId,
					deliveryModes: course.deliveryModes.join(","),
					pipeline: course.pipeline ?? "default",
					isOpen: course.isOpen ? "on" : "",
					...stageOptionValues(sections, course.stageOptions),
				}}
				categories={categories}
				pipelines={pipelineOptions(t)}
				sections={sections}
				labels={courseFormLabels(t)}
			/>
		</main>
	);
}
