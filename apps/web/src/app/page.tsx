import { schema } from "@zaydemy/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { applyToCourse } from "@/server/applications";
import { getTranslator } from "@/server/i18n";
import { getPluginSession } from "@/server/session";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

async function apply(form: FormData) {
	"use server";
	const session = await getPluginSession();
	if (!session) redirect("/auth/sign-in");
	const result = await applyToCourse(session.user.id, String(form.get("courseId")));
	redirect(result.ok ? "/" : `/?error=${result.error}`);
}

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const [t, session, { error }] = await Promise.all([
		getTranslator(),
		getPluginSession(),
		searchParams,
	]);
	if (!session) {
		return (
			<main>
				<h1>{resolvedConfig.brand.name}</h1>
				<p>{t("home.signedOut")}</p>
				<a href="/auth/sign-in">{t("common.signIn")}</a>
			</main>
		);
	}

	const { db } = getZaydemy();
	const [applications, courses, [user]] = await Promise.all([
		db
			.select({
				id: schema.applications.id,
				reference: schema.applications.reference,
				status: schema.applications.status,
				currentStage: schema.applications.currentStage,
				course: schema.courses.name,
			})
			.from(schema.applications)
			.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
			.where(eq(schema.applications.userId, session.user.id))
			.orderBy(desc(schema.applications.createdAt)),
		db
			.select({
				id: schema.courses.id,
				name: schema.courses.name,
				description: schema.courses.description,
			})
			.from(schema.courses)
			.where(and(eq(schema.courses.isOpen, true), isNull(schema.courses.archivedAt)))
			.orderBy(schema.courses.name),
		db
			.select({ limit: schema.users.applicationLimit })
			.from(schema.users)
			.where(eq(schema.users.id, session.user.id)),
	]);

	return (
		<main>
			<h1>{t("home.welcome", { name: session.user.name })}</h1>
			<h2>{t("home.myApplications")}</h2>
			{applications.length === 0 ? <p>{t("home.noApplications")}</p> : null}
			<ul>
				{applications.map((a) => {
					const stage = a.currentStage ? resolvedConfig.stages.get(a.currentStage) : undefined;
					return (
						<li key={a.id}>
							{a.course} ({a.reference}) · {t(`application.status.${a.status}`)}
							{stage ? (
								<>
									{" · "}
									{t("home.currentStage")}: {t(stage.label)}
									{stage.applicantHref ? (
										<>
											{" · "}
											<a href={stage.applicantHref}>{t("home.goToStage")}</a>
										</>
									) : null}
								</>
							) : null}
						</li>
					);
				})}
			</ul>

			<h2>{t("home.courses")}</h2>
			{error === "limit_reached" ? (
				<p role="alert">{t("home.limitReached", { limit: user?.limit ?? 1 })}</p>
			) : null}
			{courses.length === 0 ? <p>{t("home.noCourses")}</p> : null}
			<ul>
				{courses.map((course) => (
					<li key={course.id}>
						<strong>{course.name}</strong>
						{course.description ? ` · ${course.description}` : null}
						<form action={apply}>
							<input type="hidden" name="courseId" value={course.id} />
							<button type="submit">{t("home.apply")}</button>
						</form>
					</li>
				))}
			</ul>
		</main>
	);
}
