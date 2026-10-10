import { type PluginPageProps, runtime } from "@zaydemy/core";
import { waitingContracts } from "../service";

/** Applications at the contract stage; staff can record a contract signed on paper. */
export default async function AdminContractsPage({ t }: PluginPageProps) {
	const contracts = await waitingContracts(runtime().db);
	return (
		<main>
			<h1>{t("contract.admin.title")}</h1>
			{contracts.length === 0 ? <p>{t("contract.admin.empty")}</p> : null}
			<table>
				<thead>
					<tr>
						<th>{t("contract.admin.application")}</th>
						<th>{t("contract.admin.applicant")}</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{contracts.map((contract) => (
						<tr key={contract.id}>
							<td>
								{contract.reference} · {contract.course}
							</td>
							<td>{contract.applicant}</td>
							<td>
								<form method="post" action={`/api/admin/contract/${contract.id}/complete`}>
									<button type="submit">{t("contract.admin.markSigned")}</button>
								</form>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</main>
	);
}
