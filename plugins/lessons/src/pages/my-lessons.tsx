import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema as coreSchema } from "@zaydemy/db";
import {
	Button,
	Card,
	CardContent,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { and, asc, eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { lessonAttachments, lessons, sections } from "../schema";
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

	const selectedLessonId = typeof searchParams.lessonId === "string" ? searchParams.lessonId : null;
	let courseSections: {
		id: string;
		title: string;
		order: number;
		lessons: { id: string; title: string; order: number; body: string | null }[];
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

	let activeLesson = null;
	let attachments: {
		id: string;
		name: string;
		size: number;
		fileKey: string;
		lessonId: string;
		type: string;
		createdAt: Date;
	}[] = [];
	if (selectedLessonId) {
		const foundLesson = await db.select().from(lessons).where(eq(lessons.id, selectedLessonId));
		if (foundLesson[0]?.isPublished) {
			activeLesson = foundLesson[0];
			attachments = await db
				.select()
				.from(lessonAttachments)
				.where(eq(lessonAttachments.lessonId, selectedLessonId))
				.orderBy(asc(lessonAttachments.createdAt));
		}
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

					{selectedCourseId && courseSections.length > 0 && (
						<div className="mt-4 pt-4 border-t">
							<h4 className="font-semibold text-sm mb-2 text-muted-foreground">Course Content</h4>
							{courseSections.map((section) => (
								<div key={section.id} className="mb-4">
									<div className="font-medium text-sm mb-1">{section.title}</div>
									<div className="flex flex-col gap-1 pl-2 border-l-2">
										{section.lessons.map((lesson) => (
											<a
												key={lesson.id}
												href={`?courseId=${selectedCourseId}&lessonId=${lesson.id}`}
												className={`text-sm py-1 px-2 rounded hover:bg-muted/50 ${selectedLessonId === lesson.id ? "font-semibold bg-muted" : "text-muted-foreground"}`}
											>
												{lesson.title}
											</a>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
				<div className="lg:col-span-3 grid gap-6">
					{activeLesson ? (
						<div className="space-y-8">
							<Card>
								<CardContent className="p-8 prose dark:prose-invert max-w-none">
									<h1>{activeLesson.title}</h1>
									{/* Sanitizing LMS content to prevent XSS */}
									<div
										// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized LMS course content
										dangerouslySetInnerHTML={{
											__html: activeLesson.body ? sanitizeHtml(activeLesson.body) : "No content.",
										}}
									/>
								</CardContent>
							</Card>

							{attachments.length > 0 && (
								<Card>
									<CardContent className="p-6">
										<h3 className="font-semibold text-lg mb-4">Attachments</h3>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>File</TableHead>
													<TableHead>Size</TableHead>
													<TableHead className="text-right">Action</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{attachments.map((att) => (
													<TableRow key={att.id}>
														<TableCell className="font-medium">{att.name}</TableCell>
														<TableCell className="text-muted-foreground">
															{Math.round(att.size / 1024)} KB
														</TableCell>
														<TableCell className="text-right">
															<Button variant="outline" size="sm">
																Download
															</Button>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</CardContent>
								</Card>
							)}
						</div>
					) : selectedCourseId && courseSections.length > 0 ? (
						courseSections.map((section) => (
							<div key={section.id}>
								<h4 className="font-semibold text-lg mb-3">{section.title}</h4>
								<div className="grid gap-3">
									{section.lessons.map((lesson) => (
										<Card
											key={lesson.id}
											className="hover:bg-muted/50 cursor-pointer transition-colors"
										>
											<CardContent className="p-4 flex justify-between items-center">
												{lesson.title}
												<a
													href={`?courseId=${selectedCourseId}&lessonId=${lesson.id}`}
													className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-muted h-9 px-3 border"
												>
													Start
												</a>
											</CardContent>{" "}
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
