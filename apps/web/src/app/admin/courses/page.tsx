import { CORE_PERMISSIONS } from "@zaydemy/core";
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
	EmptyState,
	Input,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { asc, count, eq } from "drizzle-orm";
import { BookOpen, Plus } from "lucide-react";
import { addCategory, setCourseState } from "@/server/actions/courses";
import { requirePermission } from "@/server/admin";
import { getTranslator } from "@/server/i18n";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

export default async function AdminCoursesPage({
	searchParams,
}: {
	searchParams: Promise<{ saved?: string }>;
}) {
	await requirePermission(CORE_PERMISSIONS.manageCourses);
	const [t, { saved }] = await Promise.all([getTranslator(), searchParams]);
	const { db } = getZaydemy();
	const c = schema.courses;
	const [courses, applications, categories] = await Promise.all([
		db
			.select({
				id: c.id,
				name: c.name,
				slug: c.slug,
				pipeline: c.pipeline,
				isOpen: c.isOpen,
				archivedAt: c.archivedAt,
				category: schema.courseCategories.name,
			})
			.from(c)
			.innerJoin(schema.courseCategories, eq(schema.courseCategories.id, c.categoryId))
			.orderBy(asc(c.archivedAt), asc(c.name)),
		db
			.select({ courseId: schema.applications.courseId, value: count() })
			.from(schema.applications)
			.groupBy(schema.applications.courseId),
		db.select().from(schema.courseCategories).orderBy(schema.courseCategories.name),
	]);
	// Precomputed for O(1) lookups during render to avoid O(n²) bottleneck
	const applicationCounts = new Map(applications.map((a) => [a.courseId, a.value]));
	const applicationCount = (id: string) => applicationCounts.get(id) ?? 0;

	return (
		<main className="grid gap-8">
			<div>
				<PageHeader
					title={t("courses.title")}
					description={t("courses.description")}
					actions={
						categories.length > 0 ? (
							<ButtonLink href="/admin/courses/new">
								<Plus />
								{t("courses.new")}
							</ButtonLink>
						) : null
					}
				/>
				{saved ? (
					<Alert variant="success" className="mb-4">
						{t("courses.saved")}
					</Alert>
				) : null}
				{courses.length === 0 ? (
					<EmptyState icon={<BookOpen />} title={t("courses.empty")} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("courses.name")}</TableHead>
								<TableHead>{t("courses.pipeline")}</TableHead>
								<TableHead className="text-right">{t("courses.applications")}</TableHead>
								<TableHead>{t("courses.state")}</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{courses.map((course) => {
								const pipeline = course.pipeline ?? "default";
								const stages = resolvedConfig.pipelines[pipeline] ?? [];
								const state = course.archivedAt ? "archived" : course.isOpen ? "open" : "closed";
								return (
									<TableRow key={course.id}>
										<TableCell>
											<a
												href={`/admin/courses/${course.id}`}
												className="font-medium hover:underline"
											>
												{course.name}
											</a>
											<p className="text-muted-foreground text-xs">{course.category}</p>
										</TableCell>
										<TableCell>
											<p className="font-mono text-xs">{pipeline}</p>
											<p className="text-muted-foreground text-xs">
												{stages.length === 0
													? t("courses.directEnrolment")
													: stages
															.map((id) => t(resolvedConfig.stages.get(id)?.label ?? id))
															.join(" → ")}
											</p>
										</TableCell>
										<TableCell className="text-right tabular-nums">
											<a
												href={`/admin/applications?course=${course.id}`}
												className="font-medium text-primary hover:underline"
											>
												{applicationCount(course.id)}
											</a>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													state === "open"
														? "success"
														: state === "closed"
															? "warning"
															: "secondary"
												}
											>
												{t(`courses.states.${state}`)}
											</Badge>
										</TableCell>
										<TableCell>
											<form action={setCourseState} className="flex justify-end gap-2">
												<input type="hidden" name="id" value={course.id} />
												{state === "archived" ? (
													<Button
														type="submit"
														name="action"
														value="restore"
														size="sm"
														variant="outline"
													>
														{t("courses.restore")}
													</Button>
												) : (
													<>
														<Button
															type="submit"
															name="action"
															value={course.isOpen ? "close" : "open"}
															size="sm"
															variant="outline"
														>
															{t(course.isOpen ? "courses.close" : "courses.open")}
														</Button>
														<Button
															type="submit"
															name="action"
															value="archive"
															size="sm"
															variant="ghost"
														>
															{t("courses.archive")}
														</Button>
													</>
												)}
												<ButtonLink
													href={`/admin/courses/${course.id}`}
													size="sm"
													variant="secondary"
												>
													{t("courses.edit")}
												</ButtonLink>
											</form>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</div>

			<Card className="max-w-xl">
				<CardHeader>
					<CardTitle>{t("courses.categories")}</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4">
					{categories.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{categories.map((category) => (
								<Badge key={category.id} variant="secondary">
									{category.name}
								</Badge>
							))}
						</div>
					) : (
						<p className="text-muted-foreground text-sm">{t("courses.needCategory")}</p>
					)}
					<form action={addCategory} className="flex gap-2">
						<Input
							name="name"
							placeholder={t("courses.categoryName")}
							aria-label={t("courses.categoryName")}
							required
						/>
						<Button type="submit" variant="outline">
							{t("courses.addCategory")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
