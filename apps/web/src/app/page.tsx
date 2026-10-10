import { schema } from "@zaydemy/db";
import {
	Alert,
	Badge,
	Button,
	ButtonLink,
	Card,
	CardContent,
	CardFooter,
	EmptyState,
	type Step,
	type StepState,
	Steps,
} from "@zaydemy/ui";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { ArrowRight, BookOpen, CircleCheck, ClipboardList, MapPin, Monitor } from "lucide-react";
import { redirect } from "next/navigation";
import { applicationStatusVariant } from "@/components/application-status";
import { SiteShell } from "@/components/shell/site-shell";
import { applyToCourse } from "@/server/applications";
import { getLocale, getTranslator } from "@/server/i18n";
import { getPluginSession } from "@/server/session";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

async function apply(form: FormData) {
	"use server";
	const session = await getPluginSession();
	if (!session) redirect("/auth/sign-in?mode=sign-up");
	const result = await applyToCourse(session.user.id, String(form.get("courseId")));
	redirect(result.ok ? "/?applied=1" : `/?error=${result.error}`);
}

const stepState: Record<string, StepState> = {
	pending: "upcoming",
	active: "current",
	completed: "done",
	skipped: "skipped",
	failed: "failed",
};

async function loadCourses() {
	const { db } = getZaydemy();
	return db
		.select({
			id: schema.courses.id,
			name: schema.courses.name,
			description: schema.courses.description,
			deliveryModes: schema.courses.deliveryModes,
			category: schema.courseCategories.name,
		})
		.from(schema.courses)
		.innerJoin(schema.courseCategories, eq(schema.courseCategories.id, schema.courses.categoryId))
		.where(and(eq(schema.courses.isOpen, true), isNull(schema.courses.archivedAt)))
		.orderBy(schema.courses.name);
}

async function loadApplications(userId: string) {
	const { db } = getZaydemy();
	const applications = await db
		.select({
			id: schema.applications.id,
			reference: schema.applications.reference,
			status: schema.applications.status,
			pipeline: schema.applications.pipeline,
			currentStage: schema.applications.currentStage,
			courseId: schema.applications.courseId,
			course: schema.courses.name,
			createdAt: schema.applications.createdAt,
		})
		.from(schema.applications)
		.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
		.where(eq(schema.applications.userId, userId))
		.orderBy(desc(schema.applications.createdAt));
	const stages =
		applications.length === 0
			? []
			: await db
					.select({
						applicationId: schema.applicationStages.applicationId,
						stage: schema.applicationStages.stage,
						status: schema.applicationStages.status,
					})
					.from(schema.applicationStages)
					.where(
						inArray(
							schema.applicationStages.applicationId,
							applications.map((a) => a.id),
						),
					);
	return applications.map((application) => ({
		...application,
		stageStatus: new Map(
			stages.filter((s) => s.applicationId === application.id).map((s) => [s.stage, s.status]),
		),
	}));
}

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; applied?: string }>;
}) {
	const [t, locale, session, { error, applied }] = await Promise.all([
		getTranslator(),
		getLocale(),
		getPluginSession(),
		searchParams,
	]);
	const [courses, applications, user] = await Promise.all([
		loadCourses(),
		session ? loadApplications(session.user.id) : [],
		session
			? getZaydemy()
					.db.select({ limit: schema.users.applicationLimit })
					.from(schema.users)
					.where(eq(schema.users.id, session.user.id))
					.then((rows) => rows[0])
			: undefined,
	]);
	const appliedCourses = new Set(
		applications.filter((a) => a.status === "in_progress").map((a) => a.courseId),
	);
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

	const courseList = (
		<section className="grid gap-4">
			<div>
				<h2 className="font-semibold text-lg">{t("home.courses")}</h2>
				<p className="text-muted-foreground text-sm">{t("home.coursesHint")}</p>
			</div>
			{error === "limit_reached" ? (
				<Alert variant="warning">{t("home.limitReached", { limit: user?.limit ?? 1 })}</Alert>
			) : error === "course_closed" ? (
				<Alert variant="warning">{t("home.courseClosed")}</Alert>
			) : null}
			{courses.length === 0 ? (
				<EmptyState icon={<BookOpen />} title={t("home.noCourses")} />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{courses.map((course) => (
						<Card key={course.id} className="flex flex-col overflow-hidden">
							<CardContent className="flex flex-1 flex-col gap-3">
								<p className="font-medium text-primary text-xs uppercase tracking-wide">
									{course.category}
								</p>
								<h3 className="font-semibold text-lg leading-snug">{course.name}</h3>
								{course.description ? (
									<p className="line-clamp-3 text-muted-foreground text-sm">{course.description}</p>
								) : null}
								<div className="mt-auto flex flex-wrap gap-1.5 pt-1">
									{course.deliveryModes.map((mode) => (
										<Badge key={mode} variant="secondary">
											{mode === "online" ? <Monitor /> : <MapPin />}
											{t(`course.deliveryMode.${mode}`)}
										</Badge>
									))}
								</div>
							</CardContent>
							<CardFooter className="justify-end">
								{appliedCourses.has(course.id) ? (
									<Badge variant="success">
										<CircleCheck />
										{t("home.alreadyApplied")}
									</Badge>
								) : (
									<form action={apply}>
										<input type="hidden" name="courseId" value={course.id} />
										<Button type="submit" size="sm">
											{t("home.apply")}
											<ArrowRight />
										</Button>
									</form>
								)}
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</section>
	);

	if (!session) {
		return (
			<SiteShell>
				<main className="grid gap-14">
					<section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-12 sm:px-12 sm:py-16">
						<div
							aria-hidden
							className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/10 blur-3xl"
						/>
						<div className="relative grid max-w-2xl justify-items-start gap-4">
							<Badge>{resolvedConfig.brand.name}</Badge>
							<h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
								{t("home.heroTitle")}
							</h1>
							<p className="text-lg text-muted-foreground">{t("home.heroText")}</p>
							<div className="mt-2 flex flex-wrap gap-3">
								<ButtonLink href="/auth/sign-in?mode=sign-up" size="lg">
									{t("home.heroCta")}
									<ArrowRight />
								</ButtonLink>
								<ButtonLink href="/auth/sign-in" size="lg" variant="outline">
									{t("common.signIn")}
								</ButtonLink>
							</div>
						</div>
					</section>
					{courseList}
				</main>
			</SiteShell>
		);
	}

	return (
		<SiteShell>
			<main className="grid gap-12">
				<div className="grid gap-1">
					<h1 className="font-semibold text-2xl tracking-tight">
						{t("home.welcome", { name: session.user.name })}
					</h1>
					<p className="text-muted-foreground">{t("home.welcomeHint")}</p>
				</div>

				<section className="grid gap-4">
					<h2 className="font-semibold text-lg">{t("home.myApplications")}</h2>
					{applied ? <Alert variant="success">{t("home.applied")}</Alert> : null}
					{applications.length === 0 ? (
						<EmptyState
							icon={<ClipboardList />}
							title={t("home.noApplications")}
							description={t("home.noApplicationsHint")}
						/>
					) : (
						<div className="grid gap-4">
							{applications.map((application) => {
								const current = application.currentStage
									? resolvedConfig.stages.get(application.currentStage)
									: undefined;
								const steps: Step[] = application.pipeline.map((id) => ({
									id,
									label: t(resolvedConfig.stages.get(id)?.label ?? id),
									state: stepState[application.stageStatus.get(id) ?? "pending"] ?? "upcoming",
								}));
								return (
									<Card key={application.id} className="overflow-hidden">
										<CardContent className="grid gap-6">
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div className="grid gap-1">
													<h3 className="font-semibold text-lg leading-snug">
														{application.course}
													</h3>
													<p className="text-muted-foreground text-sm">
														{t("home.reference")}:{" "}
														<span className="font-mono text-foreground">
															{application.reference}
														</span>
														{" · "}
														{dateFormat.format(application.createdAt)}
													</p>
												</div>
												<Badge variant={applicationStatusVariant[application.status]}>
													{t(`application.status.${application.status}`)}
												</Badge>
											</div>
											{steps.length > 0 ? <Steps steps={steps} /> : null}
										</CardContent>
										{application.status === "in_progress" && current ? (
											<CardFooter className="flex-wrap justify-between">
												<p className="text-sm">
													<span className="text-muted-foreground">{t("home.currentStage")}: </span>
													<span className="font-medium">{t(current.label)}</span>
												</p>
												{current.applicantHref ? (
													<ButtonLink href={current.applicantHref} size="sm">
														{t("home.goToStage")}
														<ArrowRight />
													</ButtonLink>
												) : (
													<p className="text-muted-foreground text-sm">
														{t("home.waitingForStaff")}
													</p>
												)}
											</CardFooter>
										) : application.status === "enrolled" ? (
											<CardFooter>
												<p className="flex items-center gap-2 text-sm text-success-strong">
													<CircleCheck className="size-4" />
													{t("home.enrolledHint")}
												</p>
											</CardFooter>
										) : null}
									</Card>
								);
							})}
						</div>
					)}
				</section>

				{courseList}
			</main>
		</SiteShell>
	);
}
