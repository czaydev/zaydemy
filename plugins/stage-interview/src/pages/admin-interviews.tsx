import { type PluginPageProps, runtime } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Alert,
	Badge,
	type BadgeVariant,
	Button,
	EmptyState,
	Icon,
	Input,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { desc, eq } from "drizzle-orm";
import { interviews } from "../schema";

const statusVariant: Record<string, BadgeVariant> = {
	pending: "warning",
	scheduled: "default",
	passed: "success",
	failed: "destructive",
	no_show: "destructive",
	canceled: "secondary",
};

/** Admin list of interviews, newest first; open ones can be marked passed or failed. */
export default async function AdminInterviewsPage({ searchParams, locale, t }: PluginPageProps) {
	const { db } = runtime();
	const rows = await db
		.select({
			id: interviews.id,
			applicationId: interviews.applicationId,
			status: interviews.status,
			scheduledAt: interviews.scheduledAt,
			reference: schema.applications.reference,
			applicant: schema.users.name,
			email: schema.users.email,
			course: schema.courses.name,
		})
		.from(interviews)
		.innerJoin(schema.applications, eq(schema.applications.id, interviews.applicationId))
		.innerJoin(schema.users, eq(schema.users.id, schema.applications.userId))
		.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
		.orderBy(desc(interviews.createdAt))
		.limit(100);
	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

	return (
		<main>
			<PageHeader title={t("interview.title")} />
			{searchParams.error ? (
				<Alert variant="warning" className="mb-4">
					{t("interview.notCurrent")}
				</Alert>
			) : null}
			{rows.length === 0 ? (
				<EmptyState icon={<Icon name="video" />} title={t("interview.empty")} />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("interview.applicant")}</TableHead>
							<TableHead>{t("interview.application")}</TableHead>
							<TableHead>{t("interview.status")}</TableHead>
							<TableHead>{t("interview.scheduled")}</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
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
									<Badge variant={statusVariant[row.status]}>
										{t(`interview.statuses.${row.status}`)}
									</Badge>
								</TableCell>
								<TableCell className="whitespace-nowrap text-muted-foreground">
									{row.scheduledAt ? date.format(row.scheduledAt) : "-"}
								</TableCell>
								<TableCell>
									{row.status === "pending" || row.status === "scheduled" ? (
										<form
											method="post"
											action={`/api/admin/interviews/${row.applicationId}/decide`}
											className="flex items-center justify-end gap-2"
										>
											<Input name="notes" placeholder={t("interview.notes")} className="h-8 w-44" />
											<Button type="submit" name="result" value="pass" size="sm">
												{t("interview.pass")}
											</Button>
											<Button type="submit" name="result" value="fail" size="sm" variant="outline">
												{t("interview.fail")}
											</Button>
										</form>
									) : null}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
