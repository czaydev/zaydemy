import { type PluginPageProps, runtime } from "@zaydemy/core";
import { ButtonLink, Card, CardContent, PageHeader } from "@zaydemy/ui";
import { asc, eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { lessonAttachments } from "../schema";
import { courseContent, enrolledCourses, readableLesson } from "../service";

export default async function MyLessonsPage({ t, session, searchParams }: PluginPageProps) {
	if (!session) return null;
	const { db } = runtime();
	const courses = await enrolledCourses(db, session.user.id);
	const lessonId = typeof searchParams.lessonId === "string" ? searchParams.lessonId : undefined;
	const requestedLesson = lessonId
		? await readableLesson(db, session.user.id, lessonId)
		: undefined;
	const courseId =
		typeof searchParams.courseId === "string"
			? searchParams.courseId
			: (requestedLesson?.courseId ?? courses[0]?.id);
	const course = courses.find((row) => row.id === courseId);
	const content = course ? await courseContent(db, course.id, session.user.id) : [];
	const activeLesson =
		requestedLesson?.courseId === course?.id ? requestedLesson?.lesson : undefined;
	const attachments = activeLesson
		? await db
				.select()
				.from(lessonAttachments)
				.where(eq(lessonAttachments.lessonId, activeLesson.id))
				.orderBy(asc(lessonAttachments.createdAt), asc(lessonAttachments.id))
		: [];
	const href = (id: string, selectedLesson?: string) =>
		`/lessons?${new URLSearchParams({ courseId: id, ...(selectedLesson ? { lessonId: selectedLesson } : {}) })}`;

	return (
		<main className="grid gap-6">
			<PageHeader title={t("lessons.title")} />
			<div className="grid gap-6 lg:grid-cols-4">
				<nav aria-label={t("lessons.myCourses")} className="grid content-start gap-3">
					<h2 className="font-semibold">{t("lessons.myCourses")}</h2>
					{!courses.length ? (
						<p className="text-muted-foreground text-sm">{t("lessons.noEnrolledCourses")}</p>
					) : null}
					{courses.map((row) => (
						<a
							key={row.id}
							href={href(row.id)}
							aria-current={row.id === course?.id ? "page" : undefined}
							className={`rounded-lg border p-3 text-sm hover:bg-muted ${row.id === course?.id ? "bg-muted font-medium" : ""}`}
						>
							{row.name}
						</a>
					))}
					{content.map((section) => (
						<div key={section.id} className="grid gap-2 border-t pt-3">
							<h3 className="font-medium text-sm">{section.title}</h3>
							{section.lessons.map((lesson) => (
								<a
									key={lesson.id}
									href={href(section.courseId, lesson.id)}
									aria-current={lesson.id === activeLesson?.id ? "page" : undefined}
									className={`rounded px-2 py-1 text-sm hover:bg-muted ${lesson.id === activeLesson?.id ? "bg-muted font-semibold" : "text-muted-foreground"}`}
								>
									{lesson.title}
								</a>
							))}
						</div>
					))}
				</nav>
				<div className="grid content-start gap-6 lg:col-span-3">
					{lessonId && !activeLesson ? (
						<p role="status" className="text-muted-foreground">
							{t("lessons.notFound")}
						</p>
					) : activeLesson ? (
						<>
							<Card>
								<CardContent className="grid gap-4">
									<h2 className="font-semibold text-xl">{activeLesson.title}</h2>
									<div
										className="prose max-w-none dark:prose-invert"
										// biome-ignore lint/security/noDangerouslySetInnerHtml: LMS content sanitized with sanitize-html
										dangerouslySetInnerHTML={{
											__html: sanitizeHtml(activeLesson.body || t("lessons.emptyBody")),
										}}
									/>
								</CardContent>
							</Card>
							{attachments.length ? (
								<Card>
									<CardContent className="grid gap-3">
										<h3 className="font-semibold">{t("lessons.attachments")}</h3>
										{attachments.map((file) => (
											<div
												key={file.id}
												className="flex flex-wrap items-center justify-between gap-3"
											>
												<span className="break-all text-sm">
													{file.name} ({Math.ceil(file.size / 1024)} KB)
												</span>
												<ButtonLink
													href={`/api/lessons/attachments/${file.id}/download`}
													variant="outline"
													size="sm"
												>
													{t("lessons.download")}
												</ButtonLink>
											</div>
										))}
									</CardContent>
								</Card>
							) : null}
						</>
					) : !course || !content.length ? (
						<p className="text-muted-foreground">{t("lessons.noContent")}</p>
					) : (
						content.map((section) => (
							<Card key={section.id}>
								<CardContent className="grid gap-4">
									<h2 className="font-semibold">{section.title}</h2>
									{!section.lessons.length ? (
										<p className="text-muted-foreground text-sm">{t("lessons.noLessons")}</p>
									) : (
										section.lessons.map((lesson) => (
											<div
												key={lesson.id}
												className="flex items-center justify-between gap-4 border-t pt-3"
											>
												<span className="text-sm">{lesson.title}</span>
												<ButtonLink
													href={href(section.courseId, lesson.id)}
													variant="outline"
													size="sm"
												>
													{t("lessons.start")}
												</ButtonLink>
											</div>
										))
									)}
								</CardContent>
							</Card>
						))
					)}
				</div>
			</div>
		</main>
	);
}
