import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema as coreSchema } from "@zaydemy/db";
import {
	Badge,
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
import { asc, eq } from "drizzle-orm";
import { lessons, sections } from "../schema";

export default async function AdminLessonsPage({ t, searchParams }: PluginPageProps) {
	const { db } = runtime();
	const courses = await db.select().from(coreSchema.courses);

	const selectedCourseId =
		typeof searchParams.courseId === "string" ? searchParams.courseId : courses[0]?.id;

	let courseSections: {
		id: string;
		title: string;
		order: number;
		lessons: { id: string; title: string; order: number; isPublished: boolean }[];
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
						courseSections.length === 0 ? (
							<Card>
								<CardContent className="p-8 text-center text-muted-foreground">
									No sections or lessons found. (Editing feature coming soon)
								</CardContent>
							</Card>
						) : (
							courseSections.map((section) => (
								<Card key={section.id}>
									<CardContent className="p-0">
										<div className="bg-muted p-4 border-b font-medium">{section.title}</div>
										{section.lessons.length > 0 ? (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Lesson</TableHead>
														<TableHead>Status</TableHead>
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
						)
					) : null}
				</div>
			</div>
		</main>
	);
}
