import { CORE_PERMISSIONS } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import {
	Alert,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CheckboxField,
	Input,
	PageHeader,
} from "@zaydemy/ui";
import { count, eq } from "drizzle-orm";
import { ConfirmButton } from "@/components/confirm-button";
import { createRole, deleteRole, updateRole } from "@/server/actions/users";
import { requirePermission } from "@/server/admin";
import { getTranslator } from "@/server/i18n";
import { syncPermissions } from "@/server/permissions";
import { getZaydemy, resolvedConfig } from "@/server/zaydemy";

/** Roles with a permission checklist each, grouped by the plugin that declares them. */
export default async function AdminRolesPage({
	searchParams,
}: {
	searchParams: Promise<{ saved?: string; error?: string }>;
}) {
	await requirePermission(CORE_PERMISSIONS.manageUsers);
	await syncPermissions();
	const [t, { saved, error }] = await Promise.all([getTranslator(), searchParams]);
	const { db } = getZaydemy();
	const [roles, granted, holders] = await Promise.all([
		db.select().from(schema.roles).orderBy(schema.roles.name),
		db
			.select({ roleId: schema.rolePermissions.roleId, key: schema.permissions.key })
			.from(schema.rolePermissions)
			.innerJoin(
				schema.permissions,
				eq(schema.permissions.id, schema.rolePermissions.permissionId),
			),
		db
			.select({ roleId: schema.userRoles.roleId, value: count() })
			.from(schema.userRoles)
			.groupBy(schema.userRoles.roleId),
	]);
	// Only permissions of enabled plugins are shown; others stay in the database untouched.
	const groups = [
		{ name: t("roles.core"), keys: Object.values(CORE_PERMISSIONS) as string[] },
		...resolvedConfig.plugins
			.filter((p) => (p.permissions ?? []).length > 0)
			.map((p) => ({
				// The plugin's menu label is already translated; its English name is the fallback.
				name: p.adminNav?.[0] ? t(p.adminNav[0].label) : p.name,
				keys: (p.permissions ?? []).map((x) => x.key),
			})),
	];
	const permissionName = new Map(resolvedConfig.permissions.map((p) => [p.key, p.name]));
	const label = (key: string) => {
		const translated = t(`permissions.${key}`);
		return translated === `permissions.${key}` ? (permissionName.get(key) ?? key) : translated;
	};

	return (
		<main className="grid gap-6">
			<PageHeader
				back={{ href: "/admin/users", label: t("users.title") }}
				title={t("roles.title")}
				description={t("roles.description")}
				className="mb-0"
			/>
			{saved ? <Alert variant="success">{t("users.saved")}</Alert> : null}
			{error === "lockout" ? <Alert variant="destructive">{t("users.lockout")}</Alert> : null}
			{roles.map((role) => {
				const has = new Set(granted.filter((g) => g.roleId === role.id).map((g) => g.key));
				const users = holders.find((h) => h.roleId === role.id)?.value ?? 0;
				return (
					<Card key={role.id} id={role.id}>
						<CardHeader>
							<CardTitle>{role.name}</CardTitle>
							<CardDescription>
								<span className="font-mono">{role.key}</span> ·{" "}
								{t("roles.holders", { count: users })}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form action={updateRole} className="grid gap-5">
								<input type="hidden" name="roleId" value={role.id} />
								<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
									{groups.map((group) => (
										<fieldset key={group.name} className="grid content-start gap-2">
											<legend className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
												{group.name}
											</legend>
											{group.keys.map((key) => (
												<CheckboxField
													key={key}
													name="permissions"
													value={key}
													defaultChecked={has.has(key)}
												>
													{label(key)}
													<span className="block font-mono text-muted-foreground text-xs">
														{key}
													</span>
												</CheckboxField>
											))}
										</fieldset>
									))}
								</div>
								<div className="flex gap-2 border-t pt-4">
									<Button type="submit">{t("courses.save")}</Button>
									<ConfirmButton
										formAction={deleteRole}
										variant="ghost"
										confirm={t("roles.confirmDelete", { name: role.name })}
									>
										{t("roles.delete")}
									</ConfirmButton>
								</div>
							</form>
						</CardContent>
					</Card>
				);
			})}
			<Card className="max-w-xl">
				<CardHeader>
					<CardTitle>{t("roles.add")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form action={createRole} className="flex gap-2">
						<Input
							name="name"
							placeholder={t("roles.name")}
							aria-label={t("roles.name")}
							required
						/>
						<Button type="submit" variant="outline">
							{t("roles.add")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
