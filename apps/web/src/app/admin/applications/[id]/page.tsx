import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Alert,
	Avatar,
	Badge,
	type BadgeVariant,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	DetailList,
	Input,
	PageHeader,
	type Step,
	type StepState,
	Steps,
} from "@zaydemy/ui";
import { asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import { applicationStatusVariant } from "@/components/application-status";
import { ConfirmButton } from "@/components/confirm-button";
import { changeApplication } from "@/server/actions/applications";
import { requirePermission } from "@/server/admin";
import { getLocale, getTranslator } from "@/server/i18n";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

const stepState: Record<string, StepState> = {
	pending: "upcoming",
	active: "current",
	completed: "done",
	skipped: "skipped",
	failed: "failed",
};

const stageVariant: Record<string, BadgeVariant> = {
	pending: "secondary",
	active: "default",
	completed: "success",
	skipped: "secondary",
	failed: "destructive",
};

/** One application: applicant, stage progress, history and staff actions. */
export default async function AdminApplicationPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const session = await requirePermission(CORE_PERMISSIONS.viewApplications);
	const [t, locale, { id }, { error }] = await Promise.all([
		getTranslator(),
		getLocale(),
		params,
		searchParams,
	]);
	const { db } = getZaydemy();
	const actor = alias(schema.users, "actor");

	const [row] = await db
		.select({
			application: schema.applications,
			course: schema.courses.name,
			user: {
				id: schema.users.id,
				name: schema.users.name,
				email: schema.users.email,
				phoneNumber: schema.users.phoneNumber,
				city: schema.users.city,
				createdAt: schema.users.createdAt,
			},
		})
		.from(schema.applications)
		.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
		.innerJoin(schema.users, eq(schema.users.id, schema.applications.userId))
		.where(eq(schema.applications.id, id));
	if (!row) notFound();
	const { application, user } = row;

	const [stages, events] = await Promise.all([
		db
			.select()
			.from(schema.applicationStages)
			.where(eq(schema.applicationStages.applicationId, id))
			.orderBy(asc(schema.applicationStages.createdAt)),
		db
			.select({
				id: schema.applicationEvents.id,
				type: schema.applicationEvents.type,
				stage: schema.applicationEvents.stage,
				payload: schema.applicationEvents.payload,
				createdAt: schema.applicationEvents.createdAt,
				actor: actor.name,
			})
			.from(schema.applicationEvents)
			.leftJoin(actor, eq(actor.id, schema.applicationEvents.actorId))
			.where(eq(schema.applicationEvents.applicationId, id))
			.orderBy(desc(schema.applicationEvents.createdAt)),
	]);

	const stageRow = (stageId: string) => stages.find((s) => s.stage === stageId);
	const stageLabel = (stageId: string | null) =>
		stageId ? t(resolvedConfig.stages.get(stageId)?.label ?? stageId) : "";
	const steps: Step[] = application.pipeline.map((stageId) => ({
		id: stageId,
		label: stageLabel(stageId),
		state: stepState[stageRow(stageId)?.status ?? "pending"] ?? "upcoming",
	}));
	const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
	const canManage = session.permissions.includes(CORE_PERMISSIONS.manageApplications);
	const open = application.status === "in_progress";

	return (
		<main>
			<PageHeader
				back={{ href: "/admin/applications", label: t("applications.title") }}
				title={row.course}
				description={
					<>
						{t("home.reference")}: <span className="font-mono">{application.reference}</span>
						{" · "}
						{dateTime.format(application.createdAt)}
					</>
				}
				actions={
					<Badge
						variant={applicationStatusVariant[application.status]}
						className="px-3 py-1 text-sm"
					>
						{t(`application.status.${application.status}`)}
					</Badge>
				}
			/>
			{error ? (
				<Alert variant="warning" className="mb-6">
					{t("applications.notInProgress")}
				</Alert>
			) : null}

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="grid content-start gap-6 lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>{t("applications.progress")}</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-6">
							{steps.length > 0 ? (
								<Steps steps={steps} />
							) : (
								<p className="text-muted-foreground text-sm">{t("applications.noStages")}</p>
							)}
							{steps.length > 0 ? (
								<ul className="divide-y rounded-lg border">
									{application.pipeline.map((stageId) => {
										const stage = stageRow(stageId);
										const status = stage?.status ?? "pending";
										return (
											<li
												key={stageId}
												className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
											>
												<span className="font-medium">{stageLabel(stageId)}</span>
												<span className="flex items-center gap-3">
													{(stage?.finishedAt ?? stage?.startedAt) ? (
														<span className="text-muted-foreground text-xs">
															{dateTime.format((stage.finishedAt ?? stage.startedAt) as Date)}
														</span>
													) : null}
													<Badge variant={stageVariant[status]}>
														{t(`applications.stageStatus.${status}`)}
													</Badge>
												</span>
											</li>
										);
									})}
								</ul>
							) : null}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t("applications.history")}</CardTitle>
						</CardHeader>
						<CardContent>
							<ol className="relative grid gap-5 border-l pl-5">
								{events.map((event) => (
									<li key={event.id} className="relative">
										<span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-card bg-primary" />
										<p className="text-sm">
											{t(`applications.events.${event.type}`, { stage: stageLabel(event.stage) })}
										</p>
										<p className="text-muted-foreground text-xs">
											{dateTime.format(event.createdAt)}
											{event.actor ? ` · ${event.actor}` : ""}
											{typeof event.payload.reason === "string" && event.payload.reason !== "staff"
												? ` · ${event.payload.reason}`
												: ""}
											{typeof event.payload.note === "string" ? ` · ${event.payload.note}` : ""}
										</p>
									</li>
								))}
							</ol>
						</CardContent>
					</Card>
				</div>

				<div className="grid content-start gap-6">
					<Card>
						<CardContent className="grid gap-5">
							<div className="flex items-center gap-3">
								<Avatar name={user.name} className="size-11 text-sm" />
								<div className="min-w-0">
									<p className="truncate font-semibold">{user.name}</p>
									<p className="truncate text-muted-foreground text-sm">{user.email}</p>
								</div>
							</div>
							<DetailList
								className="sm:grid-cols-1"
								items={[
									{ label: t("users.phone"), value: user.phoneNumber ?? "-" },
									{ label: t("users.city"), value: user.city ?? "-" },
									{ label: t("users.memberSince"), value: dateTime.format(user.createdAt) },
								]}
							/>
							{session.permissions.includes(CORE_PERMISSIONS.manageUsers) ? (
								<a
									href={`/admin/users/${user.id}`}
									className="font-medium text-primary text-sm hover:underline"
								>
									{t("applications.openUser")}
								</a>
							) : null}
						</CardContent>
					</Card>

					{canManage && open ? (
						<Card>
							<CardHeader>
								<CardTitle>{t("applications.actions")}</CardTitle>
							</CardHeader>
							<CardContent>
								<form action={changeApplication} className="grid gap-3">
									<input type="hidden" name="applicationId" value={application.id} />
									<Input
										name="note"
										placeholder={t("applications.note")}
										aria-label={t("applications.note")}
									/>
									{application.currentStage ? (
										<>
											<Button type="submit" name="action" value="complete">
												{t("applications.complete", {
													stage: stageLabel(application.currentStage),
												})}
											</Button>
											<ConfirmButton
												name="action"
												value="reject"
												variant="destructive"
												confirm={t("applications.confirmReject")}
											>
												{t("applications.reject")}
											</ConfirmButton>
										</>
									) : null}
									<ConfirmButton
										name="action"
										value="withdraw"
										variant="outline"
										confirm={t("applications.confirmWithdraw")}
									>
										{t("applications.withdraw")}
									</ConfirmButton>
									<p className="text-muted-foreground text-xs">{t("applications.actionsHint")}</p>
								</form>
							</CardContent>
						</Card>
					) : null}
				</div>
			</div>
		</main>
	);
}
