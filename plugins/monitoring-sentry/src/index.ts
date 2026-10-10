import * as Sentry from "@sentry/node";
import { definePlugin, type ErrorReporter } from "@zaydemy/core";

export interface SentryOptions {
	dsn: string;
	environment?: string;
	/** Share of requests traced for performance monitoring. Default: 0 (errors only). */
	tracesSampleRate?: number;
}

export function sentryReporter({
	dsn,
	environment,
	tracesSampleRate = 0,
}: SentryOptions): ErrorReporter {
	let started = false;
	return {
		capture(error, context) {
			if (!started) {
				Sentry.init({ dsn, environment, tracesSampleRate });
				started = true;
			}
			Sentry.captureException(error, context ? { extra: context } : undefined);
		},
	};
}

/** Reports server errors (failed plugin handlers, API routes, notifications) to Sentry. */
export function sentryMonitoring(options: SentryOptions) {
	return definePlugin({
		id: "monitoring-sentry",
		name: "Sentry error reporting",
		version: "0.1.0",
		errorReporter: sentryReporter(options),
	});
}
