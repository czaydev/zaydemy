import { type PluginPageProps, runtime } from "@zaydemy/core";
import { waitingContracts } from "../service";

/** Contracts waiting for the applicant's approval, with the full text. */
export default async function MyContractPage({ session, t }: PluginPageProps) {
	if (!session) return null;
	const contracts = await waitingContracts(runtime().db, session.user.id);
	return (
		<main>
			<h1>{t("contract.title")}</h1>
			{contracts.length === 0 ? <p>{t("contract.none")}</p> : null}
			{contracts.map((contract) => (
				<section key={contract.id}>
					<h2>
						{contract.course} · {contract.reference}
					</h2>
					{contract.policy ? (
						<>
							<article style={{ whiteSpace: "pre-wrap" }}>{contract.policy.content}</article>
							<form method="post" action={`/api/contract/${contract.id}/accept`}>
								<button type="submit">{t("contract.accept")}</button>
							</form>
						</>
					) : (
						<p>{t("contract.missing")}</p>
					)}
				</section>
			))}
		</main>
	);
}
