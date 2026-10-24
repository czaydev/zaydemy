import { type PluginPageProps, runtime, type Translate } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Alert,
	Badge,
	Button,
	ButtonLink,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CheckboxField,
	Field,
	Input,
	PageHeader,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Textarea,
} from "@zaydemy/ui";
import { asc, eq } from "drizzle-orm";
import { adminHref } from "../index";
import { lessonAttachments } from "../schema";
import { courseContent } from "../service";

function ContentFields({
	t,
	prefix,
	value,
}: {
	t: Translate;
	prefix: string;
	value?: { title: string; order: number; isPublished: boolean; openAt: Date | null };
}) {
	return (
		<>
			<Field label={t("lessons.fields.title")} htmlFor={`${prefix}-title`}>
				<Input
					id={`${prefix}-title`}
					name="title"
					maxLength={200}
					defaultValue={value?.title}
					required
				/>
			</Field>
			<Field
				label={t("lessons.fields.order")}
				htmlFor={`${prefix}-order`}
				hint={t("lessons.orderHint")}
			>
				<Input
					id={`${prefix}-order`}
					name="order"
					type="number"
					min={0}
					max={2147483647}
					step={1}
					defaultValue={value?.order ?? 0}
					required
				/>
			</Field>
			<Field
				label={t("lessons.fields.openAt")}
				htmlFor={`${prefix}-openAt`}
				hint={t("lessons.openAtHint")}
			>
				<Input
					id={`${prefix}-openAt`}
					name="openAt"
					type="datetime-local"
					defaultValue={value?.openAt?.toISOString().slice(0, 16) ?? ""}
				/>
			</Field>
			<CheckboxField name="isPublished" defaultChecked={value?.isPublished ?? false}>
				{t("lessons.fields.published")}
			</CheckboxField>
		</>
	);
}

export default async function AdminLessonsPage({ t, session, searchParams }: PluginPageProps) {
	if (!session?.permissions.includes("lessons.manage")) return null;
	const { db } = runtime();
	const courses = await db
		.select({ id: schema.courses.id, name: schema.courses.name })
		.from(schema.courses)
		.orderBy(asc(schema.courses.name));
	const selectedCourseId =
		typeof searchParams.courseId === "string" ? searchParams.courseId : courses[0]?.id;
	const course = courses.find((row) => row.id === selectedCourseId);
	const content = course ? await courseContent(db, course.id) : [];
	const editLessonId =
		typeof searchParams.editLessonId === "string" ? searchParams.editLessonId : undefined;
	const lesson = content
		.flatMap((section) => section.lessons)
		.find((row) => row.id === editLessonId);
	const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
	const notice = error ? (
		<Alert variant="destructive">
			{t(error === "file" ? "lessons.errors.file" : "lessons.errors.invalid")}
		</Alert>
	) : null;

	if (editLessonId) {
		if (!course || !lesson)
			return (
				<main>
					<PageHeader
						title={t("lessons.notFound")}
						back={{ href: "/admin/lessons", label: t("lessons.title") }}
					/>
				</main>
			);
		const attachments = await db
			.select()
			.from(lessonAttachments)
			.where(eq(lessonAttachments.lessonId, lesson.id))
			.orderBy(asc(lessonAttachments.createdAt), asc(lessonAttachments.id));
		return (
			<main className="grid gap-6">
				<PageHeader
					title={t("lessons.editLesson")}
					description={lesson.title}
					back={{ href: adminHref(course.id), label: course.name }}
				/>
				{notice}
				<Card>
					<CardContent>
						<form
							method="post"
							action={`/api/lessons/${lesson.id}/update`}
							className="grid gap-4 sm:grid-cols-2"
						>
							<ContentFields t={t} prefix="lesson" value={lesson} />
							<Field
								label={t("lessons.section")}
								htmlFor="lesson-section"
								className="sm:col-span-2"
							>
								<Select id="lesson-section" name="sectionId" defaultValue={lesson.sectionId}>
									{content.map((section) => (
										<option key={section.id} value={section.id}>
											{section.title}
										</option>
									))}
								</Select>
							</Field>
							<Field
								label={t("lessons.fields.body")}
								htmlFor="lesson-body"
								className="sm:col-span-2"
							>
								<Textarea
									id="lesson-body"
									name="body"
									rows={16}
									maxLength={1_000_000}
									defaultValue={lesson.body ?? ""}
									className="font-mono"
								/>
							</Field>
							<div className="flex gap-2 sm:col-span-2">
								<Button type="submit">{t("lessons.save")}</Button>
								<ButtonLink href={adminHref(course.id)} variant="outline">
									{t("lessons.cancel")}
								</ButtonLink>
							</div>
						</form>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>{t("lessons.attachments")}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<form
							method="post"
							action={`/api/lessons/${lesson.id}/attachments`}
							encType="multipart/form-data"
							className="flex flex-wrap items-end gap-3"
						>
							<Field label={t("lessons.file")} htmlFor="attachment">
								<Input id="attachment" type="file" name="file" required />
							</Field>
							<Button type="submit">{t("lessons.upload")}</Button>
						</form>
						{attachments.length ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("lessons.file")}</TableHead>
										<TableHead>{t("lessons.size")}</TableHead>
										<TableHead>{t("lessons.actions")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{attachments.map((attachment) => (
										<TableRow key={attachment.id}>
											<TableCell>{attachment.name}</TableCell>
											<TableCell>{attachment.size.toLocaleString()} B</TableCell>
											<TableCell>
												<form
													method="post"
													action={`/api/lessons/${lesson.id}/attachments/${attachment.id}/delete`}
												>
													<Button type="submit" size="sm" variant="destructive">
														{t("lessons.remove")}
													</Button>
												</form>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className="text-muted-foreground text-sm">{t("lessons.noAttachments")}</p>
						)}
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<main className="grid gap-6">
			<PageHeader title={t("lessons.title")} />
			{notice}
			<form method="get" action="/admin/lessons" className="flex flex-wrap items-end gap-3">
				<Field label={t("lessons.course")} htmlFor="course">
					<Select id="course" name="courseId" defaultValue={course?.id}>
						{courses.map((row) => (
							<option key={row.id} value={row.id}>
								{row.name}
							</option>
						))}
					</Select>
				</Field>
				<Button type="submit" disabled={!courses.length}>
					{t("lessons.view")}
				</Button>
			</form>
			{!course ? (
				<p className="text-muted-foreground">{t("lessons.noCourses")}</p>
			) : (
				<>
					<Card>
						<CardHeader>
							<CardTitle>{t("lessons.addSection")}</CardTitle>
						</CardHeader>
						<CardContent>
							<form
								method="post"
								action="/api/lessons/sections"
								className="grid gap-4 sm:grid-cols-2"
							>
								<input type="hidden" name="courseId" value={course.id} />
								<ContentFields t={t} prefix="new-section" />
								<div className="sm:col-span-2">
									<Button type="submit">{t("lessons.addSection")}</Button>
								</div>
							</form>
						</CardContent>
					</Card>
					{!content.length ? (
						<p className="text-muted-foreground">{t("lessons.noContent")}</p>
					) : null}
					{content.map((section) => (
						<Card key={section.id}>
							<CardHeader>
								<CardTitle>{section.title}</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-5">
								<details>
									<summary className="cursor-pointer font-medium text-sm">
										{t("lessons.editSection")}
									</summary>
									<form
										method="post"
										action={`/api/lessons/sections/${section.id}/update`}
										className="mt-4 grid gap-4 sm:grid-cols-2"
									>
										<ContentFields t={t} prefix={section.id} value={section} />
										<div className="sm:col-span-2">
											<Button type="submit">{t("lessons.save")}</Button>
										</div>
									</form>
								</details>
								<div className="flex flex-wrap gap-2 text-sm">
									<Badge variant={section.isPublished ? "success" : "secondary"}>
										{t(section.isPublished ? "lessons.published" : "lessons.draft")}
									</Badge>
									{section.openAt ? (
										<span>
											{t("lessons.opensAt", {
												date: `${section.openAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
											})}
										</span>
									) : null}
								</div>
								{section.lessons.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("lessons.fields.order")}</TableHead>
												<TableHead>{t("lessons.lesson")}</TableHead>
												<TableHead>{t("lessons.status")}</TableHead>
												<TableHead>{t("lessons.fields.openAt")}</TableHead>
												<TableHead>{t("lessons.actions")}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{section.lessons.map((row) => (
												<TableRow key={row.id}>
													<TableCell>{row.order}</TableCell>
													<TableCell>{row.title}</TableCell>
													<TableCell>
														<Badge variant={row.isPublished ? "success" : "secondary"}>
															{t(row.isPublished ? "lessons.published" : "lessons.draft")}
														</Badge>
													</TableCell>
													<TableCell>
														{row.openAt
															? `${row.openAt.toISOString().slice(0, 16).replace("T", " ")} UTC`
															: t("lessons.immediate")}
													</TableCell>
													<TableCell>
														<ButtonLink
															href={adminHref(course.id, row.id)}
															variant="outline"
															size="sm"
														>
															{t("lessons.editLesson")}
														</ButtonLink>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<p className="text-muted-foreground text-sm">{t("lessons.noLessons")}</p>
								)}
								<details>
									<summary className="cursor-pointer font-medium text-sm">
										{t("lessons.addLesson")}
									</summary>
									<form
										method="post"
										action={`/api/lessons/sections/${section.id}/lessons`}
										className="mt-4 grid gap-4 sm:grid-cols-2"
									>
										<ContentFields t={t} prefix={`new-${section.id}`} />
										<div className="sm:col-span-2">
											<Button type="submit">{t("lessons.addLesson")}</Button>
										</div>
									</form>
								</details>
							</CardContent>
						</Card>
					))}
				</>
			)}
		</main>
	);
}
