import type { CoreEvents } from "./events";
import type { RegisteredDatabase } from "./plugin";

type Payload<E extends string> = E extends keyof CoreEvents
	? CoreEvents[E]
	: Record<string, unknown>;
type TxHandler<E extends string> = (
	payload: Payload<E>,
	db: RegisteredDatabase,
) => void | Promise<void>;

/**
 * Handlers that run inside the transaction that caused the event, with the
 * transaction's database handle. Unlike `EventBus` handlers, a failing hook
 * rolls the whole change back, so use them for writes that must stay
 * consistent with the pipeline (creating a stage's rows, refunding on reject).
 * Side effects that cannot be undone, such as e-mail, belong in `events`.
 */
export class TransactionHooks {
	private handlers = new Map<string, TxHandler<string>[]>();

	on<E extends string>(event: E, handler: TxHandler<E>): () => void {
		const list = this.handlers.get(event) ?? [];
		list.push(handler as TxHandler<string>);
		this.handlers.set(event, list);
		return () => {
			this.handlers.set(
				event,
				(this.handlers.get(event) ?? []).filter((h) => h !== handler),
			);
		};
	}

	/** Runs handlers one after another; the first failure is thrown. */
	async run(event: string, payload: Record<string, unknown>, db: RegisteredDatabase) {
		for (const handler of this.handlers.get(event) ?? []) {
			await handler(payload as Payload<string>, db);
		}
	}
}
