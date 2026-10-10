import { type PluginPageProps, runtime } from "@zaydemy/core";
import {
	Alert,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	EmptyState,
	Icon,
	PageHeader,
} from "@zaydemy/ui";
import { waitingContracts } from "../service";

/** Contracts waiting for the applicant's approval, with the full text. */
export default async function MyContractPage({ session, t }: PluginPageProps) {
	if (!session) return null;
	const contracts = await waitingContracts(runtime().db, session.user.id);
	return (
		<main>
			<PageHeader title={t("contract.title")} />
			{contracts.length === 0 ? (
				<EmptyState icon={<Icon name="signature" />} title={t("contract.none")} />
			) : (
				<div className="grid gap-4">
					{contracts.map((contract) => (
						<Card key={contract.id} className="overflow-hidden">
							<CardHeader>
								<CardTitle>{contract.course}</CardTitle>
								<CardDescription className="font-mono text-xs">
									{contract.reference}
								</CardDescription>
							</CardHeader>
							{contract.policy ? (
								<>
									<CardContent>
										<article className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
											{contract.policy.content}
										</article>
									</CardContent>
									<CardFooter className="justify-end">
										<form method="post" action={`/api/contract/${contract.id}/accept`}>
											<Button type="submit">{t("contract.accept")}</Button>
										</form>
									</CardFooter>
								</>
							) : (
								<CardContent>
									<Alert variant="warning">{t("contract.missing")}</Alert>
								</CardContent>
							)}
						</Card>
					))}
				</div>
			)}
		</main>
	);
}
