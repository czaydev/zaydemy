import "server-only";
import { createAuth } from "@zaydemy/auth";
import { bootstrap, resolveConfig, type Zaydemy } from "@zaydemy/core";
import { createDatabase } from "@zaydemy/db";
import { DrizzlePipelineStore } from "@zaydemy/db/pipeline-store";
import config from "../../zaydemy.config";

export const resolvedConfig = resolveConfig(config);

let instance: (Zaydemy & { auth: ReturnType<typeof createAuth> }) | undefined;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set.`);
	return value;
}

/** Lazily created runtime, shared across requests. */
export function getZaydemy() {
	if (!instance) {
		const db = createDatabase(requireEnv("DATABASE_URL"), resolvedConfig.schema);
		const baseUrl = requireEnv("BETTER_AUTH_URL");
		const app = bootstrap(resolvedConfig, { db, store: new DrizzlePipelineStore(db), baseUrl });
		const auth = createAuth({
			db,
			config: resolvedConfig,
			baseURL: baseUrl,
			secret: requireEnv("BETTER_AUTH_SECRET"),
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			},
		});
		instance = { ...app, auth };
	}
	return instance;
}
