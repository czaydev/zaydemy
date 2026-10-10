/**
 * Events emitted by the core. Plugins add their own namespaced events (e.g.
 * `payment.paid`) by augmenting this interface:
 * `declare module "@zaydemy/core" { interface CoreEvents { "payment.paid": {…} } }`
 */
export interface CoreEvents {
	"application.created": { applicationId: string };
	"application.enrolled": { applicationId: string };
	"application.rejected": { applicationId: string; stage: string; reason?: string };
	"application.withdrawn": { applicationId: string };
	"stage.entered": { applicationId: string; stage: string };
	"stage.completed": { applicationId: string; stage: string };
	"stage.skipped": { applicationId: string; stage: string };
}

type Payload<E extends string> = E extends keyof CoreEvents
	? CoreEvents[E]
	: Record<string, unknown>;
type Handler<E extends string> = (payload: Payload<E>) => void | Promise<void>;

export class EventBus {
	private handlers = new Map<string, Handler<string>[]>();

	constructor(private onError: (event: string, error: unknown) => void = defaultOnError) {}

	on<E extends string>(event: E, handler: Handler<E>): () => void {
		const list = this.handlers.get(event) ?? [];
		list.push(handler as Handler<string>);
		this.handlers.set(event, list);
		return () => {
			this.handlers.set(
				event,
				(this.handlers.get(event) ?? []).filter((h) => h !== handler),
			);
		};
	}

	/** Runs every handler; a failing handler is reported but never stops the others. */
	async emit<E extends string>(event: E, payload: Payload<E>): Promise<void> {
		const list = this.handlers.get(event) ?? [];
		const results = await Promise.allSettled(list.map((h) => h(payload)));
		for (const result of results) {
			if (result.status === "rejected") this.onError(event, result.reason);
		}
	}
}

function defaultOnError(event: string, error: unknown) {
	console.error(`[zaydemy] handler for "${event}" failed`, error);
}
