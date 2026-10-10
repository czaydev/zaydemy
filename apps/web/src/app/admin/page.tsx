import { schema } from "@zaydemy/db";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	EmptyState,
	Icon,
	PageHeader,
	Stat,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { count, desc, eq, gte } from "drizzle-orm";
import { ChevronRight, CircleCheck, ClipboardList, Inbox, Loader, UserPlus } from "lucide-react";
import { applicationStatusVariant } from "@/components/application-status";
import { getLocale, getTranslator } from "@/server/i18n";
import { getPluginSession } from "@/server/session";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

/** Admin landing page: application numbers, where applicants are waiting, latest applications. */
export default async function AdminHomePage() {
	const [t, locale, session] = await Promise.all([
		getTranslator(),
		getLocale(),
		getPluginSession(),
	]);
	const { db } = getZaydemy();
	const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const a = schema.applications;

	const [byStatus, [lastWeek], byStage, latest] = await Promise.all([
		db.select({ status: a.status, value: count() }).from(a).groupBy(a.status),
		db.select({ value: count() }).from(a).where(gte(a.createdAt, weekAgo)),
		db
			.select({ stage: a.currentStage, value: count() })
			.from(a)
			.where(eq(a.status, "in_progress"))
			.groupBy(a.currentStage)
			.orderBy(desc(count())),
		db
			.select({
				id: a.id,
				reference: a.reference,
				status: a.status,
				currentStage: a.currentStage,
				createdAt: a.createdAt,
				applicant: schema.users.name,
				email: schema.users.email,
				course: schema.courses.name,
			})
			.from(a)
			.innerJoin(schema.users, eq(schema.users.id, a.userId))
			.innerJoin(schema.courses, eq(schema.courses.id, a.courseId))
			.orderBy(desc(a.createdAt))
			.limit(8),
	]);

	const statusCount = (status: string) => byStatus.find((r) => r.status === status)?.value ?? 0;
	const total = byStatus.reduce((sum, r) => sum + r.value, 0);
	const waiting = byStage.filter((r) => r.stage);
	const maxWaiting = Math.max(1, ...waiting.map((r) => r.value));
	const number = new Intl.NumberFormat(locale);
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
	const shortcuts = resolvedConfig.adminNav.filter(
		(item) => !item.permission || session?.permissions.includes(item.permission),
	);

	return (
		<main>
			<PageHeader
				title={t("adminHome.title")}
				description={t("adminHome.welcome", { name: session?.user.name ?? "" })}
			/>

			<div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
				<Stat label={t("adminHome.total")} value={number.format(total)} icon={<ClipboardList />} />
				<Stat
					label={t("adminHome.inProgress")}
					value={number.format(statusCount("in_progress"))}
					icon={<Loader />}
				/>
				<Stat
					label={t("adminHome.enrolled")}
					value={number.format(statusCount("enrolled"))}
					icon={<CircleCheck />}
				/>
				<Stat
					label={t("adminHome.lastWeek")}
					value={number.format(lastWeek?.value ?? 0)}
					icon={<UserPlus />}
				/>
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle>{t("adminHome.byStage")}</CardTitle>
					</CardHeader>
					<CardContent>
						{waiting.length === 0 ? (
							<p className="text-muted-foreground text-sm">{t("adminHome.nobodyWaiting")}</p>
						) : (
							<ul className="grid gap-4">
								{waiting.map((row) => {
									const stage = row.stage ? resolvedConfig.stages.get(row.stage) : undefined;
									return (
										<li key={row.stage} className="grid gap-1.5">
											<div className="flex items-center justify-between text-sm">
												<span>{stage ? t(stage.label) : row.stage}</span>
												<span className="font-medium tabular-nums">{number.format(row.value)}</span>
											</div>
											<div className="h-2 overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary"
													style={{ width: `${(row.value / maxWaiting) * 100}%` }}
												/>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</CardContent>
				</Card>

				<div className="grid content-start gap-3 lg:col-span-2">
					<h2 className="font-semibold">{t("adminHome.latest")}</h2>
					{latest.length === 0 ? (
						<EmptyState icon={<Inbox />} title={t("adminHome.noApplications")} />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("adminHome.applicant")}</TableHead>
									<TableHead>{t("adminHome.course")}</TableHead>
									<TableHead>{t("adminHome.status")}</TableHead>
									<TableHead className="text-right">{t("adminHome.date")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{latest.map((row) => {
									const stage = row.currentStage
										? resolvedConfig.stages.get(row.currentStage)
										: undefined;
									return (
										<TableRow key={row.id}>
											<TableCell>
												<p className="font-medium">{row.applicant}</p>
												<p className="text-muted-foreground text-xs">{row.email}</p>
											</TableCell>
											<TableCell>
												<p>{row.course}</p>
												<p className="font-mono text-muted-foreground text-xs">{row.reference}</p>
											</TableCell>
											<TableCell>
												<div className="grid gap-1">
													<Badge variant={applicationStatusVariant[row.status]}>
														{t(`application.status.${row.status}`)}
													</Badge>
													{row.status === "in_progress" && stage ? (
														<span className="text-muted-foreground text-xs">{t(stage.label)}</span>
													) : null}
												</div>
											</TableCell>
											<TableCell className="whitespace-nowrap text-right text-muted-foreground">
												{dateFormat.format(row.createdAt)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</div>
			</div>

			{shortcuts.length > 0 ? (
				<section className="mt-10 grid gap-3">
					<h2 className="font-semibold">{t("adminHome.shortcuts")}</h2>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{shortcuts.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
							>
								<span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
									<Icon name={item.icon} className="size-4.5" />
								</span>
								<span className="flex-1 font-medium text-sm">{t(item.label)}</span>
								<ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
							</a>
						))}
					</div>
				</section>
			) : null}
		</main>
	);
}
