import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Badge,
	Button,
	EmptyState,
	Input,
	LinkTabs,
	PageHeader,
	Pagination,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Inbox, Search } from "lucide-react";
import { applicationStatusVariant } from "@/components/application-status";
import { PAGE_SIZE, pageNumber, param, requirePermission } from "@/server/admin";
import { getLocale, getTranslator } from "@/server/i18n";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

const STATUSES = schema.applicationStatus.enumValues;
type Status = (typeof STATUSES)[number];

export default async function AdminApplicationsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	await requirePermission(CORE_PERMISSIONS.viewApplications);
	const [t, locale, params] = await Promise.all([getTranslator(), getLocale(), searchParams]);
	const { db } = getZaydemy();
	const a = schema.applications;

	const q = param(params.q);
	const status = STATUSES.find((s) => s === param(params.status)) as Status | undefined;
	const courseId = param(params.course);
	const stage = param(params.stage);
	const page = pageNumber(params.page);

	const filters: SQL[] = [];
	if (status) filters.push(eq(a.status, status));
	if (courseId) filters.push(eq(a.courseId, courseId));
	if (stage) filters.push(eq(a.currentStage, stage));
	if (q) {
		const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
		const match = or(
			ilike(schema.users.name, pattern),
			ilike(schema.users.email, pattern),
			ilike(a.reference, pattern),
		);
		if (match) filters.push(match);
	}
	const where = filters.length > 0 ? and(...filters) : undefined;

	const [rows, [total], courses] = await Promise.all([
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
			.where(where)
			.orderBy(desc(a.createdAt))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db
			.select({ value: count() })
			.from(a)
			.innerJoin(schema.users, eq(schema.users.id, a.userId))
			.where(where),
		db
			.select({ id: schema.courses.id, name: schema.courses.name })
			.from(schema.courses)
			.orderBy(schema.courses.name),
	]);

	const query = (overrides: Record<string, string | undefined>) => {
		const next = new URLSearchParams();
		const values = { q, status, course: courseId, stage, ...overrides };
		for (const [key, value] of Object.entries(values)) if (value) next.set(key, value);
		const text = next.toString();
		return text ? `/admin/applications?${text}` : "/admin/applications";
	};
	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

	return (
		<main>
			<PageHeader title={t("applications.title")} description={t("applications.description")} />
			<LinkTabs
				className="mb-4"
				items={[
					{ href: query({ status: undefined }), label: t("applications.all"), active: !status },
					...STATUSES.map((s) => ({
						href: query({ status: s }),
						label: t(`application.status.${s}`),
						active: s === status,
					})),
				]}
			/>
			<form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/applications">
				{status ? <input type="hidden" name="status" value={status} /> : null}
				<div className="relative min-w-60 flex-1">
					<Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
					<Input
						name="q"
						defaultValue={q}
						placeholder={t("applications.search")}
						className="pl-9"
						aria-label={t("applications.search")}
					/>
				</div>
				<Select
					name="course"
					defaultValue={courseId ?? ""}
					className="w-auto"
					aria-label={t("applications.course")}
				>
					<option value="">{t("applications.allCourses")}</option>
					{courses.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</Select>
				<Select
					name="stage"
					defaultValue={stage ?? ""}
					className="w-auto"
					aria-label={t("applications.stage")}
				>
					<option value="">{t("applications.allStages")}</option>
					{[...resolvedConfig.stages.values()].map((s) => (
						<option key={s.id} value={s.id}>
							{t(s.label)}
						</option>
					))}
				</Select>
				<Button type="submit" variant="secondary">
					{t("applications.filter")}
				</Button>
			</form>

			{rows.length === 0 ? (
				<EmptyState icon={<Inbox />} title={t("applications.empty")} />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("applications.applicant")}</TableHead>
							<TableHead>{t("applications.course")}</TableHead>
							<TableHead>{t("applications.status")}</TableHead>
							<TableHead className="text-right">{t("applications.date")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => {
							const current = row.currentStage
								? resolvedConfig.stages.get(row.currentStage)
								: undefined;
							return (
								<TableRow key={row.id} className="relative">
									<TableCell>
										<a
											href={`/admin/applications/${row.id}`}
											className="font-medium after:absolute after:inset-0 hover:underline"
										>
											{row.applicant}
										</a>
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
											{row.status === "in_progress" && current ? (
												<span className="text-muted-foreground text-xs">{t(current.label)}</span>
											) : null}
										</div>
									</TableCell>
									<TableCell className="whitespace-nowrap text-right text-muted-foreground">
										{date.format(row.createdAt)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			)}
			<Pagination
				page={page}
				pageSize={PAGE_SIZE}
				total={total?.value ?? 0}
				href={(p) => {
					const base = query({});
					return `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
				}}
				labels={{ previous: t("common.previous"), next: t("common.next") }}
			/>
		</main>
	);
}
