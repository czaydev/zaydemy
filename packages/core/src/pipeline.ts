import type { ResolvedConfig } from "./config";
import type { RegisteredDatabase, StageEnterResult } from "./plugin";

export type ApplicationStatus = "in_progress" | "enrolled" | "rejected" | "withdrawn";
export type StageStatus = "pending" | "active" | "completed" | "skipped" | "failed";

export interface ApplicationState {
	id: string;
	userId: string;
	courseId: string;
	status: ApplicationStatus;
	pipeline: string[];
	currentStage: string | null;
	stageOptions: Record<string, unknown>;
}

/** Persistence used by the engine; `@zaydemy/db` provides the Drizzle implementation. */
export interface PipelineStore {
	/** Database handle for plugin writes; inside `transaction` it is the transaction. */
	readonly db: RegisteredDatabase;
	transaction<T>(fn: (store: PipelineStore) => Promise<T>): Promise<T>;
	getApplication(applicationId: string): Promise<ApplicationState | null>;
	updateApplication(
		applicationId: string,
		patch: { status?: ApplicationStatus; currentStage?: string | null },
	): Promise<void>;
	updateStage(
		applicationId: string,
		stage: string,
		patch: { status: StageStatus; data?: Record<string, unknown>; at: Date },
	): Promise<void>;
	recordEvent(
		applicationId: string,
		event: { type: string; stage?: string; actorId?: string; payload?: Record<string, unknown> },
	): Promise<void>;
}

export class PipelineError extends Error {
	override name = "PipelineError";
}

type Emit = { event: string; payload: Record<string, unknown> };

/** A unit of work run inside a pipeline transaction. */
export interface TransactionContext {
	/** The transaction's database handle. */
	db: RegisteredDatabase;
	/**
	 * Queues an event: its transaction hooks run before commit, its
	 * `events` handlers after commit.
	 */
	emit(event: string, payload: Record<string, unknown>): void;
}

export type Effect = (ctx: TransactionContext) => Promise<void> | void;

export interface CompleteOptions {
	data?: Record<string, unknown>;
	actorId?: string;
	/** Plugin writes committed together with the stage change (e.g. marking a payment paid). */
	effect?: Effect;
	/**
	 * When the stage is not the current one, run `effect` and return false
	 * instead of throwing. Useful for callbacks that may arrive late.
	 */
	ifCurrent?: boolean;
}

export interface RejectOptions {
	reason?: string;
	actorId?: string;
	effect?: Effect;
}

/**
 * Moves applications through their pipeline. Stage plugins decide when their
 * stage is done; the engine owns ordering, persistence and events.
 */
export class PipelineEngine {
	constructor(
		private config: ResolvedConfig,
		private store: PipelineStore,
		private now: () => Date = () => new Date(),
	) {}

	/** Resolves the stage list for a course's pipeline name. */
	pipelineFor(name: string | null | undefined): string[] {
		const pipeline = this.config.pipelines[name ?? "default"];
		if (!pipeline) throw new PipelineError(`Unknown pipeline "${name}".`);
		return [...pipeline];
	}

	/** Enters the first stage of a freshly created application. */
	start(applicationId: string, actorId?: string) {
		return this.run(applicationId, async (store, app, emits) => {
			if (app.currentStage !== null) throw new PipelineError("Application has already started.");
			await store.recordEvent(applicationId, { type: "application.created", actorId });
			emits.push({ event: "application.created", payload: { applicationId } });
			await this.advance(store, app, 0, emits);
		});
	}

	/**
	 * Marks the current stage as passed and moves on. Resolves to false only
	 * when `ifCurrent` is set and the stage was not current.
	 */
	async complete(applicationId: string, stage: string, options: CompleteOptions = {}) {
		let advanced = true;
		await this.run(applicationId, async (store, app, emits) => {
			await this.applyEffect(options.effect, store, emits);
			if (options.ifCurrent && (app.status !== "in_progress" || app.currentStage !== stage)) {
				advanced = false;
				return;
			}
			this.assertCurrent(app, stage);
			const { data, actorId } = options;
			await store.updateStage(applicationId, stage, { status: "completed", data, at: this.now() });
			await store.recordEvent(applicationId, {
				type: "stage.completed",
				stage,
				actorId,
				payload: data,
			});
			emits.push({ event: "stage.completed", payload: { applicationId, stage } });
			await this.advance(store, app, app.pipeline.indexOf(stage) + 1, emits);
		});
		return advanced;
	}

	/** Fails the current stage, which rejects the application. */
	reject(applicationId: string, stage: string, options: RejectOptions = {}) {
		return this.run(applicationId, async (store, app, emits) => {
			await this.applyEffect(options.effect, store, emits);
			this.assertCurrent(app, stage);
			const { reason, actorId } = options;
			const at = this.now();
			await store.updateStage(applicationId, stage, { status: "failed", data: { reason }, at });
			await store.updateApplication(applicationId, { status: "rejected" });
			await store.recordEvent(applicationId, {
				type: "application.rejected",
				stage,
				actorId,
				payload: { reason },
			});
			emits.push({ event: "application.rejected", payload: { applicationId, stage, reason } });
		});
	}

	withdraw(applicationId: string, actorId?: string) {
		return this.run(applicationId, async (store, app, emits) => {
			if (app.status !== "in_progress") throw new PipelineError("Application is already closed.");
			await store.updateApplication(applicationId, { status: "withdrawn" });
			await store.recordEvent(applicationId, { type: "application.withdrawn", actorId });
			emits.push({ event: "application.withdrawn", payload: { applicationId } });
		});
	}

	/**
	 * Runs plugin writes that are not tied to a stage change in one
	 * transaction, with the same hook and event guarantees as the engine.
	 */
	async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
		const emits: Emit[] = [];
		const result = await this.store.transaction(async (store) => {
			const value = await fn(this.contextFor(store, emits));
			await this.runHooks(store, emits);
			return value;
		});
		await this.publish(emits);
		return result;
	}

	private async run(
		applicationId: string,
		fn: (store: PipelineStore, app: ApplicationState, emits: Emit[]) => Promise<void>,
	) {
		const emits: Emit[] = [];
		await this.store.transaction(async (store) => {
			const app = await store.getApplication(applicationId);
			if (!app) throw new PipelineError(`Application "${applicationId}" not found.`);
			await fn(store, app, emits);
			await this.runHooks(store, emits);
		});
		await this.publish(emits);
	}

	private contextFor(store: PipelineStore, emits: Emit[]): TransactionContext {
		return { db: store.db, emit: (event, payload) => emits.push({ event, payload }) };
	}

	private async applyEffect(effect: Effect | undefined, store: PipelineStore, emits: Emit[]) {
		if (effect) await effect(this.contextFor(store, emits));
	}

	private async runHooks(store: PipelineStore, emits: Emit[]) {
		for (let i = 0; i < emits.length; i++) {
			const { event, payload } = emits[i] as Emit;
			await this.config.hooks.run(event, payload, store.db);
		}
	}

	// Events go out only after the transaction commits.
	private async publish(emits: Emit[]) {
		for (const { event, payload } of emits) await this.config.events.emit(event, payload);
	}

	private assertCurrent(app: ApplicationState, stage: string) {
		if (app.status !== "in_progress") throw new PipelineError("Application is already closed.");
		if (app.currentStage !== stage) {
			throw new PipelineError(`Stage "${stage}" is not the current stage (${app.currentStage}).`);
		}
	}

	/** Enters stages from `index` on until one waits or the pipeline ends. */
	private async advance(store: PipelineStore, app: ApplicationState, index: number, emits: Emit[]) {
		const { id: applicationId } = app;
		for (let i = index; i < app.pipeline.length; i++) {
			const stageId = app.pipeline[i] as string;
			const stage = this.config.stages.get(stageId);
			if (!stage)
				throw new PipelineError(`Stage "${stageId}" is not provided by any enabled plugin.`);

			const options = stage.options
				? stage.options.parse(app.stageOptions[stageId] ?? {})
				: app.stageOptions[stageId];
			const result: StageEnterResult =
				(await stage.onEnter?.({
					db: store.db,
					emit: (event, payload) => emits.push({ event, payload }),
					applicationId,
					userId: app.userId,
					courseId: app.courseId,
					options,
				})) ?? "wait";

			const at = this.now();
			await store.updateApplication(applicationId, { currentStage: stageId });
			if (result === "wait") {
				await store.updateStage(applicationId, stageId, { status: "active", at });
				await store.recordEvent(applicationId, { type: "stage.entered", stage: stageId });
				emits.push({ event: "stage.entered", payload: { applicationId, stage: stageId } });
				return;
			}
			const status = result === "skip" ? "skipped" : "completed";
			await store.updateStage(applicationId, stageId, { status, at });
			await store.recordEvent(applicationId, { type: `stage.${status}`, stage: stageId });
			emits.push({ event: `stage.${status}`, payload: { applicationId, stage: stageId } });
		}

		await store.updateApplication(applicationId, { status: "enrolled", currentStage: null });
		await store.recordEvent(applicationId, { type: "application.enrolled" });
		emits.push({ event: "application.enrolled", payload: { applicationId } });
	}
}
