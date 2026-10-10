import { EventBus } from "./events";
import { TransactionHooks } from "./hooks";
import {
	createLicenseVerifier,
	type License,
	type LicenseVerifier,
	WHITE_LABEL_FEATURE,
	ZAYDEMY_LICENSE_PUBLIC_KEY,
} from "./license";
import { consoleMailer } from "./mail";
import type {
	Locale,
	Messages,
	NavItem,
	PluginDefinition,
	ServiceName,
	ServiceSlots,
	StageDefinition,
} from "./plugin";
import { type PluginApiRoute, type PluginPage, splitPath } from "./routes";
import { consoleErrorReporter, consoleSms, missingStorage } from "./services";

export interface BrandConfig {
	name: string;
	/** Used in file names and identifiers. */
	slug: string;
	logo?: { full: string; icon: string };
	/** Colours of the interface. `primary` takes any CSS colour, e.g. "#4f46e5". */
	theme?: {
		primary?: string;
		/** Text on primary-coloured buttons; defaults to white. */
		primaryForeground?: string;
	};
	supportEmail?: string;
	/** "Powered by czay.dev" attribution. Turning it off needs a white-label licence. */
	poweredBy?: boolean;
}

export interface ZaydemyConfig {
	brand: BrandConfig;
	locales: { default: Locale; supported: Locale[] };
	plugins: PluginDefinition[];
	/** Named pipelines: ordered stage ids. `default` is used by courses without one. */
	pipelines: { default: string[]; [name: string]: string[] };
	license?: string;
}

export interface ResolvedConfig extends Omit<ZaydemyConfig, "license">, ServiceSlots {
	brand: BrandConfig & { poweredBy: boolean };
	stages: Map<string, StageDefinition<unknown>>;
	schema: Record<string, unknown>;
	adminNav: NavItem[];
	appNav: NavItem[];
	permissions: { key: string; name: string }[];
	pages: PluginPage[];
	api: PluginApiRoute[];
	/** Plugin translations merged per locale. */
	messages: Partial<Record<Locale, Messages>>;
	/** Everything enabled plugins contribute to an extension point, in plugin order. */
	contributions<T>(point: string): T[];
	/** Services nobody provides; plugins that `require` them are refused. */
	missingServices: ServiceName[];
	events: EventBus;
	hooks: TransactionHooks;
	/** Verified licence, or null when none is set or it does not validate. */
	license: License | null;
}

const SERVICE_NAMES: ServiceName[] = ["mailer", "sms", "storage", "errorReporter"];
const SERVICE_LABELS: Record<ServiceName, string> = {
	mailer: "mail",
	sms: "SMS",
	storage: "storage",
	errorReporter: "error reporting",
};

export class ConfigError extends Error {
	override name = "ConfigError";
}

export function defineConfig(config: ZaydemyConfig): ZaydemyConfig {
	return config;
}

/** Validates the config and builds registries. Throws ConfigError on any problem. */
export function resolveConfig(
	config: ZaydemyConfig,
	verifyLicense: LicenseVerifier = createLicenseVerifier(ZAYDEMY_LICENSE_PUBLIC_KEY),
): ResolvedConfig {
	const license = config.license ? verifyLicense(config.license) : null;
	const features = new Set(license?.features ?? []);

	const pluginIds = new Set<string>();
	for (const plugin of config.plugins) {
		if (pluginIds.has(plugin.id)) throw new ConfigError(`Plugin "${plugin.id}" is listed twice.`);
		pluginIds.add(plugin.id);
		if (plugin.edition === "enterprise" && !features.has(plugin.id)) {
			throw new ConfigError(
				`Plugin "${plugin.id}" is an enterprise plugin and needs a licence that includes it.`,
			);
		}
	}
	for (const plugin of config.plugins) {
		for (const dep of plugin.dependsOn ?? []) {
			if (!pluginIds.has(dep)) {
				throw new ConfigError(`Plugin "${plugin.id}" needs plugin "${dep}", which is not enabled.`);
			}
		}
	}

	const stages = new Map<string, StageDefinition<unknown>>();
	for (const plugin of config.plugins) {
		for (const stage of plugin.stages ?? []) {
			if (stages.has(stage.id)) {
				throw new ConfigError(`Stage "${stage.id}" is defined by more than one plugin.`);
			}
			stages.set(stage.id, stage);
		}
	}
	for (const [name, pipeline] of Object.entries(config.pipelines)) {
		const seen = new Set<string>();
		for (const stageId of pipeline) {
			if (!stages.has(stageId)) {
				throw new ConfigError(
					`Pipeline "${name}" uses stage "${stageId}", but no enabled plugin provides it.`,
				);
			}
			if (seen.has(stageId))
				throw new ConfigError(`Pipeline "${name}" repeats stage "${stageId}".`);
			seen.add(stageId);
		}
	}

	const services = {} as Partial<Record<ServiceName, PluginDefinition>>;
	for (const name of SERVICE_NAMES) {
		const providers = config.plugins.filter((p) => p[name]);
		if (providers.length > 1) {
			throw new ConfigError(
				`Only one ${SERVICE_LABELS[name]} plugin can be enabled (found: ${providers.map((p) => p.id).join(", ")}).`,
			);
		}
		services[name] = providers[0];
	}
	for (const plugin of config.plugins) {
		for (const name of plugin.requires ?? []) {
			if (!services[name]) {
				throw new ConfigError(
					`Plugin "${plugin.id}" needs a ${SERVICE_LABELS[name]} plugin, but none is enabled.`,
				);
			}
		}
	}

	const pages = config.plugins.flatMap((p) => p.pages ?? []);
	const seenPages = new Set<string>();
	for (const page of pages) {
		const key = `${page.area}:${page.path.replace(/\[\w+\]/g, "[]")}`;
		if (seenPages.has(key))
			throw new ConfigError(`Two plugins register the page "${page.area}${page.path}".`);
		seenPages.add(key);
	}

	const api = config.plugins.flatMap((p) => p.api ?? []);
	const seenRoutes = new Set<string>();
	for (const route of api) {
		const key = `${route.method} ${splitPath(route.path.replace(/\[\w+\]/g, "[]")).join("/")}`;
		if (seenRoutes.has(key))
			throw new ConfigError(`Two plugins register the API route "${route.method} ${route.path}".`);
		seenRoutes.add(key);
	}

	const messages: Partial<Record<Locale, Messages>> = {};
	for (const plugin of config.plugins) {
		for (const [locale, dict] of Object.entries(plugin.messages ?? {}) as [Locale, Messages][]) {
			messages[locale] = { ...messages[locale], ...dict };
		}
	}

	const poweredBy = config.brand.poweredBy ?? true;
	if (!poweredBy && !features.has(WHITE_LABEL_FEATURE)) {
		throw new ConfigError(
			`Removing the "Powered by czay.dev" attribution needs a white-label licence.`,
		);
	}

	return {
		...config,
		brand: { ...config.brand, poweredBy },
		stages,
		schema: Object.assign({}, ...config.plugins.map((p) => p.schema ?? {})),
		adminNav: config.plugins.flatMap((p) => p.adminNav ?? []),
		appNav: config.plugins.flatMap((p) => p.appNav ?? []),
		permissions: config.plugins.flatMap((p) => p.permissions ?? []),
		pages,
		api,
		messages,
		mailer: services.mailer?.mailer ?? consoleMailer,
		sms: services.sms?.sms ?? consoleSms,
		storage: services.storage?.storage ?? missingStorage,
		errorReporter: services.errorReporter?.errorReporter ?? consoleErrorReporter,
		contributions: <T>(point: string) =>
			config.plugins.flatMap((p) => (p.contributes?.[point] ?? []) as T[]),
		missingServices: SERVICE_NAMES.filter((name) => !services[name]),
		events: new EventBus((event, error) =>
			(services.errorReporter?.errorReporter ?? consoleErrorReporter).capture(error, { event }),
		),
		hooks: new TransactionHooks(),
		license,
	};
}
