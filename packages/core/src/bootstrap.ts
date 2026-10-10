import type { ResolvedConfig } from "./config";
import { PipelineEngine, type PipelineStore } from "./pipeline";
import type { RegisteredDatabase } from "./plugin";

export interface Zaydemy {
	config: ResolvedConfig;
	engine: PipelineEngine;
	db: RegisteredDatabase;
	baseUrl: string;
}

let current: Zaydemy | undefined;

/** The runtime created by `bootstrap`, for plugin pages and server actions. */
export function runtime(): Zaydemy {
	if (!current) throw new Error("Zaydemy has not been bootstrapped yet.");
	return current;
}

/** Wires the runtime: creates the engine and runs every plugin's setup once. */
export function bootstrap(
	config: ResolvedConfig,
	deps: { db: RegisteredDatabase; store: PipelineStore; baseUrl: string },
): Zaydemy {
	const engine = new PipelineEngine(config, deps.store);
	const { events, hooks, mailer, sms, storage, errorReporter } = config;
	for (const plugin of config.plugins) {
		plugin.setup?.({
			events,
			hooks,
			engine,
			db: deps.db,
			baseUrl: deps.baseUrl,
			mailer,
			sms,
			storage,
			errorReporter,
		});
	}
	current = { config, engine, db: deps.db, baseUrl: deps.baseUrl };
	return current;
}
