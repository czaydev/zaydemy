import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Alert,
	Avatar,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CheckboxField,
	DetailList,
	Field,
	Input,
	PageHeader,
} from "@zaydemy/ui";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { applicationStatusVariant } from "@/components/application-status";
import { updateUser } from "@/server/actions/users";
import { requirePermission } from "@/server/admin";
import { getLocale, getTranslator } from "@/server/i18n";
import { getZaydemy } from "@/server/zaydemy";

export default async function AdminUserPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ saved?: string; error?: string }>;
}) {
	await requirePermission(CORE_PERMISSIONS.manageUsers);
	const [t, locale, { id }, { saved, error }] = await Promise.all([
		getTranslator(),
		getLocale(),
		params,
		searchParams,
	]);
	const { db } = getZaydemy();
	const [[user], roles, held, applications] = await Promise.all([
		db.select().from(schema.users).where(eq(schema.users.id, id)),
		db.select().from(schema.roles).orderBy(schema.roles.name),
		db
			.select({ roleId: schema.userRoles.roleId })
			.from(schema.userRoles)
			.where(eq(schema.userRoles.userId, id)),
		db
			.select({
				id: schema.applications.id,
				reference: schema.applications.reference,
				status: schema.applications.status,
				course: schema.courses.name,
			})
			.from(schema.applications)
			.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
			.where(eq(schema.applications.userId, id))
			.orderBy(desc(schema.applications.createdAt)),
	]);
	if (!user) notFound();
	const heldIds = new Set(held.map((h) => h.roleId));
	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

	return (
		<main>
			<PageHeader
				back={{ href: "/admin/users", label: t("users.title") }}
				title={user.name}
				description={user.email}
			/>
			{saved ? (
				<Alert variant="success" className="mb-6">
					{t("users.saved")}
				</Alert>
			) : null}
			{error === "lockout" ? (
				<Alert variant="destructive" className="mb-6">
					{t("users.lockout")}
				</Alert>
			) : null}
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="grid content-start gap-6 lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>{t("users.applications")}</CardTitle>
						</CardHeader>
						<CardContent>
							{applications.length === 0 ? (
								<p className="text-muted-foreground text-sm">{t("home.noApplications")}</p>
							) : (
								<ul className="divide-y rounded-lg border">
									{applications.map((a) => (
										<li key={a.id}>
											<a
												href={`/admin/applications/${a.id}`}
												className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
											>
												<span>
													<span className="font-medium">{a.course}</span>
													<span className="ml-2 font-mono text-muted-foreground text-xs">
														{a.reference}
													</span>
												</span>
												<Badge variant={applicationStatusVariant[a.status]}>
													{t(`application.status.${a.status}`)}
												</Badge>
											</a>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>{t("users.access")}</CardTitle>
							<CardDescription>{t("users.accessHint")}</CardDescription>
						</CardHeader>
						<CardContent>
							<form action={updateUser} className="grid gap-5">
								<input type="hidden" name="userId" value={user.id} />
								<fieldset className="grid gap-2">
									<legend className="mb-2 font-medium text-sm">{t("users.roles")}</legend>
									{roles.length === 0 ? (
										<p className="text-muted-foreground text-sm">{t("roles.empty")}</p>
									) : (
										roles.map((role) => (
											<CheckboxField
												key={role.id}
												name="roleIds"
												value={role.id}
												defaultChecked={heldIds.has(role.id)}
											>
												{role.name}
											</CheckboxField>
										))
									)}
								</fieldset>
								<Field
									label={t("users.applicationLimit")}
									hint={t("users.applicationLimitHint")}
									htmlFor="applicationLimit"
									className="max-w-48"
								>
									<Input
										id="applicationLimit"
										name="applicationLimit"
										type="number"
										min={1}
										max={20}
										defaultValue={user.applicationLimit}
									/>
								</Field>
								<div>
									<Button type="submit">{t("courses.save")}</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
				<Card className="self-start">
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
								{
									label: t("users.emailVerified"),
									value: user.emailVerified ? t("users.yes") : t("users.no"),
								},
								{ label: t("users.memberSince"), value: date.format(user.createdAt) },
							]}
						/>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
