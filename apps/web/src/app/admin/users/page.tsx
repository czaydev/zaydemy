import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Avatar,
	Badge,
	Button,
	ButtonLink,
	EmptyState,
	Input,
	PageHeader,
	Pagination,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { Search, ShieldCheck, Users } from "lucide-react";
import { PAGE_SIZE, pageNumber, param, requirePermission } from "@/server/admin";
import { getLocale, getTranslator } from "@/server/i18n";
import { getZaydemy } from "@/server/zaydemy";

export default async function AdminUsersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	await requirePermission(CORE_PERMISSIONS.manageUsers);
	const [t, locale, params] = await Promise.all([getTranslator(), getLocale(), searchParams]);
	const { db } = getZaydemy();
	const u = schema.users;
	const q = param(params.q);
	const page = pageNumber(params.page);
	const pattern = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : undefined;
	const where = pattern ? or(ilike(u.name, pattern), ilike(u.email, pattern)) : undefined;

	const [users, [total]] = await Promise.all([
		db
			.select({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })
			.from(u)
			.where(where)
			.orderBy(desc(u.createdAt))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db.select({ value: count() }).from(u).where(where),
	]);
	const ids = users.map((user) => user.id);
	const [roles, applications] =
		ids.length === 0
			? [[], []]
			: await Promise.all([
					db
						.select({ userId: schema.userRoles.userId, name: schema.roles.name })
						.from(schema.userRoles)
						.innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
						.where(inArray(schema.userRoles.userId, ids)),
					db
						.select({ userId: schema.applications.userId, value: count() })
						.from(schema.applications)
						.where(inArray(schema.applications.userId, ids))
						.groupBy(schema.applications.userId),
				]);
	// Precomputed for O(1) lookups during render to avoid O(n²) bottleneck
	const userRolesMap = new Map<string, { userId: string; name: string }[]>();
	for (const role of roles) {
		const arr = userRolesMap.get(role.userId) ?? [];
		arr.push(role);
		userRolesMap.set(role.userId, arr);
	}
	const applicationCounts = new Map(applications.map((a) => [a.userId, a.value]));

	const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

	return (
		<main>
			<PageHeader
				title={t("users.title")}
				actions={
					<ButtonLink href="/admin/roles" variant="outline">
						<ShieldCheck />
						{t("roles.title")}
					</ButtonLink>
				}
			/>
			<form className="mb-4 flex gap-2" action="/admin/users">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
					<Input
						name="q"
						defaultValue={q}
						placeholder={t("users.search")}
						className="pl-9"
						aria-label={t("users.search")}
					/>
				</div>
				<Button type="submit" variant="secondary">
					{t("applications.filter")}
				</Button>
			</form>
			{users.length === 0 ? (
				<EmptyState icon={<Users />} title={t("users.empty")} />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("users.user")}</TableHead>
							<TableHead>{t("users.roles")}</TableHead>
							<TableHead className="text-right">{t("users.applications")}</TableHead>
							<TableHead className="text-right">{t("users.memberSince")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow key={user.id} className="relative">
								<TableCell>
									<div className="flex items-center gap-3">
										<Avatar name={user.name} />
										<div>
											<a
												href={`/admin/users/${user.id}`}
												className="font-medium after:absolute after:inset-0 hover:underline"
											>
												{user.name}
											</a>
											<p className="text-muted-foreground text-xs">{user.email}</p>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex flex-wrap gap-1">
										{(userRolesMap.get(user.id) ?? []).map((r) => (
											<Badge key={r.name}>{r.name}</Badge>
										))}
									</div>
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{applicationCounts.get(user.id) ?? 0}
								</TableCell>
								<TableCell className="whitespace-nowrap text-right text-muted-foreground">
									{date.format(user.createdAt)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			<Pagination
				page={page}
				pageSize={PAGE_SIZE}
				total={total?.value ?? 0}
				href={(p) =>
					`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`
				}
				labels={{ previous: t("common.previous"), next: t("common.next") }}
			/>
		</main>
	);
}
