import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema as coreSchema } from "@zaydemy/db";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Input,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { asc, eq } from "drizzle-orm";
import { lessonAttachments, lessons, sections } from "../schema";
export default async function AdminLessonsPage({ t, searchParams }: PluginPageProps) {
	const { db } = runtime();
	const courses = await db.select().from(coreSchema.courses);

	const selectedCourseId =
		typeof searchParams.courseId === "string" ? searchParams.courseId : courses[0]?.id;

	let courseSections: {
		id: string;
		title: string;
		order: number;
		lessons: {
			id: string;
			title: string;
			order: number;
			isPublished: boolean;
			body: string | null;
		}[];
	}[] = [];

	if (selectedCourseId) {
		const dbSections = await db
			.select()
			.from(sections)
			.where(eq(sections.courseId, selectedCourseId))
			.orderBy(asc(sections.order));
		const dbLessons = await db.select().from(lessons).orderBy(asc(lessons.order));

		courseSections = dbSections.map((section) => ({
			...section,
			lessons: dbLessons.filter((lesson) => lesson.sectionId === section.id),
		}));
	}

	const editLessonId = searchParams.editLessonId as string | undefined;

	if (editLessonId) {
		const lessonResult = await db.select().from(lessons).where(eq(lessons.id, editLessonId));
		const lesson = lessonResult[0];

		if (!lesson) {
			return (
				<main>
					<PageHeader title="Lesson not found" />
				</main>
			);
		}

		const attachments = await db
			.select()
			.from(lessonAttachments)
			.where(eq(lessonAttachments.lessonId, editLessonId))
			.orderBy(asc(lessonAttachments.createdAt));

		return (
			<main className="grid gap-6 max-w-7xl mx-auto w-full">
				<PageHeader title={`Edit Lesson: ${lesson.title}`} />
				<form method="POST" action={`/api/lessons/${lesson.id}/update`}>
					<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm mb-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="block font-semibold" htmlFor="lesson-title">
									Lesson Title
								</label>
								<Input id="lesson-title" name="title" defaultValue={lesson.title} required />
							</div>
							<div className="space-y-1.5">
								<label className="block font-semibold" htmlFor="lesson-order">
									Display Order
								</label>
								<Input
									id="lesson-order"
									name="order"
									type="number"
									defaultValue={lesson.order.toString()}
									required
								/>
							</div>
							<div className="space-y-1.5 col-span-2">
								<label className="block font-semibold" htmlFor="lesson-body">
									Lesson Content (Markdown)
								</label>
								<textarea
									id="lesson-body"
									name="body"
									defaultValue={lesson.body || ""}
									className="w-full h-64 p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-mono text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-outline"
								></textarea>
							</div>
						</div>
						<div className="mt-4 pt-4 border-t flex justify-end gap-2">
							<Button variant="outline" type="button">
								Discard
							</Button>
							<Button type="submit">Save Changes</Button>
						</div>
					</section>
				</form>

				<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm space-y-4">
					<h2 className="font-semibold text-lg">Attachments</h2>
					<form
						method="POST"
						action={`/api/lessons/${lesson.id}/attachments`}
						encType="multipart/form-data"
					>
						<div className="flex gap-2 mb-4 items-center">
							<Input type="file" name="file" className="max-w-md" required />
							<Button type="submit">Upload</Button>
						</div>
					</form>
					{attachments.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>File Name</TableHead>
									<TableHead>Size (bytes)</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{attachments.map((att) => (
									<TableRow key={att.id}>
										<TableCell>{att.name}</TableCell>
										<TableCell>{att.size}</TableCell>
										<TableCell>{att.type}</TableCell>
										<TableCell className="text-right">
											<form
												method="POST"
												action={`/api/lessons/${lesson.id}/attachments/${att.id}/delete`}
											>
												<Button variant="destructive" size="sm" type="submit">
													Delete
												</Button>
											</form>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-muted-foreground text-sm">No attachments yet.</div>
					)}
				</section>
			</main>
		);
	}
	return (
		<main className="grid gap-6">
			<PageHeader title={t("lessons.title")} />
			<div className="grid gap-4 lg:grid-cols-4">
				<div className="flex flex-col gap-2">
					<h3 className="font-semibold mb-2">Courses</h3>
					{courses.map((course) => (
						<a
							key={course.id}
							href={`?courseId=${course.id}`}
							className={`block p-3 rounded-lg border ${selectedCourseId === course.id ? "bg-muted" : "hover:bg-muted/50"}`}
						>
							{course.name}
						</a>
					))}
				</div>
				<div className="lg:col-span-3 grid gap-6">
					{selectedCourseId ? (
						<div className="flex flex-col gap-4">
							<div className="flex justify-end">
								<Button size="sm">Add Section</Button>
							</div>
							{courseSections.length === 0 ? (
								<Card>
									<CardContent className="p-8 text-center text-muted-foreground">
										No sections or lessons found.
									</CardContent>
								</Card>
							) : (
								courseSections.map((section) => (
									<Card key={section.id}>
										<CardContent className="p-0">
											<div className="bg-muted p-4 border-b font-medium flex justify-between items-center">
												{section.title}
												<div className="flex gap-2">
													<Button variant="outline" size="sm">
														Edit Section
													</Button>
													<Button variant="secondary" size="sm">
														Add Lesson
													</Button>
												</div>
											</div>
											{section.lessons.length > 0 ? (
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Lesson</TableHead>
															<TableHead>Status</TableHead>
															<TableHead className="text-right">Actions</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{section.lessons.map((lesson) => (
															<TableRow key={lesson.id}>
																<TableCell>{lesson.title}</TableCell>
																<TableCell>
																	<Badge variant={lesson.isPublished ? "success" : "secondary"}>
																		{lesson.isPublished ? "Published" : "Draft"}
																	</Badge>
																</TableCell>
																<TableCell className="text-right">
																	<div className="flex justify-end gap-2">
																		<a
																			href={`?courseId=${selectedCourseId}&editLessonId=${lesson.id}`}
																			className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-muted h-9 px-3"
																		>
																			Edit
																		</a>
																		<Button variant="ghost" size="sm">
																			Delete
																		</Button>
																	</div>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											) : (
												<div className="p-4 text-sm text-muted-foreground">
													No lessons in this section.
												</div>
											)}
										</CardContent>
									</Card>
								))
							)}
						</div>
					) : null}
				</div>
			</div>
		</main>
	);
}
