import type { Zaydemy } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const STAGE = "contract";

export const stageOptions = z.object({
	/** Key of the policy (Settings → Policies) that holds the contract text. */
	policy: z
		.string()
		.default("enrollment-contract")
		.meta({ label: "contract.options.policy", hint: "contract.options.policyHint" }),
});

type Db = Zaydemy["db"];

export async function findPolicy(db: Db, key: string) {
	const [policy] = await db.select().from(schema.policies).where(eq(schema.policies.key, key));
	return policy ?? null;
}

export async function hasAccepted(
	db: Db,
	userId: string,
	policy: { key: string; version: string },
) {
	const [row] = await db
		.select({ id: schema.policyAcceptances.id })
		.from(schema.policyAcceptances)
		.where(
			and(
				eq(schema.policyAcceptances.userId, userId),
				eq(schema.policyAcceptances.policyKey, policy.key),
				eq(schema.policyAcceptances.policyVersion, policy.version),
			),
		);
	return Boolean(row);
}

/** The user's applications waiting at the contract stage, with the policy each one needs. */
export async function waitingContracts(db: Db, userId?: string) {
	const rows = await db
		.select({
			id: schema.applications.id,
			reference: schema.applications.reference,
			userId: schema.applications.userId,
			applicant: schema.users.name,
			course: schema.courses.name,
			stageOptions: schema.courses.stageOptions,
		})
		.from(schema.applications)
		.innerJoin(schema.courses, eq(schema.courses.id, schema.applications.courseId))
		.innerJoin(schema.users, eq(schema.users.id, schema.applications.userId))
		.where(
			and(
				eq(schema.applications.status, "in_progress"),
				eq(schema.applications.currentStage, STAGE),
				userId ? eq(schema.applications.userId, userId) : undefined,
			),
		);
	return Promise.all(
		rows.map(async ({ stageOptions: options, ...row }) => ({
			...row,
			policy: await findPolicy(db, stageOptions.parse(options[STAGE] ?? {}).policy),
		})),
	);
}

/** The applicant accepts the contract; the acceptance and the stage change commit together. */
export async function acceptContract(app: Zaydemy, userId: string, applicationId: string) {
	const waiting = (await waitingContracts(app.db, userId)).find((c) => c.id === applicationId);
	if (!waiting?.policy) return false;
	const { key, version } = waiting.policy;
	return app.engine.complete(applicationId, STAGE, {
		actorId: userId,
		data: { policy: key, version },
		effect: async ({ db }) => {
			await db
				.insert(schema.policyAcceptances)
				.values({ userId, policyKey: key, policyVersion: version })
				.onConflictDoNothing();
		},
	});
}
