import {
	definePlugin,
	defineStage,
	PipelineError,
	runtime,
	type TransactionContext,
	type Zaydemy,
} from "@zaydemy/core";
import { eq } from "drizzle-orm";
import { z } from "zod";
import messages from "./messages";
import { interviews } from "./schema";

const STAGE = "interview";
const MANAGE = "interviews.manage";

const seeOther = (location: string) =>
	new Response(null, { status: 303, headers: { Location: location } });

export const interviewStage = defineStage({
	id: STAGE,
	label: "interview.stage",
	options: z.object({
		/** Booking page applicants use to pick a slot (Cal.com, Calendly, …). */
		schedulingUrl: z.url().optional().meta({
			label: "interview.options.schedulingUrl",
			hint: "interview.options.schedulingUrlHint",
		}),
	}),
	async onEnter({ db, applicationId }) {
		await db.insert(interviews).values({ applicationId }).onConflictDoNothing();
		return "wait" as const;
	},
});

export const interviewPlugin = definePlugin({
	id: "stage-interview",
	name: "Interview stage",
	version: "0.1.0",
	stages: [interviewStage],
	schema: { interviews },
	permissions: [{ key: MANAGE, name: "Manage interviews" }],
	adminNav: [
		{
			label: "interview.nav",
			href: "/admin/interviews",
			icon: "video",
			permission: MANAGE,
		},
	],
	messages,
	pages: [
		{
			area: "admin",
			path: "/interviews",
			permission: MANAGE,
			load: () => import("./pages/admin-interviews"),
		},
	],
	api: [
		{
			method: "POST",
			path: "/admin/interviews/[applicationId]/decide",
			permission: MANAGE,
			async handler(request, { params, session }) {
				const form = await request.formData();
				const actor = await session();
				try {
					await decideInterview(runtime(), {
						applicationId: params.applicationId ?? "",
						passed: form.get("result") === "pass",
						notes: String(form.get("notes") ?? "").trim() || undefined,
						actorId: actor?.user.id,
					});
				} catch (error) {
					if (!(error instanceof PipelineError)) throw error;
					return seeOther("/admin/interviews?error=not_current");
				}
				return seeOther("/admin/interviews");
			},
		},
	],
});

/** Records the interview result and moves the pipeline: pass continues, fail rejects. */
export async function decideInterview(
	{ engine }: Zaydemy,
	input: { applicationId: string; passed: boolean; notes?: string; actorId?: string },
) {
	const effect = async ({ db }: TransactionContext) => {
		await db
			.update(interviews)
			.set({ status: input.passed ? "passed" : "failed", notes: input.notes })
			.where(eq(interviews.applicationId, input.applicationId));
	};
	const { applicationId, actorId } = input;
	if (input.passed) await engine.complete(applicationId, STAGE, { actorId, effect });
	else await engine.reject(applicationId, STAGE, { reason: "interview_failed", actorId, effect });
}

export { interviews } from "./schema";
