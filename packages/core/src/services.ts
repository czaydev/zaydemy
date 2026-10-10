/** A text message. `to` is an E.164 phone number. */
export interface SmsMessage {
	to: string;
	text: string;
}

/** Sends text messages. Provided by an SMS plugin (e.g. sms-ekomesaj). */
export interface SmsSender {
	send(message: SmsMessage): Promise<void>;
}

/** Stores uploaded files. Provided by a storage plugin (e.g. storage-local, storage-bunny). */
export interface StorageDriver {
	put(key: string, body: Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<{ body: Uint8Array; contentType?: string } | null>;
	delete(key: string): Promise<void>;
}

/** Receives unexpected errors. Provided by a monitoring plugin (e.g. monitoring-sentry). */
export interface ErrorReporter {
	capture(error: unknown, context?: Record<string, unknown>): void;
}

/** Used when no SMS plugin is enabled: prints messages so local development still works. */
export const consoleSms: SmsSender = {
	async send(message) {
		console.info(`[zaydemy] sms to ${message.to}: ${message.text}`);
	},
};

export const consoleErrorReporter: ErrorReporter = {
	capture(error, context) {
		console.error("[zaydemy]", error, context ?? "");
	},
};

/** Used when no storage plugin is enabled; any use is a configuration error. */
export const missingStorage: StorageDriver = {
	async put() {
		throw new Error("No storage plugin is enabled.");
	},
	async get() {
		throw new Error("No storage plugin is enabled.");
	},
	async delete() {
		throw new Error("No storage plugin is enabled.");
	},
};
