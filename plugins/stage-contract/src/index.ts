import { definePlugin, defineStage, runtime } from "@zaydemy/core";
import messages from "./messages";
import { acceptContract, findPolicy, hasAccepted, STAGE, stageOptions } from "./service";

const MANAGE = "contracts.manage";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });

export const contractStage = defineStage({
	id: STAGE,
	label: "contract.stage",
	options: stageOptions,
	applicantHref: "/contract",
	async onEnter({ db, userId, options }) {
		const policy = await findPolicy(db, options.policy);
		// Someone who already accepted this version (an earlier application) is not asked again.
		return policy && (await hasAccepted(db, userId, policy)) ? "complete" : "wait";
	},
});

/**
 * Contract stage: the applicant reads the course's contract (a policy) and
 * accepts it online, or staff record a contract signed on paper.
 */
export const contractPlugin = definePlugin({
	id: "stage-contract",
	name: "Contract stage",
	version: "0.1.0",
	stages: [contractStage],
	permissions: [{ key: MANAGE, name: "Manage contracts" }],
	adminNav: [
		{ label: "contract.nav", href: "/admin/contracts", icon: "signature", permission: MANAGE },
	],
	appNav: [{ label: "contract.stage", href: "/contract", icon: "signature" }],
	messages,
	pages: [
		{ area: "app", path: "/contract", signedIn: true, load: () => import("./pages/my-contract") },
		{
			area: "admin",
			path: "/contracts",
			permission: MANAGE,
			load: () => import("./pages/admin-contracts"),
		},
	],
	api: [
		{
			method: "POST",
			path: "/contract/[applicationId]/accept",
			signedIn: true,
			async handler(_request, { params, session }) {
				const user = await session();
				if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
				const accepted = await acceptContract(runtime(), user.user.id, params.applicationId ?? "");
				if (!accepted) return Response.json({ error: "not_found" }, { status: 404 });
				return seeOther("/contract");
			},
		},
		{
			method: "POST",
			path: "/admin/contract/[applicationId]/complete",
			permission: MANAGE,
			async handler(_request, { params, session }) {
				const actor = await session();
				await runtime().engine.complete(params.applicationId ?? "", STAGE, {
					ifCurrent: true,
					actorId: actor?.user.id,
					data: { signedOnPaper: true },
				});
				return seeOther("/admin/contracts");
			},
		},
	],
});

export { acceptContract } from "./service";
