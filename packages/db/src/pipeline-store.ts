import type { ApplicationState, PipelineStore } from "@zaydemy/core";
import { eq } from "drizzle-orm";
import type { Database } from "./index";
import { applicationEvents, applicationStages, applications, courses } from "./schema";

/** Drizzle-backed persistence for the pipeline engine. */
export class DrizzlePipelineStore implements PipelineStore {
	constructor(readonly db: Database) {}

	transaction<T>(fn: (store: PipelineStore) => Promise<T>): Promise<T> {
		return this.db.transaction((tx) => fn(new DrizzlePipelineStore(tx)));
	}

	async getApplication(applicationId: string): Promise<ApplicationState | null> {
		const [row] = await this.db
			.select({
				id: applications.id,
				userId: applications.userId,
				courseId: applications.courseId,
				status: applications.status,
				pipeline: applications.pipeline,
				currentStage: applications.currentStage,
				stageOptions: courses.stageOptions,
			})
			.from(applications)
			.innerJoin(courses, eq(courses.id, applications.courseId))
			.where(eq(applications.id, applicationId))
			.for("update", { of: applications });
		return row ?? null;
	}

	async updateApplication(
		applicationId: string,
		patch: Parameters<PipelineStore["updateApplication"]>[1],
	) {
		await this.db.update(applications).set(patch).where(eq(applications.id, applicationId));
	}

	async updateStage(
		applicationId: string,
		stage: string,
		{ status, data, at }: Parameters<PipelineStore["updateStage"]>[2],
	) {
		const timing = status === "active" ? { startedAt: at } : { finishedAt: at };
		await this.db
			.insert(applicationStages)
			.values({ applicationId, stage, status, data: data ?? {}, ...timing })
			.onConflictDoUpdate({
				target: [applicationStages.applicationId, applicationStages.stage],
				set: { status, ...(data ? { data } : {}), ...timing },
			});
	}

	async recordEvent(applicationId: string, event: Parameters<PipelineStore["recordEvent"]>[1]) {
		await this.db.insert(applicationEvents).values({
			applicationId,
			type: event.type,
			stage: event.stage,
			actorId: event.actorId,
			payload: event.payload ?? {},
		});
	}
}
