"use server";

import { CORE_PERMISSIONS, PipelineError } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requirePermission } from "../admin";
import { getZaydemy } from "../zaydemy";

type Action = "complete" | "reject" | "withdraw";

/** Staff override on an application: pass its current stage, reject it or withdraw it. */
export async function changeApplication(form: FormData) {
	const session = await requirePermission(CORE_PERMISSIONS.manageApplications);
	const id = String(form.get("applicationId"));
	const action = String(form.get("action")) as Action;
	const note = String(form.get("note") ?? "").trim() || undefined;
	const { db, engine } = getZaydemy();
	const [application] = await db
		.select({ status: schema.applications.status, stage: schema.applications.currentStage })
		.from(schema.applications)
		.where(eq(schema.applications.id, id));
	if (!application) redirect("/admin/applications");

	const actorId = session.user.id;
	let error: string | undefined;
	try {
		if (action === "withdraw") await engine.withdraw(id, actorId);
		else if (!application.stage) error = "not_in_progress";
		else if (action === "complete") {
			await engine.complete(id, application.stage, { actorId, data: { byStaff: true, note } });
		} else if (action === "reject") {
			await engine.reject(id, application.stage, { actorId, reason: note ?? "staff" });
		}
	} catch (cause) {
		if (!(cause instanceof PipelineError)) throw cause;
		error = "not_in_progress";
	}
	redirect(`/admin/applications/${id}${error ? `?error=${error}` : ""}`);
}
