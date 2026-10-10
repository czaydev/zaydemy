import type { z } from "zod";
import type { EventBus } from "./events";
import type { TransactionHooks } from "./hooks";
import type { Mailer } from "./mail";
import type { PipelineEngine } from "./pipeline";
import type { PluginApiRoute, PluginPage } from "./routes";
import type { ErrorReporter, SmsSender, StorageDriver } from "./services";

/**
 * Augmented by `@zaydemy/db` so plugins see the real database type:
 * `declare module "@zaydemy/core" { interface Register { db: Database } }`
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmentation point
export interface Register {}
export type RegisteredDatabase = Register extends { db: infer D } ? D : unknown;

export type Locale = "tr" | "en";
export type Messages = { [key: string]: string | Messages };

export interface StageContext<Options> {
	/** The pipeline transaction; rows written here commit or roll back with the stage change. */
	db: RegisteredDatabase;
	/** Queues an event, as `TransactionContext.emit` does. */
	emit(event: string, payload: Record<string, unknown>): void;
	applicationId: string;
	userId: string;
	courseId: string;
	/** This course's options for the stage, already validated. */
	options: Options;
}

/**
 * What happens when an application reaches a stage:
 * `wait` keeps it there until something calls `engine.complete()`,
 * `complete` passes it immediately, `skip` marks it as not applicable.
 */
export type StageEnterResult = "wait" | "complete" | "skip";

export interface StageDefinition<Options = unknown> {
	/** Unique id used in pipelines, e.g. `interview`. */
	id: string;
	/** i18n message key for the stage name. */
	label: string;
	options?: z.ZodType<Options>;
	/** Page where the applicant acts on this stage, e.g. `/documents`; used in notifications. */
	applicantHref?: string;
	onEnter?: (ctx: StageContext<Options>) => StageEnterResult | Promise<StageEnterResult>;
}

export interface NavItem {
	label: string;
	href: string;
	icon?: string;
	permission?: string;
}

/** Services a plugin can provide for the whole system; only one plugin may provide each. */
export interface ServiceSlots {
	mailer: Mailer;
	sms: SmsSender;
	storage: StorageDriver;
	errorReporter: ErrorReporter;
}
export type ServiceName = keyof ServiceSlots;

export interface PluginSetupContext extends ServiceSlots {
	/** Handlers that run after a change commits. */
	events: EventBus;
	/** Handlers that run inside the transaction of a change and can roll it back. */
	hooks: TransactionHooks;
	engine: PipelineEngine;
	db: RegisteredDatabase;
	/** Public URL of the app, for links in messages and payment callbacks. */
	baseUrl: string;
}

export interface PluginDefinition {
	id: string;
	name: string;
	version: string;
	/** `enterprise` plugins only load with a licence that grants their id. */
	edition?: "community" | "enterprise";
	dependsOn?: string[];
	// biome-ignore lint/suspicious/noExplicitAny: each stage has its own options type
	stages?: StageDefinition<any>[];
	/** Drizzle tables owned by the plugin. */
	schema?: Record<string, unknown>;
	permissions?: { key: string; name: string }[];
	adminNav?: NavItem[];
	messages?: Partial<Record<Locale, Messages>>;
	pages?: PluginPage[];
	/** HTTP handlers mounted under `/api`. */
	api?: PluginApiRoute[];
	/** A plugin that sends e-mail for the whole system. Only one may be enabled. */
	mailer?: Mailer;
	/** A plugin that sends text messages. Only one may be enabled. */
	sms?: SmsSender;
	/** A plugin that stores files. Only one may be enabled. */
	storage?: StorageDriver;
	/** A plugin that receives unexpected errors. Only one may be enabled. */
	errorReporter?: ErrorReporter;
	/**
	 * Values offered to another plugin's extension point, keyed by the point's
	 * name, e.g. `{ "payments.methods": [cardMethod] }`. The owning plugin reads
	 * them with `config.contributions(point)`.
	 */
	contributes?: Record<string, unknown[]>;
	/** Services that must be provided by some enabled plugin, e.g. `["storage"]`. */
	requires?: ServiceName[];
	setup?: (ctx: PluginSetupContext) => void;
}

export function defineStage<Options>(stage: StageDefinition<Options>): StageDefinition<Options> {
	return stage;
}

export function definePlugin<P extends PluginDefinition>(plugin: P): P {
	return plugin;
}
