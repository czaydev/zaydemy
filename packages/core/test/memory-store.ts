import type { ApplicationState, PipelineStore, StageStatus } from "../src";

export class MemoryStore implements PipelineStore {
	/** Stand-in database handle; hooks and effects receive it. */
	readonly db = { kind: "memory" };
	/** Writes made by effects and hooks, rolled back with the rest. */
	writes: string[] = [];
	apps = new Map<string, ApplicationState>();
	stages = new Map<string, { status: StageStatus; data?: Record<string, unknown> }>();
	events: { applicationId: string; type: string; stage?: string }[] = [];

	add(app: Partial<ApplicationState> & { id: string; pipeline: string[] }) {
		this.apps.set(app.id, {
			userId: "u1",
			courseId: "c1",
			status: "in_progress",
			currentStage: null,
			stageOptions: {},
			...app,
		});
	}

	stage(applicationId: string, stage: string) {
		return this.stages.get(`${applicationId}:${stage}`)?.status;
	}

	async transaction<T>(fn: (store: PipelineStore) => Promise<T>): Promise<T> {
		const snapshot = structuredClone({
			apps: this.apps,
			stages: this.stages,
			events: this.events,
			writes: this.writes,
		});
		try {
			return await fn(this);
		} catch (error) {
			Object.assign(this, snapshot);
			throw error;
		}
	}
	async getApplication(id: string) {
		const app = this.apps.get(id);
		return app ? structuredClone(app) : null;
	}
	async updateApplication(id: string, patch: Partial<ApplicationState>) {
		Object.assign(this.apps.get(id) as ApplicationState, patch);
	}
	async updateStage(
		id: string,
		stage: string,
		patch: { status: StageStatus; data?: Record<string, unknown> },
	) {
		this.stages.set(`${id}:${stage}`, { status: patch.status, data: patch.data });
	}
	async recordEvent(applicationId: string, event: { type: string; stage?: string }) {
		this.events.push({ applicationId, ...event });
	}
}
