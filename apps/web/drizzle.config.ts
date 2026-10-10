import { defineConfig } from "drizzle-kit";

try {
	process.loadEnvFile(".env");
} catch {
	// No .env file: rely on the environment.
}

// Core tables plus the schema file of every enabled plugin that has one.
// Keep in sync with zaydemy.config.ts, then run `pnpm db:generate`.
const pluginSchemas = [
	"../../plugins/stage-interview/src/schema.ts",
	"../../plugins/payments/src/schema.ts",
	"../../plugins/payment-bank-transfer/src/schema.ts",
	"../../plugins/stage-documents/src/schema.ts",
	"../../plugins/redirects/src/schema.ts",
];

export default defineConfig({
	dialect: "postgresql",
	schema: ["../../packages/db/src/schema/index.ts", ...pluginSchemas],
	out: "./drizzle",
	dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
