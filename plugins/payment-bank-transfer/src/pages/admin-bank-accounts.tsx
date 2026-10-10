import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Alert,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Field,
	Input,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { asc } from "drizzle-orm";
import { formatIban } from "../iban";
import { bankAccounts } from "../schema";

/** Bank accounts with a form to add one and a switch to hide one from payers. */
export default async function AdminBankAccountsPage({ searchParams, t }: PluginPageProps) {
	const rows = await runtime()
		.db.select()
		.from(bankAccounts)
		.orderBy(asc(bankAccounts.sortOrder), asc(bankAccounts.bankName));

	return (
		<main className="grid gap-8">
			<PageHeader title={t("bankTransfer.nav")} className="mb-0" />
			{rows.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("bankTransfer.bank")}</TableHead>
							<TableHead>{t("bankTransfer.holder")}</TableHead>
							<TableHead>{t("bankTransfer.iban")}</TableHead>
							<TableHead>{t("bankTransfer.currency")}</TableHead>
							<TableHead className="text-right">{t("bankTransfer.active")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((account) => (
							<TableRow key={account.id}>
								<TableCell className="font-medium">
									{account.bankName}
									{account.branch ? (
										<span className="block font-normal text-muted-foreground text-xs">
											{account.branch}
										</span>
									) : null}
								</TableCell>
								<TableCell>{account.accountHolder}</TableCell>
								<TableCell className="whitespace-nowrap font-mono text-xs">
									{formatIban(account.iban)}
								</TableCell>
								<TableCell>
									<Badge variant="secondary">{account.currency}</Badge>
								</TableCell>
								<TableCell>
									<form
										method="post"
										action={`/api/admin/bank-accounts/${account.id}/toggle`}
										className="flex items-center justify-end gap-3"
									>
										<Badge variant={account.isActive ? "success" : "secondary"}>
											{account.isActive ? "●" : "○"}
										</Badge>
										<Button type="submit" variant="outline" size="sm">
											{t(account.isActive ? "bankTransfer.deactivate" : "bankTransfer.activate")}
										</Button>
									</form>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : null}
			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle>{t("bankTransfer.add")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="/api/admin/bank-accounts"
						className="grid gap-4 sm:grid-cols-2"
					>
						{searchParams.error ? (
							<Alert variant="destructive" className="sm:col-span-2">
								{t("bankTransfer.invalidIban")}
							</Alert>
						) : null}
						<Field label={t("bankTransfer.bank")} htmlFor="bankName">
							<Input id="bankName" name="bankName" required />
						</Field>
						<Field label={t("bankTransfer.branch")} htmlFor="branch">
							<Input id="branch" name="branch" />
						</Field>
						<Field
							label={t("bankTransfer.holder")}
							htmlFor="accountHolder"
							className="sm:col-span-2"
						>
							<Input id="accountHolder" name="accountHolder" required />
						</Field>
						<Field label={t("bankTransfer.iban")} htmlFor="iban" className="sm:col-span-2">
							<Input
								id="iban"
								name="iban"
								placeholder="TR00 0000 0000 0000 0000 0000 00"
								className="font-mono"
								required
							/>
						</Field>
						<Field label={t("bankTransfer.currency")} htmlFor="currency">
							<Input id="currency" name="currency" defaultValue="TRY" maxLength={3} required />
						</Field>
						<Field label={t("bankTransfer.swift")} htmlFor="swiftCode">
							<Input id="swiftCode" name="swiftCode" />
						</Field>
						<div className="sm:col-span-2">
							<Button type="submit">{t("bankTransfer.add")}</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
