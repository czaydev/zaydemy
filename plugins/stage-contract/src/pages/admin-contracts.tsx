import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Button,
	EmptyState,
	Icon,
	PageHeader,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@zaydemy/ui";
import { waitingContracts } from "../service";

/** Applications at the contract stage; staff can record a contract signed on paper. */
export default async function AdminContractsPage({ t }: PluginPageProps) {
	const contracts = await waitingContracts(runtime().db);
	return (
		<main>
			<PageHeader title={t("contract.admin.title")} />
			{contracts.length === 0 ? (
				<EmptyState icon={<Icon name="signature" />} title={t("contract.admin.empty")} />
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("contract.admin.applicant")}</TableHead>
							<TableHead>{t("contract.admin.application")}</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{contracts.map((contract) => (
							<TableRow key={contract.id}>
								<TableCell className="font-medium">{contract.applicant}</TableCell>
								<TableCell>
									<p>{contract.course}</p>
									<p className="font-mono text-muted-foreground text-xs">{contract.reference}</p>
								</TableCell>
								<TableCell>
									<form
										method="post"
										action={`/api/admin/contract/${contract.id}/complete`}
										className="flex justify-end"
									>
										<Button type="submit" size="sm" variant="outline">
											{t("contract.admin.markSigned")}
										</Button>
									</form>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
