import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema as coreSchema } from "@zaydemy/db";
import { Card, CardContent, PageHeader } from "@zaydemy/ui";
import { and, asc, eq } from "drizzle-orm";
import { lessons, sections } from "../schema";

export default async function MyLessonsPage({ t, session, searchParams }: PluginPageProps) {
	const { db } = runtime();
	if (!session) return null;

	const enrolledCourses = await db
		.select({
			id: coreSchema.courses.id,
			name: coreSchema.courses.name,
		})
		.from(coreSchema.courses)
		.innerJoin(coreSchema.applications, eq(coreSchema.courses.id, coreSchema.applications.courseId))
		.where(
			and(
				eq(coreSchema.applications.userId, session.user.id),
				eq(coreSchema.applications.status, "enrolled"),
			),
		);

	const selectedCourseId =
		typeof searchParams.courseId === "string" ? searchParams.courseId : enrolledCourses[0]?.id;

	let courseSections: {
		id: string;
		title: string;
		order: number;
		lessons: { id: string; title: string; order: number }[];
	}[] = [];

	if (selectedCourseId && enrolledCourses.some((c) => c.id === selectedCourseId)) {
		const dbSections = await db
			.select()
			.from(sections)
			.where(eq(sections.courseId, selectedCourseId))
			.orderBy(asc(sections.order));
		const dbLessons = await db
			.select()
			.from(lessons)
			.where(eq(lessons.isPublished, true))
			.orderBy(asc(lessons.order));

		courseSections = dbSections.map((section) => ({
			...section,
			lessons: dbLessons.filter((lesson) => lesson.sectionId === section.id),
		}));
	}

	return (
		<main className="grid gap-6">
			<PageHeader title={t("lessons.title")} />
			<div className="grid gap-4 lg:grid-cols-4">
				<div className="flex flex-col gap-2">
					<h3 className="font-semibold mb-2">My Courses</h3>
					{enrolledCourses.length === 0 ? (
						<div className="text-muted-foreground text-sm">No courses with lessons.</div>
					) : (
						enrolledCourses.map((course) => (
							<a
								key={course.id}
								href={`?courseId=${course.id}`}
								className={`block p-3 rounded-lg border ${selectedCourseId === course.id ? "bg-muted" : "hover:bg-muted/50"}`}
							>
								{course.name}
							</a>
						))
					)}
				</div>
				<div className="lg:col-span-3 grid gap-6">
					{selectedCourseId && courseSections.length > 0 ? (
						courseSections.map((section) => (
							<div key={section.id}>
								<h4 className="font-semibold text-lg mb-3">{section.title}</h4>
								<div className="grid gap-3">
									{section.lessons.map((lesson) => (
										<Card
											key={lesson.id}
											className="hover:bg-muted/50 cursor-pointer transition-colors"
										>
											<CardContent className="p-4">{lesson.title}</CardContent>
										</Card>
									))}
								</div>
							</div>
						))
					) : selectedCourseId ? (
						<Card>
							<CardContent className="p-8 text-center text-muted-foreground">
								No content available yet.
							</CardContent>
						</Card>
					) : null}
				</div>
			</div>
		</main>
	);
}
